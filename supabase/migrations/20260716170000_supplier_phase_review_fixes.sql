-- Supplier Phase (Gates 1-5) corrective review.
-- This migration only repairs authorization, trigger, and data-integrity defects.

-- RLS policies call has_role(auth.uid(), ...), but EXECUTE was revoked from
-- authenticated users. Restore caller access without allowing non-admin users
-- to enumerate another user's roles.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      _user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_roles caller_role
        WHERE caller_role.user_id = auth.uid()
          AND caller_role.role = 'admin'
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.user_roles target_role
      WHERE target_role.user_id = _user_id
        AND target_role.role = _role
    );
$$;

ALTER FUNCTION public.has_role(uuid, public.app_role) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)
  TO authenticated, service_role;

-- A later migration attached duplicate copies of triggers that already existed.
-- Normalize each affected function to exactly one canonical trigger.
DROP TRIGGER IF EXISTS validate_request_biu ON public.requests;
DROP TRIGGER IF EXISTS requests_validate_biu ON public.requests;
DROP TRIGGER IF EXISTS guard_request_update_bu ON public.requests;
DROP TRIGGER IF EXISTS requests_guard_bu ON public.requests;
DROP TRIGGER IF EXISTS validate_offer_biu ON public.offers;
DROP TRIGGER IF EXISTS offers_validate_biu ON public.offers;
DROP TRIGGER IF EXISTS guard_offer_update_bu ON public.offers;
DROP TRIGGER IF EXISTS offers_guard_bu ON public.offers;
DROP TRIGGER IF EXISTS sync_request_offers_count_aiud ON public.offers;
DROP TRIGGER IF EXISTS offers_sync_count_aiud ON public.offers;
DROP TRIGGER IF EXISTS on_offer_awarded_au ON public.offers;
DROP TRIGGER IF EXISTS offers_on_awarded_au ON public.offers;

CREATE TRIGGER validate_request_biu
  BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_request();

CREATE TRIGGER guard_request_update_bu
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_update();

CREATE TRIGGER validate_offer_biu
  BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.validate_offer();

CREATE TRIGGER guard_offer_update_bu
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_offer_update();

CREATE TRIGGER sync_request_offers_count_aiud
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.sync_request_offers_count();

CREATE TRIGGER on_offer_awarded_au
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.on_offer_awarded();

-- Prevent a customer from directly forging an awarded request. The trusted
-- award trigger supplies a selected offer that belongs to the same request.
CREATE OR REPLACE FUNCTION public.guard_request_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id <> OLD.customer_id THEN
    RAISE EXCEPTION 'customer_id is immutable';
  END IF;
  IF NEW.category_id <> OLD.category_id THEN
    RAISE EXCEPTION 'category_id is immutable';
  END IF;
  IF NEW.subcategory_id IS DISTINCT FROM OLD.subcategory_id THEN
    RAISE EXCEPTION 'subcategory_id is immutable';
  END IF;
  IF NEW.budget_type <> OLD.budget_type THEN
    RAISE EXCEPTION 'budget_type is immutable';
  END IF;
  IF NEW.budget_min IS DISTINCT FROM OLD.budget_min THEN
    RAISE EXCEPTION 'budget_min is immutable';
  END IF;
  IF NEW.budget_max IS DISTINCT FROM OLD.budget_max THEN
    RAISE EXCEPTION 'budget_max is immutable';
  END IF;
  IF NEW.city <> OLD.city THEN
    RAISE EXCEPTION 'city is immutable';
  END IF;
  IF NEW.published_at <> OLD.published_at THEN
    RAISE EXCEPTION 'published_at is immutable';
  END IF;

  IF NEW.description <> OLD.description AND OLD.offers_count > 0 THEN
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
        RAISE EXCEPTION 'Awarded request requires its selected offer';
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

-- Content cannot be changed as part of a status transition. The trusted award
-- trigger (owned by postgres) is the only path allowed to reject sibling offers.
CREATE OR REPLACE FUNCTION public.guard_offer_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_customer boolean;
  is_supplier boolean;
  content_changed boolean;
BEGIN
  IF NEW.request_id <> OLD.request_id THEN
    RAISE EXCEPTION 'request_id is immutable';
  END IF;
  IF NEW.supplier_id <> OLD.supplier_id THEN
    RAISE EXCEPTION 'supplier_id is immutable';
  END IF;
  IF NEW.created_at <> OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable';
  END IF;

  is_supplier := auth.uid() = OLD.supplier_id;
  is_customer := EXISTS (
    SELECT 1
    FROM public.requests request_row
    WHERE request_row.id = OLD.request_id
      AND request_row.customer_id = auth.uid()
  );
  content_changed :=
    NEW.price <> OLD.price
    OR NEW.estimated_days <> OLD.estimated_days
    OR NEW.message <> OLD.message;

  IF NEW.status <> OLD.status THEN
    IF content_changed THEN
      RAISE EXCEPTION 'Offer content cannot change during a status transition';
    END IF;

    IF is_supplier AND NEW.status = 'withdrawn' AND OLD.status = 'submitted' THEN
      NEW.withdrawn_at := now();
    ELSIF is_customer
      AND NEW.status = 'selected'
      AND OLD.status = 'submitted'
      AND EXISTS (
        SELECT 1
        FROM public.requests request_row
        WHERE request_row.id = OLD.request_id
          AND request_row.status = 'open'
      ) THEN
      NULL;
    ELSIF current_user = 'postgres'
      AND NEW.status = 'rejected'
      AND OLD.status = 'submitted' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Illegal offer status transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSE
    IF NEW.withdrawn_at IS DISTINCT FROM OLD.withdrawn_at THEN
      RAISE EXCEPTION 'withdrawn_at is system-managed';
    END IF;
    IF content_changed THEN
      IF NOT is_supplier THEN
        RAISE EXCEPTION 'Only the supplier may edit offer content';
      END IF;
      IF OLD.status <> 'submitted' THEN
        RAISE EXCEPTION 'Offer content is immutable after status leaves submitted';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.on_offer_awarded() OWNER TO postgres;

-- Repair counters that may have been changed twice by the duplicate trigger.
UPDATE public.requests request_row
SET offers_count = (
  SELECT count(*)::integer
  FROM public.offers offer_row
  WHERE offer_row.request_id = request_row.id
    AND offer_row.status = 'submitted'
)
WHERE request_row.offers_count IS DISTINCT FROM (
  SELECT count(*)::integer
  FROM public.offers offer_row
  WHERE offer_row.request_id = request_row.id
    AND offer_row.status = 'submitted'
);

-- A selected subcategory must not survive deletion of its parent supplier
-- category. Their existing DELETE trigger deactivates affected matches.
CREATE OR REPLACE FUNCTION public.trg_supplier_categories_ad()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.supplier_subcategories supplier_subcategory
  USING public.subcategories subcategory
  WHERE supplier_subcategory.supplier_id = OLD.supplier_id
    AND subcategory.id = supplier_subcategory.subcategory_id
    AND subcategory.category_id = OLD.category_id;

  IF NOT public._is_supplier_profile_complete(OLD.supplier_id) THEN
    PERFORM public._deactivate_matches_for_supplier(OLD.supplier_id);
  END IF;

  RETURN OLD;
END;
$$;

ALTER FUNCTION public.trg_supplier_categories_ad() OWNER TO postgres;

-- Remove pre-existing orphaned selections. The subcategory DELETE trigger also
-- deactivates their request matches.
DELETE FROM public.supplier_subcategories supplier_subcategory
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subcategories subcategory
  JOIN public.supplier_categories supplier_category
    ON supplier_category.supplier_id = supplier_subcategory.supplier_id
   AND supplier_category.category_id = subcategory.category_id
  WHERE subcategory.id = supplier_subcategory.subcategory_id
);

-- Defense-in-depth reconciliation for any active match left from stale data.
UPDATE public.matches match_row
SET status = 'inactive', updated_at = now()
FROM public.requests request_row
WHERE match_row.request_id = request_row.id
  AND match_row.status = 'active'
  AND (
    request_row.status <> 'open'
    OR request_row.subcategory_id IS NULL
    OR NOT public._is_supplier_profile_complete(match_row.supplier_id)
    OR NOT public._supplier_serves_subcategory(
      match_row.supplier_id,
      request_row.subcategory_id
    )
  );

-- The legacy admin seed RPC validated only the broad category, while automatic
-- Gate 2 matching requires the exact request subcategory. Keep the RPC aligned
-- with the same authorization invariant.
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
  _request_status public.request_status;
  _request_subcategory uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admin may create matches' USING ERRCODE = '42501';
  END IF;

  IF NOT public.has_role(_supplier_id, 'supplier') THEN
    RAISE EXCEPTION 'Target user is not a supplier' USING ERRCODE = '22000';
  END IF;

  SELECT status, subcategory_id
  INTO _request_status, _request_subcategory
  FROM public.requests
  WHERE id = _request_id;

  IF _request_status IS NULL THEN
    RAISE EXCEPTION 'Unknown request' USING ERRCODE = '22000';
  END IF;
  IF _request_status <> 'open' THEN
    RAISE EXCEPTION 'Request is not open' USING ERRCODE = '22000';
  END IF;
  IF _request_subcategory IS NULL THEN
    RAISE EXCEPTION 'Request has no matchable subcategory' USING ERRCODE = '22000';
  END IF;
  IF NOT public._is_supplier_profile_complete(_supplier_id) THEN
    RAISE EXCEPTION 'Supplier profile is incomplete' USING ERRCODE = '22000';
  END IF;
  IF NOT public._supplier_serves_subcategory(
    _supplier_id,
    _request_subcategory
  ) THEN
    RAISE EXCEPTION 'Supplier does not serve this subcategory' USING ERRCODE = '22000';
  END IF;

  INSERT INTO public.matches (supplier_id, request_id, status)
  VALUES (_supplier_id, _request_id, 'active')
  ON CONFLICT (supplier_id, request_id)
  DO UPDATE SET status = 'active', updated_at = now()
  RETURNING id INTO _match_id;

  RETURN _match_id;
END;
$$;

ALTER FUNCTION public.admin_create_match(uuid, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.admin_create_match(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_match(uuid, uuid)
  TO authenticated, service_role;

-- Limit direct client updates to business fields. System-maintained columns
-- remain writable by SECURITY DEFINER triggers, not authenticated clients.
REVOKE UPDATE ON public.requests FROM authenticated;
GRANT UPDATE (title, description, status) ON public.requests TO authenticated;

REVOKE UPDATE ON public.offers FROM authenticated;
GRANT UPDATE (price, estimated_days, message, status) ON public.offers TO authenticated;
