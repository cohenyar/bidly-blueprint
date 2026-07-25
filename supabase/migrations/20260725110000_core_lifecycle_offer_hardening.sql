-- Core blocker remediation: immutable published Requests and submitted Offers,
-- server-controlled lifecycle decisions, role-scoped Offer reads, and a strict
-- draft-only attachment mutation boundary.

BEGIN;

-- Refuse to install lifecycle code over internally inconsistent selections.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.requests request_row
    WHERE request_row.status IN ('awarded', 'closed')
      AND (
        request_row.selected_offer_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.offers offer_row
          WHERE offer_row.id = request_row.selected_offer_id
            AND offer_row.request_id = request_row.id
            AND offer_row.status = 'selected'
        )
      )
  ) THEN
    RAISE EXCEPTION
      'Preflight failed: awarded/closed Request without its selected Offer';
  END IF;

  IF EXISTS (
    SELECT offer_row.request_id
    FROM public.offers offer_row
    WHERE offer_row.status = 'selected'
    GROUP BY offer_row.request_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Preflight failed: Request has more than one selected Offer';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.offers offer_row
    JOIN public.requests request_row
      ON request_row.id = offer_row.request_id
    WHERE offer_row.status = 'selected'
      AND (
        request_row.status NOT IN ('awarded', 'closed')
        OR request_row.selected_offer_id IS DISTINCT FROM offer_row.id
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.requests request_row
    WHERE request_row.selected_offer_id IS NOT NULL
      AND request_row.status NOT IN ('awarded', 'closed')
  ) THEN
    RAISE EXCEPTION
      'Preflight failed: selected Offer and Request lifecycle disagree';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS offers_one_selected_per_request_idx
  ON public.offers (request_id)
  WHERE status = 'selected';

-- Browser writes are limited to private drafts. Published state transitions
-- are performed only by the SECURITY DEFINER lifecycle functions below.
DROP POLICY IF EXISTS "Customers update own requests" ON public.requests;
DROP POLICY IF EXISTS "Customers update own draft requests" ON public.requests;
CREATE POLICY "Customers update own draft requests"
  ON public.requests
  FOR UPDATE
  TO authenticated
  USING (
    customer_id = auth.uid()
    AND public.has_role(auth.uid(), 'customer')
    AND published_at IS NULL
    AND status = 'open'
  )
  WITH CHECK (
    customer_id = auth.uid()
    AND published_at IS NULL
    AND status = 'open'
  );

DROP POLICY IF EXISTS "Customers delete own open request with no offers"
  ON public.requests;
DROP POLICY IF EXISTS "Customers delete own request draft" ON public.requests;
CREATE POLICY "Customers delete own request draft"
  ON public.requests
  FOR DELETE
  TO authenticated
  USING (
    customer_id = auth.uid()
    AND public.has_role(auth.uid(), 'customer')
    AND published_at IS NULL
    AND status = 'open'
    AND offers_count = 0
  );

REVOKE UPDATE ON public.requests FROM authenticated;
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
  city
) ON public.requests TO authenticated;

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
    OR NEW.city IS DISTINCT FROM OLD.city THEN
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

CREATE OR REPLACE FUNCTION public.cancel_request(_request_id uuid)
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
  IF _request.published_at IS NULL OR _request.status <> 'open' THEN
    RAISE EXCEPTION 'Only a published open Request may be cancelled'
      USING ERRCODE = '22000';
  END IF;

  UPDATE public.requests
  SET status = 'cancelled',
      closed_at = now(),
      updated_at = now()
  WHERE id = _request.id;

  RETURN _request.id;
END;
$$;

ALTER FUNCTION public.cancel_request(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.cancel_request(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_request(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.close_request(_request_id uuid)
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
  IF _request.status <> 'awarded'
    OR _request.selected_offer_id IS NULL THEN
    RAISE EXCEPTION 'Only an awarded Request may be closed'
      USING ERRCODE = '22000';
  END IF;

  UPDATE public.requests
  SET status = 'closed',
      closed_at = now(),
      updated_at = now()
  WHERE id = _request.id;

  RETURN _request.id;
END;
$$;

ALTER FUNCTION public.close_request(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.close_request(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_request(uuid)
  TO authenticated, service_role;

-- Attachment metadata and object writes end at publication. Existing owner and
-- active-Match read policies remain unchanged.
DROP POLICY IF EXISTS "Customer inserts attachments on own request"
  ON public.request_attachments;
CREATE POLICY "Customer inserts attachments on own request"
  ON public.request_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id = request_id
        AND request_row.customer_id = auth.uid()
        AND request_row.status = 'open'
        AND request_row.published_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Customer deletes attachments on own open request"
  ON public.request_attachments;
CREATE POLICY "Customer deletes attachments on own open request"
  ON public.request_attachments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id = request_id
        AND request_row.customer_id = auth.uid()
        AND request_row.status = 'open'
        AND request_row.published_at IS NULL
    )
  );

REVOKE UPDATE ON public.request_attachments FROM authenticated;

DROP POLICY IF EXISTS "Customer uploads to own open request folder"
  ON storage.objects;
CREATE POLICY "Customer uploads to own open request folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id::text = (storage.foldername(name))[2]
        AND request_row.customer_id = auth.uid()
        AND request_row.status = 'open'
        AND request_row.published_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Customer deletes files from own open request"
  ON storage.objects;
CREATE POLICY "Customer deletes files from own open request"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM public.requests request_row
      WHERE request_row.id::text = (storage.foldername(name))[2]
        AND request_row.customer_id = auth.uid()
        AND request_row.status = 'open'
        AND request_row.published_at IS NULL
    )
  );

-- Submitted Offer content is immutable. Status changes are internal effects of
-- the locked RPCs below; direct table access is removed from browser roles.
CREATE OR REPLACE FUNCTION public.guard_offer_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.request_id <> OLD.request_id
    OR NEW.supplier_id <> OLD.supplier_id
    OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Offer identity fields are immutable';
  END IF;

  IF NEW.price <> OLD.price
    OR NEW.estimated_days <> OLD.estimated_days
    OR NEW.message <> OLD.message THEN
    RAISE EXCEPTION 'Submitted Offer content is immutable';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF current_user <> 'postgres' THEN
      RAISE EXCEPTION 'Use an Offer lifecycle action';
    END IF;
    IF OLD.status <> 'submitted'
      OR NEW.status NOT IN ('withdrawn', 'selected', 'rejected') THEN
      RAISE EXCEPTION
        'Illegal Offer status transition from % to %',
        OLD.status,
        NEW.status;
    END IF;
    IF NEW.status = 'withdrawn' THEN
      NEW.withdrawn_at := COALESCE(NEW.withdrawn_at, now());
    ELSIF NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at THEN
      RAISE EXCEPTION 'withdrawn_at is system-managed';
    END IF;
  ELSIF NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at THEN
    RAISE EXCEPTION 'withdrawn_at is system-managed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_offer_awarded_au ON public.offers;
DROP TRIGGER IF EXISTS offers_on_awarded_au ON public.offers;

REVOKE SELECT, INSERT, UPDATE, DELETE ON public.offers FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_supplier_offer(_request_id uuid)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  price integer,
  estimated_days integer,
  message text,
  status public.offer_status,
  created_at timestamptz,
  updated_at timestamptz,
  withdrawn_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    offer_row.id,
    offer_row.request_id,
    offer_row.price,
    offer_row.estimated_days,
    offer_row.message,
    offer_row.status,
    offer_row.created_at,
    offer_row.updated_at,
    offer_row.withdrawn_at
  FROM public.offers offer_row
  WHERE auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'supplier')
    AND offer_row.supplier_id = auth.uid()
    AND offer_row.request_id = _request_id
  LIMIT 1;
$$;

ALTER FUNCTION public.get_supplier_offer(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_supplier_offer(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supplier_offer(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_customer_request_offers(
  _request_id uuid
)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  price integer,
  estimated_days integer,
  message text,
  status public.offer_status,
  created_at timestamptz,
  business_name text,
  business_description text,
  base_city text,
  years_experience integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    offer_row.id,
    offer_row.request_id,
    offer_row.price,
    offer_row.estimated_days,
    offer_row.message,
    offer_row.status,
    offer_row.created_at,
    COALESCE(profile_row.business_name, 'נותן שירות'),
    NULLIF(btrim(profile_row.description), ''),
    NULLIF(btrim(profile_row.base_city), ''),
    profile_row.years_experience
  FROM public.requests request_row
  JOIN public.offers offer_row
    ON offer_row.request_id = request_row.id
  LEFT JOIN public.supplier_profiles profile_row
    ON profile_row.user_id = offer_row.supplier_id
  WHERE auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'customer')
    AND request_row.id = _request_id
    AND request_row.customer_id = auth.uid()
  ORDER BY offer_row.created_at, offer_row.id;
$$;

ALTER FUNCTION public.get_customer_request_offers(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_customer_request_offers(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_request_offers(uuid)
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
    OR _request.status <> 'open'
    OR _request.published_at IS NULL
    OR NOT EXISTS (
      SELECT 1
      FROM public.matches match_row
      WHERE match_row.request_id = _request.id
        AND match_row.supplier_id = auth.uid()
        AND match_row.status = 'active'
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

CREATE OR REPLACE FUNCTION public.withdraw_offer(_offer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offer public.offers%ROWTYPE;
  _request public.requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'supplier') THEN
    RAISE EXCEPTION 'Supplier authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT request_row.*
  INTO _request
  FROM public.offers offer_row
  JOIN public.requests request_row
    ON request_row.id = offer_row.request_id
  WHERE offer_row.id = _offer_id
  FOR UPDATE OF request_row;

  SELECT *
  INTO _offer
  FROM public.offers offer_row
  WHERE offer_row.id = _offer_id
  FOR UPDATE;

  IF _offer.id IS NULL OR _offer.supplier_id <> auth.uid() THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = '42501';
  END IF;
  IF _request.status <> 'open'
    OR _offer.status <> 'submitted'
    OR NOT EXISTS (
      SELECT 1
      FROM public.matches match_row
      WHERE match_row.request_id = _request.id
        AND match_row.supplier_id = auth.uid()
        AND match_row.status = 'active'
    ) THEN
    RAISE EXCEPTION 'Offer can no longer be withdrawn'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.offers
  SET status = 'withdrawn',
      withdrawn_at = now(),
      updated_at = now()
  WHERE id = _offer.id;

  UPDATE public.matches
  SET status = 'inactive',
      updated_at = now()
  WHERE request_id = _request.id
    AND supplier_id = auth.uid()
    AND status = 'active';

  RETURN _offer.id;
END;
$$;

ALTER FUNCTION public.withdraw_offer(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.withdraw_offer(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_offer(uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.select_offer(_offer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _offer public.offers%ROWTYPE;
  _request public.requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'customer') THEN
    RAISE EXCEPTION 'Customer authentication required'
      USING ERRCODE = '42501';
  END IF;

  SELECT request_row.*
  INTO _request
  FROM public.offers offer_row
  JOIN public.requests request_row
    ON request_row.id = offer_row.request_id
  WHERE offer_row.id = _offer_id
  FOR UPDATE OF request_row;

  IF _request.id IS NULL OR _request.customer_id <> auth.uid() THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = '42501';
  END IF;

  IF _request.status = 'awarded'
    AND _request.selected_offer_id = _offer_id THEN
    RETURN _request.id;
  END IF;
  IF _request.status <> 'open' OR _request.published_at IS NULL THEN
    RAISE EXCEPTION 'Request is no longer open'
      USING ERRCODE = '22000';
  END IF;

  SELECT *
  INTO _offer
  FROM public.offers offer_row
  WHERE offer_row.id = _offer_id
    AND offer_row.request_id = _request.id
  FOR UPDATE;

  IF _offer.id IS NULL OR _offer.status <> 'submitted' THEN
    RAISE EXCEPTION 'Offer is no longer selectable'
      USING ERRCODE = '22000';
  END IF;

  UPDATE public.offers
  SET status = 'selected',
      updated_at = now()
  WHERE id = _offer.id;

  UPDATE public.offers
  SET status = 'rejected',
      updated_at = now()
  WHERE request_id = _request.id
    AND id <> _offer.id
    AND status = 'submitted';

  UPDATE public.requests
  SET status = 'awarded',
      selected_offer_id = _offer.id,
      updated_at = now()
  WHERE id = _request.id;

  RETURN _request.id;
END;
$$;

ALTER FUNCTION public.select_offer(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.select_offer(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.select_offer(uuid)
  TO authenticated, service_role;

COMMIT;
