-- Product expansion: private Request drafts, governed questionnaire
-- definitions, typed answers, and idempotent publication.

-- -------------------------------------------------------------------------
-- Request taxonomy and private draft lifecycle.
-- -------------------------------------------------------------------------

ALTER TABLE public.requests
  ADD COLUMN service_id uuid REFERENCES public.services(id) ON DELETE RESTRICT,
  ADD COLUMN missing_service_text text,
  ADD COLUMN schema_version smallint NOT NULL DEFAULT 1;

-- Rows predating this migration remain version 1. Browser inserts cannot write
-- schema_version, so every new draft receives version 2.
ALTER TABLE public.requests
  ALTER COLUMN schema_version SET DEFAULT 2,
  ALTER COLUMN category_id DROP NOT NULL,
  ALTER COLUMN title DROP NOT NULL,
  ALTER COLUMN description DROP NOT NULL,
  ALTER COLUMN city DROP NOT NULL,
  ALTER COLUMN published_at DROP NOT NULL,
  ALTER COLUMN published_at DROP DEFAULT;

ALTER TABLE public.requests
  ADD CONSTRAINT requests_schema_version_check
    CHECK (schema_version IN (1, 2)) NOT VALID,
  ADD CONSTRAINT requests_missing_service_text_check
    CHECK (
      missing_service_text IS NULL
      OR char_length(btrim(missing_service_text)) BETWEEN 3 AND 500
    ) NOT VALID,
  ADD CONSTRAINT requests_published_required_fields_check
    CHECK (
      published_at IS NULL
      OR (
        category_id IS NOT NULL
        AND title IS NOT NULL
        AND description IS NOT NULL
        AND city IS NOT NULL
      )
    ) NOT VALID;

CREATE INDEX requests_customer_drafts_updated_idx
  ON public.requests (customer_id, updated_at DESC)
  WHERE published_at IS NULL;

CREATE INDEX requests_service_published_idx
  ON public.requests (service_id, published_at DESC)
  WHERE published_at IS NOT NULL AND status = 'open';

REVOKE INSERT, UPDATE ON public.requests FROM authenticated;
GRANT INSERT (
  customer_id,
  category_id,
  subcategory_id,
  service_id,
  missing_service_text,
  title,
  description,
  budget_type,
  budget_min,
  budget_max,
  city
) ON public.requests TO authenticated;
GRANT UPDATE (
  category_id,
  subcategory_id,
  service_id,
  missing_service_text,
  title,
  description,
  budget_type,
  budget_min,
  budget_max,
  city,
  status
) ON public.requests TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _profession_category uuid;
  _service_profession uuid;
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
      char_length(btrim(NEW.title)) < 3
      OR char_length(NEW.title) > 120
    ) THEN
    RAISE EXCEPTION 'Invalid title length' USING ERRCODE = '22000';
  END IF;

  IF NEW.description IS NOT NULL
    AND (
      char_length(btrim(NEW.description)) < 20
      OR char_length(NEW.description) > 4000
    ) THEN
    RAISE EXCEPTION 'Invalid description length' USING ERRCODE = '22000';
  END IF;

  IF NEW.city IS NOT NULL
    AND (
      char_length(btrim(NEW.city)) < 2
      OR char_length(NEW.city) > 80
    ) THEN
    RAISE EXCEPTION 'Invalid city' USING ERRCODE = '22000';
  END IF;

  IF NEW.missing_service_text IS NOT NULL
    AND (
      char_length(btrim(NEW.missing_service_text)) < 3
      OR char_length(NEW.missing_service_text) > 500
    ) THEN
    RAISE EXCEPTION 'Invalid missing service description'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.budget_type = 'fixed' THEN
    IF NEW.budget_min IS NULL
      OR NEW.budget_max IS NULL
      OR NEW.budget_min <> NEW.budget_max
      OR NEW.budget_min <= 0 THEN
      RAISE EXCEPTION 'Fixed budget requires an equal positive amount'
        USING ERRCODE = '22000';
    END IF;
  ELSIF NEW.budget_type = 'range' THEN
    IF NEW.budget_min IS NULL
      OR NEW.budget_max IS NULL
      OR NEW.budget_min <= 0
      OR NEW.budget_max <= 0
      OR NEW.budget_min > NEW.budget_max THEN
      RAISE EXCEPTION 'Invalid budget range' USING ERRCODE = '22000';
    END IF;
  ELSIF NEW.budget_min IS NOT NULL OR NEW.budget_max IS NOT NULL THEN
    RAISE EXCEPTION 'Open budget must have null min and max'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.category_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.categories category_row
      WHERE category_row.id = NEW.category_id
        AND (category_row.is_active OR NEW.schema_version = 1)
    ) THEN
    RAISE EXCEPTION 'Unknown or inactive category' USING ERRCODE = '22000';
  END IF;

  IF NEW.subcategory_id IS NOT NULL THEN
    SELECT profession_row.category_id
    INTO _profession_category
    FROM public.subcategories profession_row
    WHERE profession_row.id = NEW.subcategory_id
      AND (profession_row.is_active OR NEW.schema_version = 1);

    IF _profession_category IS NULL
      OR _profession_category IS DISTINCT FROM NEW.category_id THEN
      RAISE EXCEPTION 'Profession does not belong to category'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  IF NEW.service_id IS NOT NULL THEN
    SELECT service_row.subcategory_id
    INTO _service_profession
    FROM public.services service_row
    WHERE service_row.id = NEW.service_id
      AND service_row.is_active;

    IF _service_profession IS NULL
      OR _service_profession IS DISTINCT FROM NEW.subcategory_id THEN
      RAISE EXCEPTION 'Service does not belong to profession'
        USING ERRCODE = '22000';
    END IF;

    IF NEW.missing_service_text IS NOT NULL THEN
      RAISE EXCEPTION 'Governed Service and missing-Service text are exclusive'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  IF NEW.published_at IS NOT NULL AND NEW.schema_version >= 2 THEN
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
      RAISE EXCEPTION 'Profession is required when governed options exist'
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
  IF NEW.offers_count <> OLD.offers_count AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'offers_count is system-managed';
  END IF;

  IF OLD.published_at IS NULL THEN
    IF OLD.status <> 'open'
      OR OLD.offers_count <> 0
      OR OLD.selected_offer_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid draft lifecycle state';
    END IF;
    IF NEW.published_at IS NOT NULL AND current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Use publish_request to publish a draft';
    END IF;
    IF NEW.status <> 'open' THEN
      RAISE EXCEPTION 'Draft status is system-managed';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    RAISE EXCEPTION 'published_at is immutable';
  END IF;
  IF NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    RAISE EXCEPTION 'category_id is immutable after publication';
  END IF;
  IF NEW.subcategory_id IS DISTINCT FROM OLD.subcategory_id THEN
    RAISE EXCEPTION 'subcategory_id is immutable after publication';
  END IF;
  IF NEW.service_id IS DISTINCT FROM OLD.service_id THEN
    RAISE EXCEPTION 'service_id is immutable after publication';
  END IF;
  IF NEW.missing_service_text IS DISTINCT FROM OLD.missing_service_text THEN
    RAISE EXCEPTION 'missing_service_text is immutable after publication';
  END IF;
  IF NEW.budget_type <> OLD.budget_type THEN
    RAISE EXCEPTION 'budget_type is immutable after publication';
  END IF;
  IF NEW.budget_min IS DISTINCT FROM OLD.budget_min THEN
    RAISE EXCEPTION 'budget_min is immutable after publication';
  END IF;
  IF NEW.budget_max IS DISTINCT FROM OLD.budget_max THEN
    RAISE EXCEPTION 'budget_max is immutable after publication';
  END IF;
  IF NEW.city IS DISTINCT FROM OLD.city THEN
    RAISE EXCEPTION 'city is immutable after publication';
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description
    AND OLD.offers_count > 0 THEN
    RAISE EXCEPTION 'Description cannot change after offers arrive';
  END IF;

  IF NEW.selected_offer_id IS DISTINCT FROM OLD.selected_offer_id THEN
    IF NOT (
      OLD.status = 'open'
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
  END IF;

  IF NEW.status <> OLD.status THEN
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
    ELSIF OLD.status = 'open' AND NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Illegal status transition from %', OLD.status;
    ELSIF OLD.status = 'awarded' AND NEW.status <> 'closed' THEN
      RAISE EXCEPTION 'Illegal status transition from %', OLD.status;
    ELSIF OLD.status IN ('closed', 'cancelled') THEN
      RAISE EXCEPTION 'Request is terminal (%), cannot change status', OLD.status;
    END IF;

    IF NEW.status IN ('closed', 'cancelled') AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -------------------------------------------------------------------------
-- Governed questionnaire definitions and Request-owned answers.
-- -------------------------------------------------------------------------

CREATE TABLE public.request_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id uuid NOT NULL
    REFERENCES public.subcategories(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE CASCADE,
  field_type text NOT NULL
    CHECK (
      field_type IN (
        'short_text',
        'long_text',
        'single_choice',
        'multiple_choice',
        'number'
      )
    ),
  prompt_he text NOT NULL,
  help_text_he text,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  condition_question_id uuid REFERENCES public.request_questions(id)
    ON DELETE SET NULL,
  condition_operator text
    CHECK (
      condition_operator IS NULL
      OR condition_operator IN ('equals', 'not_equals', 'contains')
    ),
  condition_value jsonb,
  definition_version integer NOT NULL DEFAULT 1
    CHECK (definition_version > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(prompt_he)) BETWEEN 1 AND 500),
  CHECK (jsonb_typeof(options) = 'array'),
  CHECK (
    (condition_question_id IS NULL
      AND condition_operator IS NULL
      AND condition_value IS NULL)
    OR
    (condition_question_id IS NOT NULL
      AND condition_operator IS NOT NULL
      AND condition_value IS NOT NULL)
  )
);

CREATE INDEX request_questions_scope_sort_idx
  ON public.request_questions (
    subcategory_id,
    service_id,
    is_active,
    sort_order
  );

CREATE TRIGGER request_questions_updated_at
  BEFORE UPDATE ON public.request_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_request_question()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.service_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM public.services service_row
      WHERE service_row.id = NEW.service_id
        AND service_row.subcategory_id = NEW.subcategory_id
    ) THEN
    RAISE EXCEPTION 'Question Service does not belong to Profession'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.field_type IN ('single_choice', 'multiple_choice')
    AND jsonb_array_length(NEW.options) = 0 THEN
    RAISE EXCEPTION 'Choice question requires options'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.field_type NOT IN ('single_choice', 'multiple_choice')
    AND NEW.options <> '[]'::jsonb THEN
    RAISE EXCEPTION 'Non-choice question cannot define options'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.condition_question_id = NEW.id THEN
    RAISE EXCEPTION 'Question cannot depend on itself'
      USING ERRCODE = '22000';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_request_question()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER request_questions_validate_biu
  BEFORE INSERT OR UPDATE ON public.request_questions
  FOR EACH ROW EXECUTE FUNCTION public.validate_request_question();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_questions
  TO authenticated;
GRANT ALL ON public.request_questions TO service_role;

ALTER TABLE public.request_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active Request questions"
  ON public.request_questions FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert Request questions"
  ON public.request_questions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update Request questions"
  ON public.request_questions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete Request questions"
  ON public.request_questions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.request_question_answers (
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.request_questions(id)
    ON DELETE RESTRICT,
  answer jsonb NOT NULL,
  definition_version integer NOT NULL CHECK (definition_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, question_id)
);

CREATE INDEX request_question_answers_question_idx
  ON public.request_question_answers (question_id, request_id);

CREATE TRIGGER request_question_answers_updated_at
  BEFORE UPDATE ON public.request_question_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public._request_question_is_visible(
  _request_id uuid,
  _question_id uuid
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
    JOIN public.request_questions question_row
      ON question_row.id = _question_id
     AND question_row.is_active
     AND question_row.subcategory_id = request_row.subcategory_id
     AND (
       question_row.service_id IS NULL
       OR question_row.service_id = request_row.service_id
     )
    LEFT JOIN public.request_question_answers dependency_answer
      ON dependency_answer.request_id = request_row.id
     AND dependency_answer.question_id = question_row.condition_question_id
    WHERE request_row.id = _request_id
      AND (
        question_row.condition_question_id IS NULL
        OR (
          question_row.condition_operator = 'equals'
          AND dependency_answer.answer = question_row.condition_value
        )
        OR (
          question_row.condition_operator = 'not_equals'
          AND dependency_answer.answer IS DISTINCT FROM question_row.condition_value
        )
        OR (
          question_row.condition_operator = 'contains'
          AND dependency_answer.answer @> jsonb_build_array(
            question_row.condition_value
          )
        )
      )
  );
$$;

ALTER FUNCTION public._request_question_is_visible(uuid, uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public._request_question_is_visible(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._request_question_is_visible(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.validate_request_question_answer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _question public.request_questions%ROWTYPE;
BEGIN
  SELECT *
  INTO _question
  FROM public.request_questions
  WHERE id = NEW.question_id
    AND is_active;

  IF _question.id IS NULL
    OR NOT public._request_question_is_visible(
      NEW.request_id,
      NEW.question_id
    ) THEN
    RAISE EXCEPTION 'Question is not active for this Request'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.definition_version <> _question.definition_version THEN
    RAISE EXCEPTION 'Question definition version is stale'
      USING ERRCODE = '22000';
  END IF;

  IF _question.field_type = 'short_text' THEN
    IF jsonb_typeof(NEW.answer) <> 'string'
      OR char_length(btrim(NEW.answer #>> '{}')) NOT BETWEEN 1 AND 500 THEN
      RAISE EXCEPTION 'Invalid short-text answer'
        USING ERRCODE = '22000';
    END IF;
  ELSIF _question.field_type = 'long_text' THEN
    IF jsonb_typeof(NEW.answer) <> 'string'
      OR char_length(btrim(NEW.answer #>> '{}')) NOT BETWEEN 1 AND 4000 THEN
      RAISE EXCEPTION 'Invalid long-text answer'
        USING ERRCODE = '22000';
    END IF;
  ELSIF _question.field_type = 'number' THEN
    IF jsonb_typeof(NEW.answer) <> 'number' THEN
      RAISE EXCEPTION 'Invalid numeric answer'
        USING ERRCODE = '22000';
    END IF;
  ELSIF _question.field_type = 'single_choice' THEN
    IF jsonb_typeof(NEW.answer) <> 'string'
      OR NOT (_question.options ? (NEW.answer #>> '{}')) THEN
      RAISE EXCEPTION 'Invalid single-choice answer'
        USING ERRCODE = '22000';
    END IF;
  ELSIF _question.field_type = 'multiple_choice' THEN
    IF jsonb_typeof(NEW.answer) <> 'array'
      OR jsonb_array_length(NEW.answer) = 0
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(NEW.answer) selected(value)
        WHERE NOT (_question.options ? selected.value)
      ) THEN
      RAISE EXCEPTION 'Invalid multiple-choice answer'
        USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_request_question_answer()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER request_question_answers_validate_biu
  BEFORE INSERT OR UPDATE ON public.request_question_answers
  FOR EACH ROW EXECUTE FUNCTION public.validate_request_question_answer();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_question_answers
  TO authenticated;
GRANT ALL ON public.request_question_answers TO service_role;

ALTER TABLE public.request_question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers read own Request answers"
  ON public.request_question_answers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id = request_id
        AND request_row.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customers insert own draft answers"
  ON public.request_question_answers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id = request_id
        AND request_row.customer_id = auth.uid()
        AND request_row.published_at IS NULL
    )
  );

CREATE POLICY "Customers update own draft answers"
  ON public.request_question_answers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id = request_id
        AND request_row.customer_id = auth.uid()
        AND request_row.published_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id = request_id
        AND request_row.customer_id = auth.uid()
        AND request_row.published_at IS NULL
    )
  );

CREATE POLICY "Customers delete own draft answers"
  ON public.request_question_answers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id = request_id
        AND request_row.customer_id = auth.uid()
        AND request_row.published_at IS NULL
    )
  );

REVOKE INSERT, UPDATE ON public.request_question_answers FROM authenticated;
GRANT INSERT (request_id, question_id, answer, definition_version)
  ON public.request_question_answers TO authenticated;
GRANT UPDATE (answer, definition_version)
  ON public.request_question_answers TO authenticated;

CREATE OR REPLACE FUNCTION public.publish_request(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'customer') THEN
    RAISE EXCEPTION 'Customer authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO _request
  FROM public.requests request_row
  WHERE request_row.id = _request_id
  FOR UPDATE;

  IF _request.id IS NULL OR _request.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Request not found' USING ERRCODE = '42501';
  END IF;

  IF _request.published_at IS NOT NULL THEN
    RETURN _request.id;
  END IF;

  -- Hidden or out-of-scope answers never become active published data.
  DELETE FROM public.request_question_answers answer_row
  WHERE answer_row.request_id = _request.id
    AND NOT public._request_question_is_visible(
      answer_row.request_id,
      answer_row.question_id
    );

  IF EXISTS (
    SELECT 1
    FROM public.request_questions question_row
    WHERE question_row.is_active
      AND question_row.is_required
      AND question_row.subcategory_id = _request.subcategory_id
      AND (
        question_row.service_id IS NULL
        OR question_row.service_id = _request.service_id
      )
      AND public._request_question_is_visible(
        _request.id,
        question_row.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.request_question_answers answer_row
        WHERE answer_row.request_id = _request.id
          AND answer_row.question_id = question_row.id
      )
  ) THEN
    RAISE EXCEPTION 'Required questionnaire answers are missing'
      USING ERRCODE = '22000';
  END IF;

  UPDATE public.requests
  SET published_at = now(),
      updated_at = now()
  WHERE id = _request.id;

  RETURN _request.id;
END;
$$;

ALTER FUNCTION public.publish_request(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.publish_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_request(uuid)
  TO authenticated, service_role;
