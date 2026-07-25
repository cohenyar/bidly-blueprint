-- Core blocker remediation: coverage-aware matching, compatibility-preserving
-- legacy behavior, and an explicit atomic legacy-to-current Supplier transition.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.requests request_row
    WHERE request_row.matching_policy = 'current'
      AND request_row.published_at IS NOT NULL
      AND (
        request_row.delivery_mode IS NULL
        OR (
          request_row.delivery_mode = 'on_site'
          AND request_row.service_area_id IS NULL
        )
        OR (
          request_row.delivery_mode = 'remote'
          AND (
            request_row.service_area_id IS NOT NULL
            OR request_row.service_id IS NULL
            OR request_row.missing_service_text IS NOT NULL
          )
        )
      )
  ) THEN
    RAISE EXCEPTION
      'Preflight failed: current published Request has invalid coverage';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION
  public._is_current_supplier_onboarding_data_complete(
    _supplier_id uuid
  )
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.supplier_profiles profile_row
      WHERE profile_row.user_id = _supplier_id
        AND char_length(
          btrim(COALESCE(profile_row.business_name, ''))
        ) BETWEEN 2 AND 80
        AND char_length(
          btrim(COALESCE(profile_row.description, ''))
        ) BETWEEN 20 AND 1000
        AND char_length(
          btrim(COALESCE(profile_row.business_type, ''))
        ) BETWEEN 2 AND 80
        AND char_length(
          btrim(COALESCE(profile_row.base_city, ''))
        ) BETWEEN 2 AND 80
        AND profile_row.service_mode IN (
          'on_site',
          'remote',
          'both'
        )
        AND profile_row.remote_available IS NOT NULL
        AND (
          profile_row.service_mode = 'remote'
          OR profile_row.max_travel_km BETWEEN 0 AND 500
        )
        AND (
          profile_row.service_mode = 'on_site'
          OR profile_row.remote_available
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_categories category_selection
      JOIN public.categories category_row
        ON category_row.id = category_selection.category_id
       AND category_row.is_active
      WHERE category_selection.supplier_id = _supplier_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_subcategories profession_selection
      JOIN public.subcategories profession_row
        ON profession_row.id = profession_selection.subcategory_id
       AND profession_row.is_active
      WHERE profession_selection.supplier_id = _supplier_id
        AND profession_selection.is_primary
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_services service_selection
      JOIN public.services service_row
        ON service_row.id = service_selection.service_id
       AND service_row.is_active
      WHERE service_selection.supplier_id = _supplier_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_profiles profile_row
      WHERE profile_row.user_id = _supplier_id
        AND (
          (
            profile_row.service_mode = 'remote'
            AND EXISTS (
              SELECT 1
              FROM public.supplier_services service_selection
              JOIN public.services service_row
                ON service_row.id = service_selection.service_id
               AND service_row.is_active
               AND service_row.supports_remote
              WHERE service_selection.supplier_id = _supplier_id
            )
          )
          OR (
            profile_row.service_mode IN ('on_site', 'both')
            AND EXISTS (
              SELECT 1
              FROM public.supplier_service_areas area_selection
              JOIN public.service_areas area_row
                ON area_row.id = area_selection.service_area_id
               AND area_row.is_active
              WHERE area_selection.supplier_id = _supplier_id
            )
          )
        )
    );
$$;

ALTER FUNCTION
  public._is_current_supplier_onboarding_data_complete(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public._is_current_supplier_onboarding_data_complete(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public._is_current_supplier_onboarding_data_complete(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION
  public._is_supplier_eligible_for_new_matches(_supplier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.supplier_onboarding_state state_row
      WHERE state_row.supplier_id = _supplier_id
        AND state_row.eligibility_policy = 'current'
        AND state_row.submitted_at IS NOT NULL
    )
    AND public._is_current_supplier_onboarding_data_complete(
      _supplier_id
    );
$$;

ALTER FUNCTION public._is_supplier_eligible_for_new_matches(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public._is_supplier_eligible_for_new_matches(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public._is_supplier_eligible_for_new_matches(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public._supplier_matches_request_taxonomy(
  _supplier_id uuid,
  _request_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.requests request_row
    JOIN public.supplier_profiles profile_row
      ON profile_row.user_id = _supplier_id
    WHERE request_row.id = _request_id
      AND request_row.status = 'open'
      AND request_row.published_at IS NOT NULL
      AND request_row.matching_policy = 'current'
      AND public._is_supplier_eligible_for_new_matches(_supplier_id)
      AND NOT EXISTS (
        SELECT 1
        FROM public.offers terminal_offer
        WHERE terminal_offer.request_id = request_row.id
          AND terminal_offer.supplier_id = _supplier_id
          AND terminal_offer.status IN (
            'withdrawn',
            'selected',
            'rejected'
          )
      )
      AND (
        (
          request_row.service_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.supplier_services service_selection
            JOIN public.services service_row
              ON service_row.id = service_selection.service_id
             AND service_row.is_active
            WHERE service_selection.supplier_id = _supplier_id
              AND service_selection.service_id =
                request_row.service_id
          )
        )
        OR (
          request_row.service_id IS NULL
          AND request_row.subcategory_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.supplier_subcategories profession_selection
            JOIN public.subcategories profession_row
              ON profession_row.id =
                profession_selection.subcategory_id
             AND profession_row.is_active
            WHERE profession_selection.supplier_id = _supplier_id
              AND profession_selection.subcategory_id =
                request_row.subcategory_id
          )
        )
        OR (
          request_row.service_id IS NULL
          AND request_row.subcategory_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM public.subcategories governed_profession
            WHERE governed_profession.category_id =
              request_row.category_id
              AND governed_profession.is_active
          )
          AND EXISTS (
            SELECT 1
            FROM public.supplier_categories category_selection
            JOIN public.categories category_row
              ON category_row.id = category_selection.category_id
             AND category_row.is_active
            WHERE category_selection.supplier_id = _supplier_id
              AND category_selection.category_id =
                request_row.category_id
          )
        )
      )
      AND (
        (
          request_row.delivery_mode = 'on_site'
          AND profile_row.service_mode IN ('on_site', 'both')
          AND request_row.service_area_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.supplier_service_areas area_selection
            JOIN public.service_areas area_row
              ON area_row.id = area_selection.service_area_id
             AND area_row.is_active
            WHERE area_selection.supplier_id = _supplier_id
              AND area_selection.service_area_id =
                request_row.service_area_id
          )
        )
        OR (
          request_row.delivery_mode = 'remote'
          AND profile_row.service_mode IN ('remote', 'both')
          AND profile_row.remote_available
          AND request_row.service_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.services service_row
            WHERE service_row.id = request_row.service_id
              AND service_row.is_active
              AND service_row.supports_remote
          )
        )
      )
  );
$$;

ALTER FUNCTION public._supplier_matches_request_taxonomy(uuid, uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public._supplier_matches_request_taxonomy(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public._supplier_matches_request_taxonomy(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public._generate_matches_for_request(
  _request_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.requests%ROWTYPE;
  _created integer := 0;
  _row record;
BEGIN
  SELECT *
  INTO _request
  FROM public.requests request_row
  WHERE request_row.id = _request_id
  FOR UPDATE;

  IF _request.id IS NULL
    OR _request.status <> 'open'
    OR _request.published_at IS NULL
    OR _request.matching_policy <> 'current' THEN
    RETURN 0;
  END IF;

  FOR _row IN
    WITH candidates AS (
      SELECT service_selection.supplier_id
      FROM public.supplier_services service_selection
      WHERE _request.service_id IS NOT NULL
        AND service_selection.service_id = _request.service_id

      UNION

      SELECT profession_selection.supplier_id
      FROM public.supplier_subcategories profession_selection
      WHERE _request.service_id IS NULL
        AND _request.subcategory_id IS NOT NULL
        AND profession_selection.subcategory_id =
          _request.subcategory_id

      UNION

      SELECT category_selection.supplier_id
      FROM public.supplier_categories category_selection
      WHERE _request.service_id IS NULL
        AND _request.subcategory_id IS NULL
        AND category_selection.category_id = _request.category_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.subcategories governed_profession
          WHERE governed_profession.category_id =
            _request.category_id
            AND governed_profession.is_active
        )
    ),
    inserted AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT candidate.supplier_id, _request.id, 'active'
      FROM candidates candidate
      WHERE public._supplier_matches_request_taxonomy(
        candidate.supplier_id,
        _request.id
      )
      ON CONFLICT (supplier_id, request_id)
      DO UPDATE SET
        status = 'active',
        updated_at = now()
      WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    )
    SELECT * FROM inserted
  LOOP
    _created := _created + 1;
    PERFORM public._notify_match_created(
      _row.supplier_id,
      _row.request_id
    );
  END LOOP;

  RETURN _created;
END;
$$;

ALTER FUNCTION public._generate_matches_for_request(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public._generate_matches_for_request(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._generate_matches_for_request(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public._generate_matches_for_supplier(
  _supplier_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _created integer := 0;
  _row record;
BEGIN
  IF NOT public._is_supplier_eligible_for_new_matches(
    _supplier_id
  ) THEN
    RETURN 0;
  END IF;

  FOR _row IN
    WITH inserted AS (
      INSERT INTO public.matches (supplier_id, request_id, status)
      SELECT _supplier_id, request_row.id, 'active'
      FROM public.requests request_row
      WHERE request_row.status = 'open'
        AND request_row.published_at IS NOT NULL
        AND request_row.matching_policy = 'current'
        AND public._supplier_matches_request_taxonomy(
          _supplier_id,
          request_row.id
        )
      ON CONFLICT (supplier_id, request_id)
      DO UPDATE SET
        status = 'active',
        updated_at = now()
      WHERE public.matches.status <> 'active'
      RETURNING supplier_id, request_id
    )
    SELECT * FROM inserted
  LOOP
    _created := _created + 1;
    PERFORM public._notify_match_created(
      _row.supplier_id,
      _row.request_id
    );
  END LOOP;

  RETURN _created;
END;
$$;

ALTER FUNCTION public._generate_matches_for_supplier(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public._generate_matches_for_supplier(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._generate_matches_for_supplier(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public._reconcile_matches_for_supplier(
  _supplier_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _deactivated integer := 0;
BEGIN
  UPDATE public.matches match_row
  SET status = 'inactive',
      updated_at = now()
  FROM public.requests request_row
  WHERE match_row.request_id = request_row.id
    AND match_row.supplier_id = _supplier_id
    AND match_row.status = 'active'
    AND (
      request_row.status <> 'open'
      OR request_row.published_at IS NULL
      OR (
        request_row.matching_policy = 'current'
        AND NOT public._supplier_matches_request_taxonomy(
          _supplier_id,
          request_row.id
        )
      )
    );
  GET DIAGNOSTICS _deactivated = ROW_COUNT;

  PERFORM public._generate_matches_for_supplier(_supplier_id);
  RETURN _deactivated;
END;
$$;

ALTER FUNCTION public._reconcile_matches_for_supplier(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public._reconcile_matches_for_supplier(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public._reconcile_matches_for_supplier(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION
  public._generate_matches_for_supplier_subcategory(
    _supplier_id uuid,
    _subcategory_id uuid
  )
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Reconciliation applies exact Service and governed coverage consistently;
  -- the subcategory argument remains for trigger/API compatibility.
  RETURN public._generate_matches_for_supplier(_supplier_id);
END;
$$;

ALTER FUNCTION
  public._generate_matches_for_supplier_subcategory(uuid, uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public._generate_matches_for_supplier_subcategory(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public._generate_matches_for_supplier_subcategory(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.trg_requests_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'open'
      AND NEW.published_at IS NOT NULL
      AND NEW.matching_policy = 'current' THEN
      PERFORM public._generate_matches_for_request(NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.published_at IS NULL
    AND NEW.published_at IS NOT NULL
    AND NEW.status = 'open'
    AND NEW.matching_policy = 'current' THEN
    PERFORM public._generate_matches_for_request(NEW.id);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'open'
      AND NEW.published_at IS NOT NULL
      AND NEW.matching_policy = 'current' THEN
      PERFORM public._generate_matches_for_request(NEW.id);
    ELSIF NEW.status <> 'open' THEN
      PERFORM public._deactivate_matches_for_request(NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_requests_matches() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_requests_matches()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS requests_matches_au ON public.requests;
CREATE TRIGGER requests_matches_au
  AFTER UPDATE OF status, published_at, matching_policy
  ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.trg_requests_matches();

CREATE OR REPLACE FUNCTION public.trg_supplier_profiles_matches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(NEW.user_id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_supplier_profiles_matches()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_profiles_matches()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_supplier_categories_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(NEW.supplier_id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_supplier_categories_ai() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_categories_ai()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_supplier_categories_ad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.supplier_subcategories profession_selection
  USING public.subcategories profession_row
  WHERE profession_selection.supplier_id = OLD.supplier_id
    AND profession_row.id = profession_selection.subcategory_id
    AND profession_row.category_id = OLD.category_id;

  PERFORM public._reconcile_matches_for_supplier(OLD.supplier_id);
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.trg_supplier_categories_ad() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_categories_ad()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_supplier_subcategories_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(NEW.supplier_id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_supplier_subcategories_ai()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_subcategories_ai()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_supplier_subcategories_ad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(OLD.supplier_id);
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.trg_supplier_subcategories_ad()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_subcategories_ad()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_supplier_services_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(NEW.supplier_id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_supplier_services_ai() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_services_ai()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_supplier_services_ad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(OLD.supplier_id);
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.trg_supplier_services_ad() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_services_ad()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_supplier_service_areas_ai()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(NEW.supplier_id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_supplier_service_areas_ai()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_service_areas_ai()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS supplier_service_areas_matches_ai
  ON public.supplier_service_areas;
CREATE TRIGGER supplier_service_areas_matches_ai
  AFTER INSERT ON public.supplier_service_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_supplier_service_areas_ai();

CREATE OR REPLACE FUNCTION public.trg_supplier_service_areas_ad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._reconcile_matches_for_supplier(OLD.supplier_id);
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.trg_supplier_service_areas_ad()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_supplier_service_areas_ad()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_services_matching_au()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier record;
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.supports_remote IS DISTINCT FROM OLD.supports_remote
    OR NEW.subcategory_id IS DISTINCT FROM OLD.subcategory_id THEN
    FOR _supplier IN
      SELECT DISTINCT service_selection.supplier_id
      FROM public.supplier_services service_selection
      WHERE service_selection.service_id = NEW.id
    LOOP
      PERFORM public._reconcile_matches_for_supplier(
        _supplier.supplier_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_services_matching_au() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_services_matching_au()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS services_matching_au ON public.services;
CREATE TRIGGER services_matching_au
  AFTER UPDATE OF is_active, supports_remote, subcategory_id
  ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.trg_services_matching_au();

CREATE OR REPLACE FUNCTION public.trg_service_areas_matching_au()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _supplier record;
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    FOR _supplier IN
      SELECT DISTINCT area_selection.supplier_id
      FROM public.supplier_service_areas area_selection
      WHERE area_selection.service_area_id = NEW.id
    LOOP
      PERFORM public._reconcile_matches_for_supplier(
        _supplier.supplier_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_service_areas_matching_au()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_service_areas_matching_au()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS service_areas_matching_au
  ON public.service_areas;
CREATE TRIGGER service_areas_matching_au
  AFTER UPDATE OF is_active ON public.service_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_service_areas_matching_au();

CREATE OR REPLACE FUNCTION public.submit_supplier_onboarding()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _state public.supplier_onboarding_state%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'supplier') THEN
    RAISE EXCEPTION 'Supplier authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO _state
  FROM public.supplier_onboarding_state state_row
  WHERE state_row.supplier_id = auth.uid()
  FOR UPDATE;

  IF _state.supplier_id IS NULL THEN
    RAISE EXCEPTION 'Supplier onboarding state not found'
      USING ERRCODE = '22000';
  END IF;

  IF _state.eligibility_policy = 'current'
    AND _state.submitted_at IS NOT NULL
    AND public._is_current_supplier_onboarding_data_complete(
      auth.uid()
    ) THEN
    RETURN true;
  END IF;

  IF NOT public._is_current_supplier_onboarding_data_complete(
    auth.uid()
  ) THEN
    RAISE EXCEPTION 'Supplier onboarding is incomplete'
      USING ERRCODE = '22000';
  END IF;

  UPDATE public.supplier_onboarding_state
  SET eligibility_policy = 'current',
      submitted_at = COALESCE(submitted_at, now()),
      current_stage = 6,
      notice_dismissed_at = COALESCE(
        notice_dismissed_at,
        now()
      ),
      updated_at = now()
  WHERE supplier_id = auth.uid();

  PERFORM public._generate_matches_for_supplier(auth.uid());
  RETURN true;
END;
$$;

ALTER FUNCTION public.submit_supplier_onboarding()
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_supplier_onboarding()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_supplier_onboarding()
  TO authenticated, service_role;

-- Supplier Request projection keeps authorization bound to an active Match and
-- adds only the governed delivery context needed to assess that Request.
DROP FUNCTION IF EXISTS public.get_active_supplier_requests(uuid);
CREATE FUNCTION public.get_active_supplier_requests(
  _request_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  city text,
  budget_type public.budget_type,
  budget_min integer,
  budget_max integer,
  status public.request_status,
  published_at timestamptz,
  created_at timestamptz,
  category_id uuid,
  category_name_he text,
  subcategory_id uuid,
  subcategory_name_he text,
  service_id uuid,
  service_name_he text,
  missing_service_text text,
  delivery_mode text,
  service_area_id uuid,
  service_area_name_he text,
  questionnaire_answers jsonb,
  match_created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    request_row.id,
    request_row.title,
    request_row.description,
    request_row.city,
    request_row.budget_type,
    request_row.budget_min,
    request_row.budget_max,
    request_row.status,
    request_row.published_at,
    request_row.created_at,
    category_row.id,
    category_row.name_he,
    profession_row.id,
    profession_row.name_he,
    service_row.id,
    service_row.name_he,
    request_row.missing_service_text,
    request_row.delivery_mode,
    area_row.id,
    area_row.name_he,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'question_id', question_row.id,
            'prompt_he', question_row.prompt_he,
            'field_type', question_row.field_type,
            'answer', answer_row.answer
          )
          ORDER BY question_row.sort_order, question_row.id
        )
        FROM public.request_question_answers answer_row
        JOIN public.request_questions question_row
          ON question_row.id = answer_row.question_id
        WHERE answer_row.request_id = request_row.id
      ),
      '[]'::jsonb
    ),
    match_row.created_at
  FROM public.matches match_row
  JOIN public.requests request_row
    ON request_row.id = match_row.request_id
  JOIN public.categories category_row
    ON category_row.id = request_row.category_id
  LEFT JOIN public.subcategories profession_row
    ON profession_row.id = request_row.subcategory_id
  LEFT JOIN public.services service_row
    ON service_row.id = request_row.service_id
  LEFT JOIN public.service_areas area_row
    ON area_row.id = request_row.service_area_id
  WHERE auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'supplier')
    AND match_row.supplier_id = auth.uid()
    AND match_row.status = 'active'
    AND request_row.status = 'open'
    AND request_row.published_at IS NOT NULL
    AND (
      _request_id IS NULL
      OR request_row.id = _request_id
    )
  ORDER BY match_row.created_at DESC;
$$;

ALTER FUNCTION public.get_active_supplier_requests(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_active_supplier_requests(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_supplier_requests(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_create_match(
  _supplier_id uuid,
  _request_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _match_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin may create Matches'
      USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(_supplier_id, 'supplier') THEN
    RAISE EXCEPTION 'Target user is not a Supplier'
      USING ERRCODE = '22000';
  END IF;
  IF NOT public._supplier_matches_request_taxonomy(
    _supplier_id,
    _request_id
  ) THEN
    RAISE EXCEPTION 'Supplier is not eligible for this Request'
      USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.matches (supplier_id, request_id, status)
  VALUES (_supplier_id, _request_id, 'active')
  ON CONFLICT (supplier_id, request_id)
  DO UPDATE SET
    status = 'active',
    updated_at = now()
  RETURNING id INTO _match_id;

  RETURN _match_id;
END;
$$;

ALTER FUNCTION public.admin_create_match(uuid, uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_create_match(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_match(uuid, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_reconcile_matches()
RETURNS TABLE (
  created integer,
  deactivated integer,
  reactivated integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request record;
  _count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin may reconcile Matches'
      USING ERRCODE = '42501';
  END IF;

  PERFORM 1 FROM public.matches ORDER BY id FOR UPDATE;

  UPDATE public.matches match_row
  SET status = 'inactive',
      updated_at = now()
  FROM public.requests request_row
  WHERE request_row.id = match_row.request_id
    AND match_row.status = 'active'
    AND (
      request_row.status <> 'open'
      OR request_row.published_at IS NULL
      OR (
        request_row.matching_policy = 'current'
        AND NOT public._supplier_matches_request_taxonomy(
          match_row.supplier_id,
          match_row.request_id
        )
      )
    );
  GET DIAGNOSTICS deactivated = ROW_COUNT;

  created := 0;
  reactivated := 0;
  FOR _request IN
    SELECT request_row.id
    FROM public.requests request_row
    WHERE request_row.status = 'open'
      AND request_row.published_at IS NOT NULL
      AND request_row.matching_policy = 'current'
  LOOP
    _count := public._generate_matches_for_request(_request.id);
    created := created + _count;
  END LOOP;

  RETURN NEXT;
END;
$$;

ALTER FUNCTION public.admin_reconcile_matches() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_reconcile_matches()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reconcile_matches()
  TO authenticated, service_role;

COMMIT;
