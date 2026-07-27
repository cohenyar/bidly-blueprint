CREATE UNIQUE INDEX requests_one_draft_per_customer_idx ON public.requests (customer_id) WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_or_create_request_draft()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _request_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'customer') THEN RAISE EXCEPTION 'Customer authentication required' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 20260725));
  SELECT request_row.id INTO _request_id FROM public.requests request_row WHERE request_row.customer_id = auth.uid() AND request_row.published_at IS NULL ORDER BY request_row.updated_at DESC LIMIT 1;
  IF _request_id IS NULL THEN INSERT INTO public.requests (customer_id) VALUES (auth.uid()) RETURNING id INTO _request_id; END IF;
  RETURN _request_id;
END;
$$;
ALTER FUNCTION public.get_or_create_request_draft() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_or_create_request_draft() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_request_draft() TO authenticated, service_role;

ALTER TABLE public.requests
  DROP CONSTRAINT requests_missing_service_text_check,
  ADD CONSTRAINT requests_missing_service_text_check CHECK (missing_service_text IS NULL OR (char_length(missing_service_text) <= 500 AND (published_at IS NULL OR char_length(btrim(missing_service_text)) >= 3))) NOT VALID;

CREATE OR REPLACE FUNCTION public.validate_request()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _profession_category uuid; _service_profession uuid; _strict_budget boolean;
BEGIN
  IF NEW.published_at IS NOT NULL THEN
    IF NEW.category_id IS NULL OR NEW.title IS NULL OR NEW.description IS NULL OR NEW.city IS NULL THEN RAISE EXCEPTION 'Published Request is missing required fields' USING ERRCODE = '22000'; END IF;
  END IF;
  IF NEW.title IS NOT NULL AND ((NEW.published_at IS NOT NULL AND char_length(btrim(NEW.title)) < 3) OR char_length(NEW.title) > 120) THEN RAISE EXCEPTION 'Invalid title length' USING ERRCODE = '22000'; END IF;
  IF NEW.description IS NOT NULL AND ((NEW.published_at IS NOT NULL AND char_length(btrim(NEW.description)) < 20) OR char_length(NEW.description) > 4000) THEN RAISE EXCEPTION 'Invalid description length' USING ERRCODE = '22000'; END IF;
  IF NEW.city IS NOT NULL AND ((NEW.published_at IS NOT NULL AND char_length(btrim(NEW.city)) < 2) OR char_length(NEW.city) > 80) THEN RAISE EXCEPTION 'Invalid city' USING ERRCODE = '22000'; END IF;
  IF NEW.missing_service_text IS NOT NULL AND ((NEW.published_at IS NOT NULL AND char_length(btrim(NEW.missing_service_text)) < 3) OR char_length(NEW.missing_service_text) > 500) THEN RAISE EXCEPTION 'Invalid missing service description' USING ERRCODE = '22000'; END IF;
  _strict_budget := NEW.published_at IS NOT NULL;
  IF NEW.budget_type = 'fixed' THEN
    IF _strict_budget OR NEW.budget_min IS NOT NULL OR NEW.budget_max IS NOT NULL THEN
      IF NEW.budget_min IS NULL OR NEW.budget_max IS NULL OR NEW.budget_min <> NEW.budget_max OR NEW.budget_min <= 0 THEN RAISE EXCEPTION 'Fixed budget requires an equal positive amount' USING ERRCODE = '22000'; END IF;
    END IF;
  ELSIF NEW.budget_type = 'range' THEN
    IF _strict_budget OR (NEW.budget_min IS NOT NULL AND NEW.budget_max IS NOT NULL) THEN
      IF NEW.budget_min IS NULL OR NEW.budget_max IS NULL OR NEW.budget_min <= 0 OR NEW.budget_max <= 0 OR NEW.budget_min > NEW.budget_max THEN RAISE EXCEPTION 'Invalid budget range' USING ERRCODE = '22000'; END IF;
    END IF;
  ELSIF NEW.budget_min IS NOT NULL OR NEW.budget_max IS NOT NULL THEN RAISE EXCEPTION 'Open budget must have null min and max' USING ERRCODE = '22000';
  END IF;
  IF NEW.category_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.categories category_row WHERE category_row.id = NEW.category_id AND (category_row.is_active OR NEW.schema_version = 1)) THEN RAISE EXCEPTION 'Unknown or inactive category' USING ERRCODE = '22000'; END IF;
  IF NEW.subcategory_id IS NOT NULL THEN
    SELECT profession_row.category_id INTO _profession_category FROM public.subcategories profession_row WHERE profession_row.id = NEW.subcategory_id AND (profession_row.is_active OR NEW.schema_version = 1);
    IF _profession_category IS NULL OR _profession_category IS DISTINCT FROM NEW.category_id THEN RAISE EXCEPTION 'Profession does not belong to category' USING ERRCODE = '22000'; END IF;
  END IF;
  IF NEW.service_id IS NOT NULL THEN
    SELECT service_row.subcategory_id INTO _service_profession FROM public.services service_row WHERE service_row.id = NEW.service_id AND service_row.is_active;
    IF _service_profession IS NULL OR _service_profession IS DISTINCT FROM NEW.subcategory_id THEN RAISE EXCEPTION 'Service does not belong to profession' USING ERRCODE = '22000'; END IF;
    IF NEW.missing_service_text IS NOT NULL THEN RAISE EXCEPTION 'Governed Service and missing-Service text are exclusive' USING ERRCODE = '22000'; END IF;
  END IF;
  IF NEW.published_at IS NOT NULL AND NEW.schema_version >= 2 THEN
    IF NEW.service_id IS NULL AND NEW.missing_service_text IS NULL THEN RAISE EXCEPTION 'Missing-Service description is required' USING ERRCODE = '22000'; END IF;
    IF NEW.subcategory_id IS NULL AND EXISTS (SELECT 1 FROM public.subcategories profession_row WHERE profession_row.category_id = NEW.category_id AND profession_row.is_active) THEN RAISE EXCEPTION 'Profession is required when governed options exist' USING ERRCODE = '22000'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public._request_question_is_visible(_request_id uuid, _question_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.requests request_row
    JOIN public.request_questions question_row ON question_row.id = _question_id AND question_row.is_active AND question_row.subcategory_id = request_row.subcategory_id AND (question_row.service_id IS NULL OR question_row.service_id = request_row.service_id)
    LEFT JOIN public.request_question_answers dependency_answer ON dependency_answer.request_id = request_row.id AND dependency_answer.question_id = question_row.condition_question_id
    WHERE request_row.id = _request_id
      AND (question_row.condition_question_id IS NULL
        OR (dependency_answer.question_id IS NOT NULL AND (
          (question_row.condition_operator = 'equals' AND dependency_answer.answer = question_row.condition_value)
          OR (question_row.condition_operator = 'not_equals' AND dependency_answer.answer IS DISTINCT FROM question_row.condition_value)
          OR (question_row.condition_operator = 'contains' AND dependency_answer.answer @> jsonb_build_array(question_row.condition_value))
        )))
  );
$$;
ALTER FUNCTION public._request_question_is_visible(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._request_question_is_visible(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._request_question_is_visible(uuid, uuid) TO service_role;

ALTER FUNCTION public.validate_request_question_answer() SECURITY DEFINER;
ALTER FUNCTION public.validate_request_question_answer() SET search_path = public;
ALTER FUNCTION public.validate_request_question_answer() OWNER TO postgres;

CREATE POLICY "Customers view own answered Request questions" ON public.request_questions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.request_question_answers answer_row JOIN public.requests request_row ON request_row.id = answer_row.request_id WHERE answer_row.question_id = request_questions.id AND request_row.customer_id = auth.uid()));