
-- 1. Internal helper: profile completeness for an arbitrary id (admin/trigger use only)
CREATE OR REPLACE FUNCTION public._is_supplier_profile_complete(_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
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

REVOKE ALL ON FUNCTION public._is_supplier_profile_complete(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._is_supplier_profile_complete(uuid) TO service_role;

-- 2. Drop old public functions that accepted arbitrary ids
DROP FUNCTION IF EXISTS public.is_supplier_profile_complete(uuid);
DROP FUNCTION IF EXISTS public.has_active_match(uuid, uuid);

-- 3. Recreate as caller-scoped (no supplier id parameter)
CREATE OR REPLACE FUNCTION public.is_supplier_profile_complete()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public._is_supplier_profile_complete(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_supplier_profile_complete() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_supplier_profile_complete() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_active_match(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matches
    WHERE supplier_id = auth.uid()
      AND request_id  = _request_id
      AND status      = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.has_active_match(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_match(uuid) TO authenticated, service_role;

-- 4. Update admin_create_match to use internal helper; tighten grants
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

  IF NOT public._is_supplier_profile_complete(_supplier_id) THEN
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

REVOKE ALL ON FUNCTION public.admin_create_match(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_match(uuid, uuid) TO authenticated, service_role;
