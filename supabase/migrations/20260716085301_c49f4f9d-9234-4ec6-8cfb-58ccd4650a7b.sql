
-- 1. Extend notification_type
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'match_created';

COMMIT;
BEGIN;

-- 2. Internal helper: is a specific (supplier, subcategory) pair currently valid?
CREATE OR REPLACE FUNCTION public._supplier_serves_subcategory(_supplier_id uuid, _subcategory_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_subcategories ss
    JOIN public.subcategories s ON s.id = ss.subcategory_id
    JOIN public.supplier_categories sc
      ON sc.supplier_id = ss.supplier_id AND sc.category_id = s.category_id
    WHERE ss.supplier_id = _supplier_id
      AND ss.subcategory_id = _subcategory_id
  );
$$;
ALTER FUNCTION public._supplier_serves_subcategory(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._supplier_serves_subcategory(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._supplier_serves_subcategory(uuid, uuid) TO service_role;

-- 3. Notification helper: insert a match_created notification if none exists yet
CREATE OR REPLACE FUNCTION public._notify_match_created(_supplier_id uuid, _request_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _title text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE user_id = _supplier_id
      AND type = 'match_created'
      AND request_id = _request_id
  ) THEN
    RETURN;
  END IF;

  SELECT title INTO _title FROM public.requests WHERE id = _request_id;
  IF _title IS NULL THEN RETURN; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, request_id)
  VALUES (_supplier_id, 'match_created', 'התאמה חדשה',
          'בקשה חדשה תואמת לתחום שלכם: "' || _title || '".', _request_id);
END;
$$;
ALTER FUNCTION public._notify_match_created(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._notify_match_created(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._notify_match_created(uuid, uuid) TO service_role;

-- 4. Core generator for a single request (must be open + have subcategory)
CREATE OR REPLACE FUNCTION public._generate_matches_for_request(_request_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _req RECORD;
  _created integer := 0;
  _row RECORD;
BEGIN
  SELECT id, status, subcategory_id
    INTO _req
    FROM public.requests
   WHERE id = _request_id
   FOR UPDATE;

  IF _req.id IS NULL OR _req.status <> 'open' OR _req.subcategory_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR _row IN
    WITH ins AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT ss.supplier_id, _req.id, 'active'
        FROM public.supplier_subcategories ss
       WHERE ss.subcategory_id = _req.subcategory_id
         AND public._is_supplier_profile_complete(ss.supplier_id)
      ON CONFLICT (supplier_id, request_id) DO UPDATE
         SET status = 'active', updated_at = now()
         WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    )
    SELECT * FROM ins
  LOOP
    _created := _created + 1;
    PERFORM public._notify_match_created(_row.supplier_id, _row.request_id);
  END LOOP;

  RETURN _created;
END;
$$;
ALTER FUNCTION public._generate_matches_for_request(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._generate_matches_for_request(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._generate_matches_for_request(uuid) TO service_role;

-- 5. Generator for a supplier — scans all open requests on subcategories they serve
CREATE OR REPLACE FUNCTION public._generate_matches_for_supplier(_supplier_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _created integer := 0;
  _row RECORD;
BEGIN
  IF NOT public._is_supplier_profile_complete(_supplier_id) THEN
    RETURN 0;
  END IF;

  FOR _row IN
    WITH ins AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT _supplier_id, r.id, 'active'
        FROM public.requests r
        JOIN public.supplier_subcategories ss
          ON ss.supplier_id = _supplier_id
         AND ss.subcategory_id = r.subcategory_id
       WHERE r.status = 'open'
         AND r.subcategory_id IS NOT NULL
      ON CONFLICT (supplier_id, request_id) DO UPDATE
         SET status = 'active', updated_at = now()
         WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    )
    SELECT * FROM ins
  LOOP
    _created := _created + 1;
    PERFORM public._notify_match_created(_row.supplier_id, _row.request_id);
  END LOOP;

  RETURN _created;
END;
$$;
ALTER FUNCTION public._generate_matches_for_supplier(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._generate_matches_for_supplier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._generate_matches_for_supplier(uuid) TO service_role;

-- 6. Generator for a single (supplier, subcategory) pair
CREATE OR REPLACE FUNCTION public._generate_matches_for_supplier_subcategory(_supplier_id uuid, _subcategory_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _created integer := 0;
  _row RECORD;
BEGIN
  IF NOT public._is_supplier_profile_complete(_supplier_id) THEN
    RETURN 0;
  END IF;
  IF NOT public._supplier_serves_subcategory(_supplier_id, _subcategory_id) THEN
    RETURN 0;
  END IF;

  FOR _row IN
    WITH ins AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT _supplier_id, r.id, 'active'
        FROM public.requests r
       WHERE r.status = 'open'
         AND r.subcategory_id = _subcategory_id
      ON CONFLICT (supplier_id, request_id) DO UPDATE
         SET status = 'active', updated_at = now()
         WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    )
    SELECT * FROM ins
  LOOP
    _created := _created + 1;
    PERFORM public._notify_match_created(_row.supplier_id, _row.request_id);
  END LOOP;

  RETURN _created;
END;
$$;
ALTER FUNCTION public._generate_matches_for_supplier_subcategory(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._generate_matches_for_supplier_subcategory(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._generate_matches_for_supplier_subcategory(uuid, uuid) TO service_role;

-- 7. Deactivators
CREATE OR REPLACE FUNCTION public._deactivate_matches_for_request(_request_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  WITH upd AS (
    UPDATE public.matches
       SET status = 'inactive', updated_at = now()
     WHERE request_id = _request_id AND status = 'active'
     RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;
ALTER FUNCTION public._deactivate_matches_for_request(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._deactivate_matches_for_request(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._deactivate_matches_for_request(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public._deactivate_matches_for_supplier(_supplier_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  WITH upd AS (
    UPDATE public.matches
       SET status = 'inactive', updated_at = now()
     WHERE supplier_id = _supplier_id AND status = 'active'
     RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;
ALTER FUNCTION public._deactivate_matches_for_supplier(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._deactivate_matches_for_supplier(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._deactivate_matches_for_supplier(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public._deactivate_matches_for_supplier_subcategory(_supplier_id uuid, _subcategory_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  WITH upd AS (
    UPDATE public.matches m
       SET status = 'inactive', updated_at = now()
      FROM public.requests r
     WHERE m.request_id = r.id
       AND m.supplier_id = _supplier_id
       AND m.status = 'active'
       AND r.subcategory_id = _subcategory_id
     RETURNING 1
  )
  SELECT count(*) INTO _n FROM upd;
  RETURN _n;
END;
$$;
ALTER FUNCTION public._deactivate_matches_for_supplier_subcategory(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._deactivate_matches_for_supplier_subcategory(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._deactivate_matches_for_supplier_subcategory(uuid, uuid) TO service_role;

-- 8. Trigger functions

-- Request lifecycle → match generation / deactivation
CREATE OR REPLACE FUNCTION public.trg_requests_matches()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'open' AND NEW.subcategory_id IS NOT NULL THEN
      PERFORM public._generate_matches_for_request(NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF NEW.status = 'open' AND OLD.status <> 'open' AND NEW.subcategory_id IS NOT NULL THEN
    PERFORM public._generate_matches_for_request(NEW.id);
  ELSIF OLD.status = 'open' AND NEW.status <> 'open' THEN
    PERFORM public._deactivate_matches_for_request(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;
ALTER FUNCTION public.trg_requests_matches() OWNER TO postgres;

DROP TRIGGER IF EXISTS requests_matches_ai ON public.requests;
CREATE TRIGGER requests_matches_ai
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_requests_matches();

DROP TRIGGER IF EXISTS requests_matches_au ON public.requests;
CREATE TRIGGER requests_matches_au
AFTER UPDATE OF status ON public.requests
FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_requests_matches();

-- Supplier profile → completeness transition
CREATE OR REPLACE FUNCTION public.trg_supplier_profiles_matches()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _now_complete boolean;
BEGIN
  _now_complete := public._is_supplier_profile_complete(NEW.user_id);
  IF _now_complete THEN
    PERFORM public._generate_matches_for_supplier(NEW.user_id);
  ELSE
    PERFORM public._deactivate_matches_for_supplier(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.trg_supplier_profiles_matches() OWNER TO postgres;

DROP TRIGGER IF EXISTS supplier_profiles_matches_aiu ON public.supplier_profiles;
CREATE TRIGGER supplier_profiles_matches_aiu
AFTER INSERT OR UPDATE ON public.supplier_profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_profiles_matches();

-- Supplier subcategory add
CREATE OR REPLACE FUNCTION public.trg_supplier_subcategories_ai()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._generate_matches_for_supplier_subcategory(NEW.supplier_id, NEW.subcategory_id);
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.trg_supplier_subcategories_ai() OWNER TO postgres;

DROP TRIGGER IF EXISTS supplier_subcategories_matches_ai ON public.supplier_subcategories;
CREATE TRIGGER supplier_subcategories_matches_ai
AFTER INSERT ON public.supplier_subcategories
FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_subcategories_ai();

-- Supplier subcategory remove
CREATE OR REPLACE FUNCTION public.trg_supplier_subcategories_ad()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public._deactivate_matches_for_supplier_subcategory(OLD.supplier_id, OLD.subcategory_id);
  -- If removing this subcategory makes the profile incomplete, drop all remaining
  IF NOT public._is_supplier_profile_complete(OLD.supplier_id) THEN
    PERFORM public._deactivate_matches_for_supplier(OLD.supplier_id);
  END IF;
  RETURN OLD;
END;
$$;
ALTER FUNCTION public.trg_supplier_subcategories_ad() OWNER TO postgres;

DROP TRIGGER IF EXISTS supplier_subcategories_matches_ad ON public.supplier_subcategories;
CREATE TRIGGER supplier_subcategories_matches_ad
AFTER DELETE ON public.supplier_subcategories
FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_subcategories_ad();

-- Supplier category remove → may invalidate profile completeness
CREATE OR REPLACE FUNCTION public.trg_supplier_categories_ad()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public._is_supplier_profile_complete(OLD.supplier_id) THEN
    PERFORM public._deactivate_matches_for_supplier(OLD.supplier_id);
  END IF;
  RETURN OLD;
END;
$$;
ALTER FUNCTION public.trg_supplier_categories_ad() OWNER TO postgres;

DROP TRIGGER IF EXISTS supplier_categories_matches_ad ON public.supplier_categories;
CREATE TRIGGER supplier_categories_matches_ad
AFTER DELETE ON public.supplier_categories
FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_categories_ad();

-- 9. Admin-only replay/reconcile
CREATE OR REPLACE FUNCTION public.admin_reconcile_matches()
RETURNS TABLE(created integer, deactivated integer, reactivated integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _created integer := 0;
  _deact   integer := 0;
  _react   integer := 0;
  _row RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin may reconcile matches' USING ERRCODE = '42501';
  END IF;

  -- Lock target rows to serialize concurrent replays
  PERFORM 1 FROM public.matches ORDER BY id FOR UPDATE;

  -- Deactivate matches that are no longer valid
  WITH bad AS (
    UPDATE public.matches m
       SET status = 'inactive', updated_at = now()
      FROM public.requests r
     WHERE m.request_id = r.id
       AND m.status = 'active'
       AND (
            r.status <> 'open'
         OR r.subcategory_id IS NULL
         OR NOT public._is_supplier_profile_complete(m.supplier_id)
         OR NOT EXISTS (
              SELECT 1 FROM public.supplier_subcategories ss
               WHERE ss.supplier_id = m.supplier_id
                 AND ss.subcategory_id = r.subcategory_id
            )
       )
     RETURNING 1
  )
  SELECT count(*) INTO _deact FROM bad;

  -- Create missing / reactivate eligible pairs
  FOR _row IN
    WITH candidates AS (
      SELECT ss.supplier_id, r.id AS request_id
        FROM public.requests r
        JOIN public.supplier_subcategories ss ON ss.subcategory_id = r.subcategory_id
       WHERE r.status = 'open'
         AND r.subcategory_id IS NOT NULL
         AND public._is_supplier_profile_complete(ss.supplier_id)
    ),
    upsert AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT supplier_id, request_id, 'active' FROM candidates
      ON CONFLICT (supplier_id, request_id) DO UPDATE
         SET status = 'active', updated_at = now()
         WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id, (xmax = 0) AS inserted
    )
    SELECT * FROM upsert
  LOOP
    IF _row.inserted THEN
      _created := _created + 1;
    ELSE
      _react := _react + 1;
    END IF;
    PERFORM public._notify_match_created(_row.supplier_id, _row.request_id);
  END LOOP;

  RETURN QUERY SELECT _created, _deact, _react;
END;
$$;
ALTER FUNCTION public.admin_reconcile_matches() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_reconcile_matches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reconcile_matches() TO authenticated, service_role;

COMMIT;
BEGIN;
