-- Core blocker follow-up: require the complete current taxonomy chain for
-- Supplier eligibility and prevent stale Match rows from authorizing access.

BEGIN;

-- A selected Service is valid only while every explicit Supplier selection and
-- every governed parent row still describes the same active chain.
CREATE OR REPLACE FUNCTION public._supplier_has_valid_service_selection(
  _supplier_id uuid,
  _service_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_services service_selection
    JOIN public.services service_row
      ON service_row.id = service_selection.service_id
     AND service_row.is_active
     AND service_row.subcategory_id =
       service_selection.subcategory_id
    JOIN public.supplier_subcategories profession_selection
      ON profession_selection.supplier_id =
        service_selection.supplier_id
     AND profession_selection.subcategory_id =
       service_selection.subcategory_id
    JOIN public.subcategories profession_row
      ON profession_row.id =
        profession_selection.subcategory_id
     AND profession_row.is_active
    JOIN public.supplier_categories category_selection
      ON category_selection.supplier_id =
        profession_selection.supplier_id
     AND category_selection.category_id =
       profession_row.category_id
    JOIN public.categories category_row
      ON category_row.id = category_selection.category_id
     AND category_row.is_active
    WHERE service_selection.supplier_id = _supplier_id
      AND (
        _service_id IS NULL
        OR service_selection.service_id = _service_id
      )
  );
$$;

ALTER FUNCTION public._supplier_has_valid_service_selection(uuid, uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public._supplier_has_valid_service_selection(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public._supplier_has_valid_service_selection(uuid, uuid)
  TO service_role;

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
      FROM public.supplier_subcategories profession_selection
      JOIN public.subcategories profession_row
        ON profession_row.id =
          profession_selection.subcategory_id
       AND profession_row.is_active
      JOIN public.supplier_categories category_selection
        ON category_selection.supplier_id =
          profession_selection.supplier_id
       AND category_selection.category_id =
          profession_row.category_id
      JOIN public.categories category_row
        ON category_row.id = category_selection.category_id
       AND category_row.is_active
      WHERE profession_selection.supplier_id = _supplier_id
        AND profession_selection.is_primary
    )
    AND public._supplier_has_valid_service_selection(
      _supplier_id,
      NULL
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
               AND service_row.subcategory_id =
                 service_selection.subcategory_id
               AND service_row.is_active
               AND service_row.supports_remote
              WHERE service_selection.supplier_id = _supplier_id
                AND public._supplier_has_valid_service_selection(
                  _supplier_id,
                  service_selection.service_id
                )
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

-- Exact-Service matching validates both the Request's current governed chain
-- and the Supplier's explicit current selection of that same chain.
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
    JOIN public.categories request_category
      ON request_category.id = request_row.category_id
     AND request_category.is_active
    WHERE request_row.id = _request_id
      AND request_row.status = 'open'
      AND request_row.published_at IS NOT NULL
      AND request_row.matching_policy = 'current'
      AND public._is_supplier_eligible_for_new_matches(_supplier_id)
      AND (
        request_row.subcategory_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.subcategories request_profession
          WHERE request_profession.id = request_row.subcategory_id
            AND request_profession.category_id =
              request_category.id
            AND request_profession.is_active
        )
      )
      AND (
        request_row.service_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.services request_service
          WHERE request_service.id = request_row.service_id
            AND request_service.subcategory_id =
              request_row.subcategory_id
            AND request_service.is_active
        )
      )
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
             AND service_row.subcategory_id =
               service_selection.subcategory_id
            JOIN public.supplier_subcategories profession_selection
              ON profession_selection.supplier_id =
                service_selection.supplier_id
             AND profession_selection.subcategory_id =
               service_selection.subcategory_id
            JOIN public.subcategories profession_row
              ON profession_row.id =
                profession_selection.subcategory_id
             AND profession_row.is_active
            JOIN public.supplier_categories category_selection
              ON category_selection.supplier_id =
                profession_selection.supplier_id
             AND category_selection.category_id =
               profession_row.category_id
            JOIN public.categories category_row
              ON category_row.id = category_selection.category_id
             AND category_row.is_active
            WHERE service_selection.supplier_id = _supplier_id
              AND service_selection.service_id =
                request_row.service_id
              AND service_selection.subcategory_id =
                request_row.subcategory_id
              AND profession_row.category_id =
                request_row.category_id
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
            JOIN public.supplier_categories category_selection
              ON category_selection.supplier_id =
                profession_selection.supplier_id
             AND category_selection.category_id =
               profession_row.category_id
            JOIN public.categories category_row
              ON category_row.id = category_selection.category_id
             AND category_row.is_active
            WHERE profession_selection.supplier_id = _supplier_id
              AND profession_selection.subcategory_id =
                request_row.subcategory_id
              AND profession_row.category_id =
                request_row.category_id
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
              AND service_row.subcategory_id =
                request_row.subcategory_id
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

-- Authorization checks the live eligibility predicate for current Requests.
-- Legacy-frozen Requests retain only their explicitly persisted active Matches.
CREATE OR REPLACE FUNCTION public._match_authorizes_supplier(
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
    FROM public.matches match_row
    JOIN public.requests request_row
      ON request_row.id = match_row.request_id
    WHERE match_row.supplier_id = _supplier_id
      AND match_row.request_id = _request_id
      AND match_row.status = 'active'
      AND request_row.status = 'open'
      AND request_row.published_at IS NOT NULL
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
        request_row.matching_policy = 'legacy_frozen'
        OR (
          request_row.matching_policy = 'current'
          AND public._supplier_matches_request_taxonomy(
            _supplier_id,
            _request_id
          )
        )
      )
  );
$$;

ALTER FUNCTION public._match_authorizes_supplier(uuid, uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public._match_authorizes_supplier(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._match_authorizes_supplier(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.has_active_match(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'supplier')
    AND public._match_authorizes_supplier(
      auth.uid(),
      _request_id
    );
$$;

ALTER FUNCTION public.has_active_match(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_active_match(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_match(uuid)
  TO authenticated, service_role;

-- Reconcile one Request without scanning unrelated Requests. Current Matches
-- are deactivated before explicit valid selections may be regenerated.
CREATE OR REPLACE FUNCTION public._reconcile_matches_for_request(
  _request_id uuid
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
  WHERE request_row.id = _request_id
    AND match_row.request_id = request_row.id
    AND match_row.status = 'active'
    AND (
      request_row.status <> 'open'
      OR request_row.published_at IS NULL
      OR (
        request_row.matching_policy = 'current'
        AND NOT public._supplier_matches_request_taxonomy(
          match_row.supplier_id,
          request_row.id
        )
      )
    );
  GET DIAGNOSTICS _deactivated = ROW_COUNT;

  PERFORM public._generate_matches_for_request(_request_id);
  RETURN _deactivated;
END;
$$;

ALTER FUNCTION public._reconcile_matches_for_request(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public._reconcile_matches_for_request(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._reconcile_matches_for_request(uuid)
  TO service_role;

-- The existing Supplier reconciliation triggers now consume the hardened
-- predicates above. Catalog triggers identify only Suppliers and Requests that
-- reference the changed governed row.
CREATE OR REPLACE FUNCTION public.trg_categories_matching_au()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    FOR _row IN
      SELECT category_selection.supplier_id
      FROM public.supplier_categories category_selection
      WHERE category_selection.category_id = NEW.id
    LOOP
      PERFORM public._reconcile_matches_for_supplier(
        _row.supplier_id
      );
    END LOOP;

    FOR _row IN
      SELECT request_row.id
      FROM public.requests request_row
      WHERE request_row.category_id = NEW.id
        AND request_row.matching_policy = 'current'
        AND request_row.status = 'open'
        AND request_row.published_at IS NOT NULL
    LOOP
      PERFORM public._reconcile_matches_for_request(_row.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_categories_matching_au() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_categories_matching_au()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS categories_matching_au ON public.categories;
CREATE TRIGGER categories_matching_au
  AFTER UPDATE OF is_active ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.trg_categories_matching_au();

CREATE OR REPLACE FUNCTION public.trg_subcategories_matching_au()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    FOR _row IN
      SELECT profession_selection.supplier_id
      FROM public.supplier_subcategories profession_selection
      WHERE profession_selection.subcategory_id = NEW.id
    LOOP
      PERFORM public._reconcile_matches_for_supplier(
        _row.supplier_id
      );
    END LOOP;

    FOR _row IN
      SELECT request_row.id
      FROM public.requests request_row
      WHERE request_row.subcategory_id = NEW.id
        AND request_row.matching_policy = 'current'
        AND request_row.status = 'open'
        AND request_row.published_at IS NOT NULL
    LOOP
      PERFORM public._reconcile_matches_for_request(_row.id);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.trg_subcategories_matching_au() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.trg_subcategories_matching_au()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS subcategories_matching_au ON public.subcategories;
CREATE TRIGGER subcategories_matching_au
  AFTER UPDATE OF is_active, category_id ON public.subcategories
  FOR EACH ROW EXECUTE FUNCTION public.trg_subcategories_matching_au();

-- Primary-Profession changes affect completeness even though the selected
-- Profession row itself remains present.
DROP TRIGGER IF EXISTS supplier_subcategories_matches_au
  ON public.supplier_subcategories;
CREATE TRIGGER supplier_subcategories_matches_au
  AFTER UPDATE OF is_primary ON public.supplier_subcategories
  FOR EACH ROW
  WHEN (OLD.is_primary IS DISTINCT FROM NEW.is_primary)
  EXECUTE FUNCTION public.trg_supplier_subcategories_ai();

CREATE OR REPLACE FUNCTION public.trg_services_matching_au()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active
    OR NEW.supports_remote IS DISTINCT FROM OLD.supports_remote
    OR NEW.subcategory_id IS DISTINCT FROM OLD.subcategory_id THEN
    FOR _row IN
      SELECT service_selection.supplier_id
      FROM public.supplier_services service_selection
      WHERE service_selection.service_id = NEW.id
    LOOP
      PERFORM public._reconcile_matches_for_supplier(
        _row.supplier_id
      );
    END LOOP;

    FOR _row IN
      SELECT request_row.id
      FROM public.requests request_row
      WHERE request_row.service_id = NEW.id
        AND request_row.matching_policy = 'current'
        AND request_row.status = 'open'
        AND request_row.published_at IS NOT NULL
    LOOP
      PERFORM public._reconcile_matches_for_request(_row.id);
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
  _row record;
BEGIN
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    FOR _row IN
      SELECT area_selection.supplier_id
      FROM public.supplier_service_areas area_selection
      WHERE area_selection.service_area_id = NEW.id
    LOOP
      PERFORM public._reconcile_matches_for_supplier(
        _row.supplier_id
      );
    END LOOP;

    FOR _row IN
      SELECT request_row.id
      FROM public.requests request_row
      WHERE request_row.service_area_id = NEW.id
        AND request_row.matching_policy = 'current'
        AND request_row.status = 'open'
        AND request_row.published_at IS NOT NULL
    LOOP
      PERFORM public._reconcile_matches_for_request(_row.id);
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

-- A stale row is denied even if a trigger was disabled or failed previously.
DROP POLICY IF EXISTS "Suppliers view attachments on matched requests"
  ON public.request_attachments;
CREATE POLICY "Suppliers view attachments on matched requests"
  ON public.request_attachments
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'supplier')
    AND public.has_active_match(request_id)
  );

DROP POLICY IF EXISTS "Suppliers read matched request files"
  ON storage.objects;
CREATE POLICY "Suppliers read matched request files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND public.has_role(auth.uid(), 'supplier')
    AND EXISTS (
      SELECT 1
      FROM public.matches match_row
      WHERE match_row.request_id::text =
        (storage.foldername(name))[2]
        AND match_row.supplier_id = auth.uid()
        AND public.has_active_match(match_row.request_id)
    )
  );

CREATE OR REPLACE FUNCTION public.can_submit_offer(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'supplier')
    AND public.has_active_match(_request_id);
$$;

ALTER FUNCTION public.can_submit_offer(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_submit_offer(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_submit_offer(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_offer(
  _request_id uuid,
  _price integer,
  _estimated_days integer,
  _message text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.requests%ROWTYPE;
  _offer_id uuid;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'supplier') THEN
    RAISE EXCEPTION 'Supplier authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO _request
  FROM public.requests request_row
  WHERE request_row.id = _request_id
  FOR UPDATE;

  IF _request.id IS NULL
    OR NOT public._match_authorizes_supplier(
      auth.uid(),
      _request.id
    ) THEN
    RAISE EXCEPTION 'No active Match for this Request'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.offers (
    request_id,
    supplier_id,
    price,
    estimated_days,
    message
  )
  VALUES (
    _request.id,
    auth.uid(),
    _price,
    _estimated_days,
    btrim(_message)
  )
  RETURNING id INTO _offer_id;

  RETURN _offer_id;
END;
$$;

ALTER FUNCTION public.submit_offer(uuid, integer, integer, text)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public.submit_offer(uuid, integer, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.submit_offer(uuid, integer, integer, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_active_supplier_requests(
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
    AND public._match_authorizes_supplier(
      auth.uid(),
      request_row.id
    )
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

-- Reconcile stale current Matches already present at migration time. Valid rows
-- and every legacy-frozen Match remain untouched.
UPDATE public.matches match_row
SET status = 'inactive',
    updated_at = now()
FROM public.requests request_row
WHERE request_row.id = match_row.request_id
  AND request_row.matching_policy = 'current'
  AND match_row.status = 'active'
  AND NOT public._supplier_matches_request_taxonomy(
    match_row.supplier_id,
    match_row.request_id
  );

-- The original index remains the canonical uniqueness guarantee. The Core
-- hardening migration added an equivalent index with a second name.
DO $$
BEGIN
  IF to_regclass(
    'public.offers_one_selected_per_request'
  ) IS NULL THEN
    RAISE EXCEPTION
      'Canonical selected-Offer uniqueness index is missing';
  END IF;
END;
$$;

DROP INDEX IF EXISTS public.offers_one_selected_per_request_idx;

COMMIT;
