-- Restore the canonical request-cancellation RPC for managed backends where
-- the Core lifecycle hardening migration has not reached PostgREST.
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

-- Browser roles may not update Offer rows directly. Content corrections are
-- allowed only through update_submitted_offer() below.
REVOKE UPDATE ON public.offers FROM authenticated;
REVOKE UPDATE (price, estimated_days, message, status)
  ON public.offers FROM authenticated;

-- Preserve all Offer identity/status immutability while admitting one narrow
-- content-update path: a postgres-owned SECURITY DEFINER action invoked by the
-- authenticated Supplier who owns the still-submitted Offer.
CREATE OR REPLACE FUNCTION public.guard_offer_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _content_changed boolean;
BEGIN
  IF NEW.request_id <> OLD.request_id
    OR NEW.supplier_id <> OLD.supplier_id
    OR NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'Offer identity fields are immutable';
  END IF;

  _content_changed :=
    NEW.price <> OLD.price
    OR NEW.estimated_days <> OLD.estimated_days
    OR NEW.message <> OLD.message;

  IF _content_changed THEN
    IF current_user <> 'postgres'
      OR auth.uid() IS NULL
      OR auth.uid() <> OLD.supplier_id
      OR OLD.status <> 'submitted'
      OR NEW.status <> OLD.status THEN
      RAISE EXCEPTION 'Use the submitted Offer update action';
    END IF;
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

CREATE OR REPLACE FUNCTION public.update_submitted_offer(
  _offer_id uuid,
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
  _offer public.offers%ROWTYPE;
  _request public.requests%ROWTYPE;
  _normalized_message text := btrim(COALESCE(_message, ''));
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'supplier') THEN
    RAISE EXCEPTION 'Supplier authentication required'
      USING ERRCODE = '42501';
  END IF;

  -- Lock Request before Offer, matching the other Offer lifecycle RPCs.
  SELECT request_row.*
  INTO _request
  FROM public.offers offer_row
  JOIN public.requests request_row
    ON request_row.id = offer_row.request_id
  WHERE offer_row.id = _offer_id
    AND offer_row.supplier_id = auth.uid()
  FOR UPDATE OF request_row;

  IF _request.id IS NULL THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO _offer
  FROM public.offers offer_row
  WHERE offer_row.id = _offer_id
    AND offer_row.supplier_id = auth.uid()
  FOR UPDATE;

  IF _offer.id IS NULL THEN
    RAISE EXCEPTION 'Offer not found' USING ERRCODE = '42501';
  END IF;
  IF _offer.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only a submitted Offer may be updated'
      USING ERRCODE = '22000';
  END IF;
  IF _request.published_at IS NULL OR _request.status <> 'open' THEN
    RAISE EXCEPTION 'Offer Request is not open'
      USING ERRCODE = '22000';
  END IF;
  IF NOT public._match_authorizes_supplier(auth.uid(), _request.id) THEN
    RAISE EXCEPTION 'No active Match for this Request'
      USING ERRCODE = '42501';
  END IF;
  IF _price IS NULL OR _price <= 0 THEN
    RAISE EXCEPTION 'Offer price must be greater than zero'
      USING ERRCODE = '22000';
  END IF;
  IF _estimated_days IS NULL
    OR _estimated_days < 1
    OR _estimated_days > 365 THEN
    RAISE EXCEPTION 'Offer estimated days must be between 1 and 365'
      USING ERRCODE = '22000';
  END IF;
  IF char_length(_normalized_message) > 2000 THEN
    RAISE EXCEPTION 'Invalid offer message length'
      USING ERRCODE = '22000';
  END IF;

  UPDATE public.offers
  SET price = _price,
      estimated_days = _estimated_days,
      message = _normalized_message,
      updated_at = now()
  WHERE id = _offer.id;

  RETURN _offer.id;
END;
$$;

ALTER FUNCTION public.update_submitted_offer(uuid, integer, integer, text)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION
  public.update_submitted_offer(uuid, integer, integer, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.update_submitted_offer(uuid, integer, integer, text)
  TO authenticated, service_role;
