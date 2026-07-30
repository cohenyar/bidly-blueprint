-- Request descriptions remain available for useful context, but are optional
-- at publication. All other governed Request validation remains unchanged.

BEGIN;

ALTER TABLE public.requests
  DROP CONSTRAINT IF EXISTS requests_published_required_fields_check,
  ADD CONSTRAINT requests_published_required_fields_check
    CHECK (
      published_at IS NULL
      OR (
        category_id IS NOT NULL
        AND title IS NOT NULL
        AND city IS NOT NULL
      )
    ) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _profession_category uuid;
  _service_profession uuid;
  _service_supports_remote boolean;
  _strict_budget boolean;
BEGIN
  IF NEW.published_at IS NOT NULL THEN
    IF NEW.category_id IS NULL
      OR NEW.title IS NULL
      OR NEW.city IS NULL THEN
      RAISE EXCEPTION 'Published Request is missing required fields'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  IF NEW.title IS NOT NULL
    AND (
      (NEW.published_at IS NOT NULL
        AND char_length(btrim(NEW.title)) < 3)
      OR char_length(NEW.title) > 120
    ) THEN
    RAISE EXCEPTION 'Invalid title length' USING ERRCODE = '22000';
  END IF;
  IF NEW.description IS NOT NULL
    AND char_length(NEW.description) > 4000 THEN
    RAISE EXCEPTION 'Invalid description length'
      USING ERRCODE = '22000';
  END IF;
  IF NEW.city IS NOT NULL
    AND (
      (NEW.published_at IS NOT NULL
        AND char_length(btrim(NEW.city)) < 2)
      OR char_length(NEW.city) > 80
    ) THEN
    RAISE EXCEPTION 'Invalid city' USING ERRCODE = '22000';
  END IF;
  IF NEW.missing_service_text IS NOT NULL
    AND (
      (NEW.published_at IS NOT NULL
        AND char_length(btrim(NEW.missing_service_text)) < 3)
      OR char_length(NEW.missing_service_text) > 500
    ) THEN
    RAISE EXCEPTION 'Invalid missing service description'
      USING ERRCODE = '22000';
  END IF;

  _strict_budget := NEW.published_at IS NOT NULL;
  IF NEW.budget_type = 'fixed' THEN
    IF _strict_budget
      OR NEW.budget_min IS NOT NULL
      OR NEW.budget_max IS NOT NULL THEN
      IF NEW.budget_min IS NULL
        OR NEW.budget_max IS NULL
        OR NEW.budget_min <> NEW.budget_max
        OR NEW.budget_min <= 0 THEN
        RAISE EXCEPTION
          'Fixed budget requires an equal positive amount'
          USING ERRCODE = '22000';
      END IF;
    END IF;
  ELSIF NEW.budget_type = 'range' THEN
    IF _strict_budget
      OR (
        NEW.budget_min IS NOT NULL
        AND NEW.budget_max IS NOT NULL
      ) THEN
      IF NEW.budget_min IS NULL
        OR NEW.budget_max IS NULL
        OR NEW.budget_min <= 0
        OR NEW.budget_max <= 0
        OR NEW.budget_min > NEW.budget_max THEN
        RAISE EXCEPTION 'Invalid budget range'
          USING ERRCODE = '22000';
      END IF;
    END IF;
  ELSIF NEW.budget_min IS NOT NULL
    OR NEW.budget_max IS NOT NULL THEN
    RAISE EXCEPTION 'Open budget must have null min and max'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.category_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.categories category_row
      WHERE category_row.id = NEW.category_id
        AND (
          category_row.is_active
          OR NEW.schema_version = 1
        )
    ) THEN
    RAISE EXCEPTION 'Unknown or inactive category'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.subcategory_id IS NOT NULL THEN
    SELECT profession_row.category_id
    INTO _profession_category
    FROM public.subcategories profession_row
    WHERE profession_row.id = NEW.subcategory_id
      AND (
        profession_row.is_active
        OR NEW.schema_version = 1
      );

    IF _profession_category IS NULL
      OR _profession_category IS DISTINCT FROM NEW.category_id THEN
      RAISE EXCEPTION 'Profession does not belong to category'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  IF NEW.service_id IS NOT NULL THEN
    SELECT
      service_row.subcategory_id,
      service_row.supports_remote
    INTO
      _service_profession,
      _service_supports_remote
    FROM public.services service_row
    WHERE service_row.id = NEW.service_id
      AND service_row.is_active;

    IF _service_profession IS NULL
      OR _service_profession IS DISTINCT FROM NEW.subcategory_id THEN
      RAISE EXCEPTION 'Service does not belong to profession'
        USING ERRCODE = '22000';
    END IF;
    IF NEW.missing_service_text IS NOT NULL THEN
      RAISE EXCEPTION
        'Governed Service and missing-Service text are exclusive'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  IF NEW.service_area_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.service_areas area_row
      WHERE area_row.id = NEW.service_area_id
        AND area_row.is_active
    ) THEN
    RAISE EXCEPTION 'Unknown or inactive Service Area'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.delivery_mode = 'remote' THEN
    IF NEW.service_area_id IS NOT NULL THEN
      RAISE EXCEPTION 'Remote Request cannot select a Service Area'
        USING ERRCODE = '22000';
    END IF;
    IF NEW.missing_service_text IS NOT NULL THEN
      RAISE EXCEPTION
        'Missing-Service fallback is unavailable for remote Requests'
        USING ERRCODE = '22000';
    END IF;
    IF NEW.service_id IS NOT NULL
      AND NOT COALESCE(_service_supports_remote, false) THEN
      RAISE EXCEPTION 'Selected Service is not remote-compatible'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  IF NEW.published_at IS NOT NULL
    AND NEW.schema_version >= 2 THEN
    IF NEW.service_id IS NULL
      AND NEW.missing_service_text IS NULL THEN
      RAISE EXCEPTION 'Missing-Service description is required'
        USING ERRCODE = '22000';
    END IF;
    IF NEW.subcategory_id IS NULL
      AND EXISTS (
        SELECT 1
        FROM public.subcategories profession_row
        WHERE profession_row.category_id = NEW.category_id
          AND profession_row.is_active
      ) THEN
      RAISE EXCEPTION
        'Profession is required when governed options exist'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  IF NEW.published_at IS NOT NULL
    AND NEW.matching_policy = 'current' THEN
    IF NEW.delivery_mode = 'on_site' THEN
      IF NEW.service_area_id IS NULL THEN
        RAISE EXCEPTION 'On-site Request requires a Service Area'
          USING ERRCODE = '22000';
      END IF;
    ELSIF NEW.delivery_mode = 'remote' THEN
      IF NEW.service_id IS NULL
        OR NOT COALESCE(_service_supports_remote, false) THEN
        RAISE EXCEPTION
          'Remote Request requires a remote-compatible governed Service'
          USING ERRCODE = '22000';
      END IF;
    ELSE
      RAISE EXCEPTION 'Request delivery mode is required'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
