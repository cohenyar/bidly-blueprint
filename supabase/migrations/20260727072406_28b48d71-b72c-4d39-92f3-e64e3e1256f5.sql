CREATE OR REPLACE FUNCTION public._supplier_matches_request_taxonomy(_supplier_id uuid, _request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.requests request_row
    WHERE request_row.id = _request_id AND request_row.status = 'open' AND request_row.published_at IS NOT NULL
      AND (
        (request_row.service_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.supplier_services service_selection WHERE service_selection.supplier_id = _supplier_id AND service_selection.service_id = request_row.service_id))
        OR (request_row.service_id IS NULL AND request_row.subcategory_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.supplier_subcategories profession_selection WHERE profession_selection.supplier_id = _supplier_id AND profession_selection.subcategory_id = request_row.subcategory_id))
        OR (request_row.service_id IS NULL AND request_row.subcategory_id IS NULL AND NOT EXISTS (SELECT 1 FROM public.subcategories governed_profession WHERE governed_profession.category_id = request_row.category_id AND governed_profession.is_active) AND EXISTS (SELECT 1 FROM public.supplier_categories category_selection WHERE category_selection.supplier_id = _supplier_id AND category_selection.category_id = request_row.category_id))
      )
  );
$$;
ALTER FUNCTION public._supplier_matches_request_taxonomy(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._supplier_matches_request_taxonomy(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._supplier_matches_request_taxonomy(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public._generate_matches_for_request(_request_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _request public.requests%ROWTYPE; _created integer := 0; _row record;
BEGIN
  SELECT * INTO _request FROM public.requests request_row WHERE request_row.id = _request_id FOR UPDATE;
  IF _request.id IS NULL OR _request.status <> 'open' OR _request.published_at IS NULL THEN RETURN 0; END IF;
  FOR _row IN
    WITH candidates AS (
      SELECT service_selection.supplier_id FROM public.supplier_services service_selection
        WHERE _request.service_id IS NOT NULL AND service_selection.service_id = _request.service_id
      UNION
      SELECT profession_selection.supplier_id FROM public.supplier_subcategories profession_selection
        WHERE _request.service_id IS NULL AND _request.subcategory_id IS NOT NULL AND profession_selection.subcategory_id = _request.subcategory_id
      UNION
      SELECT category_selection.supplier_id FROM public.supplier_categories category_selection
        WHERE _request.service_id IS NULL AND _request.subcategory_id IS NULL
          AND category_selection.category_id = _request.category_id
          AND NOT EXISTS (SELECT 1 FROM public.subcategories governed_profession WHERE governed_profession.category_id = _request.category_id AND governed_profession.is_active)
    ),
    inserted AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT candidate.supplier_id, _request.id, 'active' FROM candidates candidate
      WHERE public._is_supplier_profile_complete(candidate.supplier_id)
      ON CONFLICT (supplier_id, request_id) DO UPDATE SET status = 'active', updated_at = now()
      WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    ) SELECT * FROM inserted
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

CREATE OR REPLACE FUNCTION public._generate_matches_for_supplier(_supplier_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _created integer := 0; _row record;
BEGIN
  IF NOT public._is_supplier_profile_complete(_supplier_id) THEN RETURN 0; END IF;
  FOR _row IN
    WITH inserted AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT _supplier_id, request_row.id, 'active' FROM public.requests request_row
      WHERE request_row.status = 'open' AND request_row.published_at IS NOT NULL
        AND public._supplier_matches_request_taxonomy(_supplier_id, request_row.id)
      ON CONFLICT (supplier_id, request_id) DO UPDATE SET status = 'active', updated_at = now()
      WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    ) SELECT * FROM inserted
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

CREATE OR REPLACE FUNCTION public._generate_matches_for_supplier_subcategory(_supplier_id uuid, _subcategory_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _created integer := 0; _row record;
BEGIN
  IF NOT public._is_supplier_profile_complete(_supplier_id) THEN RETURN 0; END IF;
  FOR _row IN
    WITH inserted AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT _supplier_id, request_row.id, 'active' FROM public.requests request_row
      WHERE request_row.status = 'open' AND request_row.published_at IS NOT NULL
        AND request_row.service_id IS NULL AND request_row.subcategory_id = _subcategory_id
      ON CONFLICT (supplier_id, request_id) DO UPDATE SET status = 'active', updated_at = now()
      WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    ) SELECT * FROM inserted
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

CREATE OR REPLACE FUNCTION public.trg_requests_matches()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'open' AND NEW.published_at IS NOT NULL THEN PERFORM public._generate_matches_for_request(NEW.id); END IF;
    RETURN NEW;
  END IF;
  IF OLD.published_at IS NULL AND NEW.published_at IS NOT NULL AND NEW.status = 'open' THEN
    PERFORM public._generate_matches_for_request(NEW.id);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'open' AND NEW.published_at IS NOT NULL THEN PERFORM public._generate_matches_for_request(NEW.id);
    ELSIF NEW.status <> 'open' THEN PERFORM public._deactivate_matches_for_request(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
ALTER FUNCTION public.trg_requests_matches() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_requests_matches() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS requests_matches_ai ON public.requests;
CREATE TRIGGER requests_matches_ai AFTER INSERT ON public.requests FOR EACH ROW EXECUTE FUNCTION public.trg_requests_matches();
DROP TRIGGER IF EXISTS requests_matches_au ON public.requests;
CREATE TRIGGER requests_matches_au AFTER UPDATE OF status, published_at ON public.requests FOR EACH ROW EXECUTE FUNCTION public.trg_requests_matches();

CREATE OR REPLACE FUNCTION public.trg_supplier_services_ai()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._generate_matches_for_supplier(NEW.supplier_id); RETURN NEW; END; $$;
ALTER FUNCTION public.trg_supplier_services_ai() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_services_ai() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER supplier_services_matches_ai AFTER INSERT ON public.supplier_services FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_services_ai();

CREATE OR REPLACE FUNCTION public.trg_supplier_services_ad()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.matches match_row SET status = 'inactive', updated_at = now()
  FROM public.requests request_row
  WHERE match_row.request_id = request_row.id AND match_row.supplier_id = OLD.supplier_id
    AND match_row.status = 'active' AND request_row.service_id = OLD.service_id;
  IF NOT public._is_supplier_profile_complete(OLD.supplier_id) THEN PERFORM public._deactivate_matches_for_supplier(OLD.supplier_id); END IF;
  RETURN OLD;
END;
$$;
ALTER FUNCTION public.trg_supplier_services_ad() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_services_ad() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER supplier_services_matches_ad AFTER DELETE ON public.supplier_services FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_services_ad();

CREATE OR REPLACE FUNCTION public.trg_supplier_service_areas_ad()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public._is_supplier_profile_complete(OLD.supplier_id) THEN PERFORM public._deactivate_matches_for_supplier(OLD.supplier_id); END IF;
  RETURN OLD;
END; $$;
ALTER FUNCTION public.trg_supplier_service_areas_ad() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_service_areas_ad() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER supplier_service_areas_matches_ad AFTER DELETE ON public.supplier_service_areas FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_service_areas_ad();

CREATE OR REPLACE FUNCTION public.trg_supplier_categories_ai()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public._generate_matches_for_supplier(NEW.supplier_id); RETURN NEW; END; $$;
ALTER FUNCTION public.trg_supplier_categories_ai() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_categories_ai() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER supplier_categories_matches_ai AFTER INSERT ON public.supplier_categories FOR EACH ROW EXECUTE FUNCTION public.trg_supplier_categories_ai();

DROP FUNCTION IF EXISTS public.get_active_supplier_requests(uuid);
CREATE FUNCTION public.get_active_supplier_requests(_request_id uuid DEFAULT NULL)
RETURNS TABLE (id uuid, title text, description text, city text, budget_type public.budget_type, budget_min integer, budget_max integer, status public.request_status, published_at timestamptz, created_at timestamptz, category_id uuid, category_name_he text, subcategory_id uuid, subcategory_name_he text, service_id uuid, service_name_he text, missing_service_text text, questionnaire_answers jsonb, match_created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT request_row.id, request_row.title, request_row.description, request_row.city, request_row.budget_type, request_row.budget_min, request_row.budget_max, request_row.status, request_row.published_at, request_row.created_at,
    category_row.id, category_row.name_he, profession_row.id, profession_row.name_he, service_row.id, service_row.name_he, request_row.missing_service_text,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('question_id', question_row.id, 'prompt_he', question_row.prompt_he, 'field_type', question_row.field_type, 'answer', answer_row.answer) ORDER BY question_row.sort_order, question_row.id)
      FROM public.request_question_answers answer_row JOIN public.request_questions question_row ON question_row.id = answer_row.question_id WHERE answer_row.request_id = request_row.id), '[]'::jsonb),
    match_row.created_at
  FROM public.matches match_row
  JOIN public.requests request_row ON request_row.id = match_row.request_id
  JOIN public.categories category_row ON category_row.id = request_row.category_id
  LEFT JOIN public.subcategories profession_row ON profession_row.id = request_row.subcategory_id
  LEFT JOIN public.services service_row ON service_row.id = request_row.service_id
  WHERE auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'supplier') AND match_row.supplier_id = auth.uid() AND match_row.status = 'active' AND request_row.status = 'open' AND request_row.published_at IS NOT NULL AND (_request_id IS NULL OR request_row.id = _request_id)
  ORDER BY match_row.created_at DESC;
$$;
ALTER FUNCTION public.get_active_supplier_requests(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_active_supplier_requests(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_supplier_requests(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_submit_offer(_request_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'supplier')
    AND EXISTS (SELECT 1 FROM public.matches match_row JOIN public.requests request_row ON request_row.id = match_row.request_id
      WHERE match_row.supplier_id = auth.uid() AND match_row.request_id = _request_id AND match_row.status = 'active' AND request_row.status = 'open' AND request_row.published_at IS NOT NULL);
$$;
ALTER FUNCTION public.can_submit_offer(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_submit_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_submit_offer(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_create_match(_supplier_id uuid, _request_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _match_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admin may create Matches' USING ERRCODE = '42501'; END IF;
  IF NOT public.has_role(_supplier_id, 'supplier') THEN RAISE EXCEPTION 'Target user is not a Supplier' USING ERRCODE = '22000'; END IF;
  IF NOT public._is_supplier_profile_complete(_supplier_id) THEN RAISE EXCEPTION 'Supplier profile is incomplete' USING ERRCODE = '22000'; END IF;
  IF NOT public._supplier_matches_request_taxonomy(_supplier_id, _request_id) THEN RAISE EXCEPTION 'Supplier is not eligible for this Request' USING ERRCODE = '22000'; END IF;
  INSERT INTO public.matches (supplier_id, request_id, status) VALUES (_supplier_id, _request_id, 'active')
  ON CONFLICT (supplier_id, request_id) DO UPDATE SET status = 'active', updated_at = now()
  RETURNING id INTO _match_id;
  RETURN _match_id;
END;
$$;
ALTER FUNCTION public.admin_create_match(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_create_match(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_match(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_reconcile_matches()
RETURNS TABLE (created integer, deactivated integer, reactivated integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _request record; _count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admin may reconcile Matches' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.matches ORDER BY id FOR UPDATE;
  UPDATE public.matches match_row SET status = 'inactive', updated_at = now()
  WHERE match_row.status = 'active' AND (NOT public._is_supplier_profile_complete(match_row.supplier_id) OR NOT public._supplier_matches_request_taxonomy(match_row.supplier_id, match_row.request_id));
  GET DIAGNOSTICS deactivated = ROW_COUNT;
  created := 0; reactivated := 0;
  FOR _request IN SELECT request_row.id FROM public.requests request_row WHERE request_row.status = 'open' AND request_row.published_at IS NOT NULL LOOP
    _count := public._generate_matches_for_request(_request.id);
    created := created + _count;
  END LOOP;
  RETURN NEXT;
END;
$$;
ALTER FUNCTION public.admin_reconcile_matches() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_reconcile_matches() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reconcile_matches() TO authenticated, service_role;