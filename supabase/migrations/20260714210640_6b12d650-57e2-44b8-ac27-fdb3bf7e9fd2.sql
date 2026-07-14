
-- =========================================================================
-- Gate 2: Server-side completion source of truth + Persistent Match Model
-- =========================================================================

-- ── 1) Trusted server-side Supplier Profile completion check ────────────
CREATE OR REPLACE FUNCTION public.is_supplier_profile_complete(_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_profiles p
    WHERE p.user_id = _supplier_id
      AND char_length(btrim(p.business_name)) BETWEEN 2 AND 80
      AND char_length(btrim(COALESCE(p.description, '')))  >= 1
      AND char_length(COALESCE(p.description, ''))         <= 1000
      AND char_length(btrim(COALESCE(p.service_area, ''))) >= 2
      AND char_length(COALESCE(p.service_area, ''))        <= 200
  )
  AND EXISTS (
    SELECT 1 FROM public.supplier_categories sc WHERE sc.supplier_id = _supplier_id
  )
  AND EXISTS (
    SELECT 1
    FROM public.supplier_subcategories ss
    JOIN public.subcategories s ON s.id = ss.subcategory_id
    JOIN public.supplier_categories sc
      ON sc.supplier_id = ss.supplier_id AND sc.category_id = s.category_id
    WHERE ss.supplier_id = _supplier_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_supplier_profile_complete(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_supplier_profile_complete(uuid) TO authenticated, service_role;

-- ── 2) Match status enum ────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.match_status AS ENUM ('active','inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3) matches table ────────────────────────────────────────────────────
CREATE TABLE public.matches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id   uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  status       public.match_status NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (supplier_id, request_id)
);

-- 4) GRANTs — SELECT only for authenticated (suppliers read own matches).
--    No user-facing INSERT/UPDATE/DELETE grants; mutation via SECURITY DEFINER RPC.
GRANT SELECT ON public.matches TO authenticated;
GRANT ALL    ON public.matches TO service_role;

-- 5) RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier reads own matches"
  ON public.matches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id AND public.has_role(auth.uid(), 'supplier'));

-- Partial index for active-match lookups
CREATE INDEX matches_active_supplier_request_idx
  ON public.matches (supplier_id, request_id)
  WHERE status = 'active';

CREATE INDEX matches_active_request_idx
  ON public.matches (request_id)
  WHERE status = 'active';

-- updated_at trigger (reuses existing function)
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 6) has_active_match helper ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_active_match(_supplier_id uuid, _request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE supplier_id = _supplier_id
      AND request_id  = _request_id
      AND status      = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_match(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_match(uuid, uuid) TO authenticated, service_role;

-- ── 7) admin_create_match seed function ────────────────────────────────
-- Callable only by an admin. Enforces:
--   • request is open
--   • supplier profile is complete (server-side truth)
--   • supplier owns the request's category
CREATE OR REPLACE FUNCTION public.admin_create_match(_supplier_id uuid, _request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _match_id uuid;
  _req_status public.request_status;
  _req_category uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin may create matches' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(_supplier_id, 'supplier') THEN
    RAISE EXCEPTION 'Target user is not a supplier' USING ERRCODE = '22000';
  END IF;

  SELECT status, category_id INTO _req_status, _req_category
  FROM public.requests WHERE id = _request_id;

  IF _req_status IS NULL THEN
    RAISE EXCEPTION 'Unknown request' USING ERRCODE = '22000';
  END IF;
  IF _req_status <> 'open' THEN
    RAISE EXCEPTION 'Request is not open' USING ERRCODE = '22000';
  END IF;

  IF NOT public.is_supplier_profile_complete(_supplier_id) THEN
    RAISE EXCEPTION 'Supplier profile is incomplete' USING ERRCODE = '22000';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.supplier_categories
    WHERE supplier_id = _supplier_id AND category_id = _req_category
  ) THEN
    RAISE EXCEPTION 'Supplier does not serve this category' USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.matches (supplier_id, request_id, status)
  VALUES (_supplier_id, _request_id, 'active')
  ON CONFLICT (supplier_id, request_id)
    DO UPDATE SET status = 'active', updated_at = now()
  RETURNING id INTO _match_id;

  RETURN _match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_match(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_match(uuid, uuid) TO authenticated, service_role;
