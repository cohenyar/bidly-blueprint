-- Core blocker remediation: governed Request delivery mode, Service Area, and
-- remote-compatible Services. Existing published Requests are compatibility
-- rows and are deliberately not classified from descriptive city text.

BEGIN;

ALTER TABLE public.services
  ADD COLUMN supports_remote boolean NOT NULL DEFAULT false;

ALTER TABLE public.requests
  ADD COLUMN service_area_id uuid
    REFERENCES public.service_areas(id) ON DELETE RESTRICT,
  ADD COLUMN delivery_mode text,
  ADD COLUMN matching_policy text NOT NULL DEFAULT 'legacy_frozen';

-- Existing published Requests retain their persisted Matches and receive no
-- newly inferred eligibility. Existing drafts and future rows use current
-- governed matching.
ALTER TABLE public.requests
  ALTER COLUMN matching_policy SET DEFAULT 'current';

UPDATE public.requests
SET matching_policy = 'current',
    updated_at = now()
WHERE published_at IS NULL;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_delivery_mode_check
    CHECK (
      delivery_mode IS NULL
      OR delivery_mode IN ('on_site', 'remote')
    ) NOT VALID,
  ADD CONSTRAINT requests_matching_policy_check
    CHECK (matching_policy IN ('legacy_frozen', 'current')) NOT VALID,
  ADD CONSTRAINT requests_current_delivery_coverage_check
    CHECK (
      matching_policy = 'legacy_frozen'
      OR published_at IS NULL
      OR (
        delivery_mode = 'on_site'
        AND service_area_id IS NOT NULL
      )
      OR (
        delivery_mode = 'remote'
        AND service_area_id IS NULL
        AND service_id IS NOT NULL
        AND missing_service_text IS NULL
      )
    ) NOT VALID;

CREATE INDEX requests_current_service_area_match_idx
  ON public.requests (
    service_area_id,
    service_id,
    published_at DESC
  )
  WHERE
    matching_policy = 'current'
    AND delivery_mode = 'on_site'
    AND status = 'open'
    AND published_at IS NOT NULL;

CREATE INDEX requests_current_remote_match_idx
  ON public.requests (service_id, published_at DESC)
  WHERE
    matching_policy = 'current'
    AND delivery_mode = 'remote'
    AND status = 'open'
    AND published_at IS NOT NULL;

GRANT INSERT (delivery_mode, service_area_id)
  ON public.requests TO authenticated;
GRANT UPDATE (delivery_mode, service_area_id)
  ON public.requests TO authenticated;

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
      OR NEW.description IS NULL
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
    AND (
      (NEW.published_at IS NOT NULL
        AND char_length(btrim(NEW.description)) < 20)
      OR char_length(NEW.description) > 4000
    ) THEN
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

CREATE OR REPLACE FUNCTION public.guard_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id <> OLD.customer_id THEN
    RAISE EXCEPTION 'customer_id is immutable';
  END IF;
  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable';
  END IF;
  IF NEW.schema_version <> OLD.schema_version THEN
    RAISE EXCEPTION 'schema_version is immutable';
  END IF;
  IF NEW.matching_policy <> OLD.matching_policy
    AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'matching_policy is system-managed';
  END IF;
  IF NEW.offers_count <> OLD.offers_count
    AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'offers_count is system-managed';
  END IF;

  IF OLD.published_at IS NULL THEN
    IF OLD.status <> 'open'
      OR OLD.offers_count <> 0
      OR OLD.selected_offer_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid draft lifecycle state';
    END IF;
    IF NEW.published_at IS NOT NULL
      AND current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Use publish_request to publish a draft';
    END IF;
    IF NEW.status <> 'open' THEN
      RAISE EXCEPTION 'Draft status is system-managed';
    END IF;
    IF NEW.selected_offer_id IS NOT NULL OR NEW.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Draft lifecycle fields are system-managed';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.published_at IS DISTINCT FROM OLD.published_at
    OR NEW.category_id IS DISTINCT FROM OLD.category_id
    OR NEW.subcategory_id IS DISTINCT FROM OLD.subcategory_id
    OR NEW.service_id IS DISTINCT FROM OLD.service_id
    OR NEW.missing_service_text IS DISTINCT FROM OLD.missing_service_text
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.description IS DISTINCT FROM OLD.description
    OR NEW.budget_type IS DISTINCT FROM OLD.budget_type
    OR NEW.budget_min IS DISTINCT FROM OLD.budget_min
    OR NEW.budget_max IS DISTINCT FROM OLD.budget_max
    OR NEW.city IS DISTINCT FROM OLD.city
    OR NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode
    OR NEW.service_area_id IS DISTINCT FROM OLD.service_area_id
    OR NEW.matching_policy IS DISTINCT FROM OLD.matching_policy THEN
    RAISE EXCEPTION 'Published Request business fields are immutable';
  END IF;

  IF NEW.selected_offer_id IS DISTINCT FROM OLD.selected_offer_id
    AND NOT (
      current_user = 'postgres'
      AND OLD.status = 'open'
      AND NEW.status = 'awarded'
      AND NEW.selected_offer_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.offers selected_offer
        WHERE selected_offer.id = NEW.selected_offer_id
          AND selected_offer.request_id = OLD.id
          AND selected_offer.status = 'selected'
      )
    ) THEN
    RAISE EXCEPTION 'selected_offer_id is system-managed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Use a Request lifecycle action';
    END IF;

    IF OLD.status = 'open' AND NEW.status = 'awarded' THEN
      IF NEW.selected_offer_id IS NULL OR NOT EXISTS (
        SELECT 1
        FROM public.offers selected_offer
        WHERE selected_offer.id = NEW.selected_offer_id
          AND selected_offer.request_id = OLD.id
          AND selected_offer.status = 'selected'
      ) THEN
        RAISE EXCEPTION 'Awarded Request requires its selected Offer';
      END IF;
    ELSIF OLD.status = 'open' AND NEW.status = 'cancelled' THEN
      IF NEW.selected_offer_id IS NOT NULL THEN
        RAISE EXCEPTION 'Cancelled Request cannot have a selected Offer';
      END IF;
    ELSIF OLD.status = 'awarded' AND NEW.status = 'closed' THEN
      IF NEW.selected_offer_id IS NULL THEN
        RAISE EXCEPTION 'Closed Request must retain its selected Offer';
      END IF;
    ELSE
      RAISE EXCEPTION
        'Illegal Request status transition from % to %',
        OLD.status,
        NEW.status;
    END IF;

    IF NEW.status IN ('closed', 'cancelled') THEN
      NEW.closed_at := COALESCE(NEW.closed_at, now());
    ELSIF NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
      RAISE EXCEPTION 'closed_at is system-managed';
    END IF;
  ELSIF NEW.closed_at IS DISTINCT FROM OLD.closed_at THEN
    RAISE EXCEPTION 'closed_at is system-managed';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
