-- Transparent Smart Matching
--
-- This projection scores only Requests already authorized by an active Match.
-- It cannot create eligibility, reactivate a Match, or broaden Request access.
-- Scores are calculated at read time so no derived or duplicated Match data is
-- stored.

CREATE OR REPLACE FUNCTION public.get_smart_supplier_requests(
  _request_id uuid DEFAULT NULL,
  _minimum_score integer DEFAULT 50
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
  match_created_at timestamptz,
  match_score integer,
  match_level text,
  match_strength text,
  match_explanations jsonb,
  match_badges jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH authorized_requests AS (
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
      request_row.category_id,
      category_row.name_he AS category_name_he,
      category_row.is_active AS category_is_active,
      request_row.subcategory_id,
      profession_row.name_he AS subcategory_name_he,
      profession_row.is_active AS profession_is_active,
      profession_row.category_id AS profession_category_id,
      request_row.service_id,
      service_row.name_he AS service_name_he,
      service_row.is_active AS service_is_active,
      service_row.subcategory_id AS service_subcategory_id,
      service_row.supports_remote AS service_supports_remote,
      request_row.missing_service_text,
      request_row.delivery_mode,
      request_row.service_area_id,
      area_row.name_he AS service_area_name_he,
      area_row.is_active AS service_area_is_active,
      match_row.created_at AS match_created_at,
      profile_row.service_mode AS supplier_service_mode,
      profile_row.remote_available AS supplier_remote_available
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
    LEFT JOIN public.supplier_profiles profile_row
      ON profile_row.user_id = auth.uid()
    WHERE auth.uid() IS NOT NULL
      AND public.has_role(auth.uid(), 'supplier')
      AND match_row.supplier_id = auth.uid()
      AND match_row.status = 'active'
      AND request_row.status = 'open'
      AND request_row.published_at IS NOT NULL
      AND public._match_authorizes_supplier(auth.uid(), request_row.id)
      AND (
        _request_id IS NULL
        OR request_row.id = _request_id
      )
  ),
  match_signals AS (
    SELECT
      authorized_request.*,
      (
        authorized_request.category_is_active
        AND EXISTS (
          SELECT 1
          FROM public.supplier_categories category_selection
          WHERE category_selection.supplier_id = auth.uid()
            AND category_selection.category_id =
              authorized_request.category_id
        )
      ) AS category_match,
      (
        authorized_request.subcategory_id IS NOT NULL
        AND authorized_request.profession_is_active
        AND authorized_request.profession_category_id =
          authorized_request.category_id
        AND EXISTS (
          SELECT 1
          FROM public.supplier_subcategories profession_selection
          WHERE profession_selection.supplier_id = auth.uid()
            AND profession_selection.subcategory_id =
              authorized_request.subcategory_id
        )
      ) AS profession_match,
      (
        authorized_request.subcategory_id IS NOT NULL
        AND authorized_request.profession_is_active
        AND authorized_request.profession_category_id =
          authorized_request.category_id
        AND EXISTS (
          SELECT 1
          FROM public.supplier_subcategories profession_selection
          WHERE profession_selection.supplier_id = auth.uid()
            AND profession_selection.subcategory_id =
              authorized_request.subcategory_id
            AND profession_selection.is_primary
        )
      ) AS primary_profession_match,
      (
        authorized_request.service_id IS NOT NULL
        AND authorized_request.service_is_active
        AND authorized_request.service_subcategory_id =
          authorized_request.subcategory_id
        AND EXISTS (
          SELECT 1
          FROM public.supplier_services service_selection
          WHERE service_selection.supplier_id = auth.uid()
            AND service_selection.service_id =
              authorized_request.service_id
            AND service_selection.subcategory_id =
              authorized_request.subcategory_id
        )
      ) AS service_match,
      (
        (
          authorized_request.delivery_mode = 'on_site'
          AND authorized_request.supplier_service_mode IN (
            'on_site',
            'both'
          )
        )
        OR (
          authorized_request.delivery_mode = 'remote'
          AND authorized_request.supplier_service_mode IN (
            'remote',
            'both'
          )
          AND COALESCE(
            authorized_request.supplier_remote_available,
            false
          )
        )
      ) AS delivery_mode_match,
      (
        authorized_request.delivery_mode = 'remote'
        OR (
          authorized_request.delivery_mode = 'on_site'
          AND authorized_request.service_area_id IS NOT NULL
          AND authorized_request.service_area_is_active
          AND EXISTS (
            SELECT 1
            FROM public.supplier_service_areas area_selection
            WHERE area_selection.supplier_id = auth.uid()
              AND area_selection.service_area_id =
                authorized_request.service_area_id
          )
        )
      ) AS service_area_match,
      (
        authorized_request.delivery_mode IS DISTINCT FROM 'remote'
        OR (
          authorized_request.supplier_service_mode IN (
            'remote',
            'both'
          )
          AND COALESCE(
            authorized_request.supplier_remote_available,
            false
          )
          AND (
            authorized_request.service_id IS NULL
            OR COALESCE(
              authorized_request.service_supports_remote,
              false
            )
          )
        )
      ) AS remote_compatibility_match,
      public._is_supplier_profile_complete(
        auth.uid()
      ) AS profile_complete
    FROM authorized_requests authorized_request
  ),
  scored_requests AS (
    SELECT
      match_signal.*,
      CASE
        WHEN NOT match_signal.category_match THEN 0
        ELSE
          CASE WHEN match_signal.profession_match THEN 30 ELSE 0 END
          + CASE WHEN match_signal.service_match THEN 25 ELSE 0 END
          + CASE WHEN match_signal.delivery_mode_match THEN 15 ELSE 0 END
          + CASE WHEN match_signal.service_area_match THEN 15 ELSE 0 END
          + CASE
              WHEN match_signal.remote_compatibility_match THEN 10
              ELSE 0
            END
          + CASE WHEN match_signal.profile_complete THEN 5 ELSE 0 END
      END::integer AS calculated_match_score
    FROM match_signals match_signal
  )
  SELECT
    scored_request.id,
    scored_request.title,
    scored_request.description,
    scored_request.city,
    scored_request.budget_type,
    scored_request.budget_min,
    scored_request.budget_max,
    scored_request.status,
    scored_request.published_at,
    scored_request.created_at,
    scored_request.category_id,
    scored_request.category_name_he,
    scored_request.subcategory_id,
    scored_request.subcategory_name_he,
    scored_request.service_id,
    scored_request.service_name_he,
    scored_request.missing_service_text,
    scored_request.delivery_mode,
    scored_request.service_area_id,
    scored_request.service_area_name_he,
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
        WHERE answer_row.request_id = scored_request.id
      ),
      '[]'::jsonb
    ),
    scored_request.match_created_at,
    scored_request.calculated_match_score,
    CASE
      WHEN scored_request.calculated_match_score >= 90
        THEN 'התאמה מעולה'
      WHEN scored_request.calculated_match_score >= 75
        THEN 'התאמה גבוהה'
      ELSE 'התאמה בינונית'
    END,
    CASE
      WHEN scored_request.calculated_match_score >= 75
        THEN 'strong'
      ELSE 'weak'
    END,
    to_jsonb(
      array_remove(
        ARRAY[
          'תואם לקטגוריית ' || scored_request.category_name_he,
          CASE
            WHEN scored_request.profession_match
              THEN 'תואם למקצוע שנבחר'
          END,
          CASE
            WHEN scored_request.service_match
              THEN 'תואם לשירות ' || scored_request.service_name_he
          END,
          CASE
            WHEN scored_request.delivery_mode_match
              AND scored_request.delivery_mode = 'on_site'
              THEN 'אופן מתן השירות תואם לעבודה באתר'
            WHEN scored_request.delivery_mode_match
              AND scored_request.delivery_mode = 'remote'
              THEN 'אופן מתן השירות תואם לעבודה מרחוק'
          END,
          CASE
            WHEN scored_request.delivery_mode = 'on_site'
              AND scored_request.service_area_match
              THEN 'תואם לאזור השירות'
          END,
          CASE
            WHEN scored_request.delivery_mode = 'remote'
              AND scored_request.remote_compatibility_match
              THEN 'השירות תומך בעבודה מרחוק'
          END,
          CASE
            WHEN scored_request.profile_complete
              THEN 'פרופיל הספק מלא'
          END,
          CASE
            WHEN scored_request.calculated_match_score = 100
              THEN 'תואם לכל דרישות הבקשה'
          END
        ]::text[],
        NULL
      )
    ),
    to_jsonb(
      array_remove(
        ARRAY[
          CASE
            WHEN scored_request.calculated_match_score >= 90
              THEN '⭐ התאמה מעולה'
            WHEN scored_request.calculated_match_score >= 75
              THEN '⭐ התאמה גבוהה'
          END,
          CASE
            WHEN scored_request.delivery_mode = 'on_site'
              AND scored_request.service_area_match
              THEN '📍 באזור השירות שלך'
          END,
          CASE
            WHEN scored_request.delivery_mode = 'remote'
              AND scored_request.remote_compatibility_match
              THEN '💻 עבודה מרחוק'
          END,
          CASE
            WHEN scored_request.primary_profession_match
              THEN '🏅 מקצוע ראשי'
          END,
          CASE
            WHEN scored_request.service_match
              THEN '🔥 שירות מדויק'
          END
        ]::text[],
        NULL
      )
    )
  FROM scored_requests scored_request
  WHERE scored_request.category_match
    AND scored_request.delivery_mode_match
    AND (
      (
        scored_request.delivery_mode = 'on_site'
        AND scored_request.service_area_match
      )
      OR (
        scored_request.delivery_mode = 'remote'
        AND scored_request.remote_compatibility_match
      )
    )
    AND scored_request.calculated_match_score >= GREATEST(
      50,
      LEAST(COALESCE(_minimum_score, 50), 100)
    )
  ORDER BY
    scored_request.calculated_match_score DESC,
    scored_request.match_created_at DESC,
    scored_request.id;
$$;

ALTER FUNCTION public.get_smart_supplier_requests(uuid, integer)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public.get_smart_supplier_requests(uuid, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.get_smart_supplier_requests(uuid, integer)
  TO authenticated, service_role;
