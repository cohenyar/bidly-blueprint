
-- =========================================================================
-- Bidly core schema: categories, subcategories, requests, attachments, offers
-- =========================================================================

-- ---------- ENUMS -------------------------------------------------------

CREATE TYPE public.request_status AS ENUM ('open', 'awarded', 'closed', 'cancelled');
CREATE TYPE public.offer_status   AS ENUM ('submitted', 'withdrawn', 'selected', 'rejected');
CREATE TYPE public.budget_type    AS ENUM ('fixed', 'range', 'open');

-- ---------- CATEGORIES --------------------------------------------------

CREATE TABLE public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name_he     TEXT NOT NULL,
  icon        TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active categories"
  ON public.categories FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage categories - insert"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage categories - update"
  ON public.categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage categories - delete"
  ON public.categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- SUBCATEGORIES ----------------------------------------------

CREATE TABLE public.subcategories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug         TEXT NOT NULL,
  name_he      TEXT NOT NULL,
  sort_order   INT  NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, slug)
);

CREATE INDEX idx_subcategories_category_sort
  ON public.subcategories (category_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subcategories TO authenticated;
GRANT ALL ON public.subcategories TO service_role;

ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active subcategories"
  ON public.subcategories FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subcategories - insert"
  ON public.subcategories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subcategories - update"
  ON public.subcategories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage subcategories - delete"
  ON public.subcategories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ---------- REQUESTS ----------------------------------------------------

CREATE TABLE public.requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id        UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  subcategory_id     UUID REFERENCES public.subcategories(id) ON DELETE RESTRICT,
  title              TEXT NOT NULL,
  description        TEXT NOT NULL,
  budget_type        public.budget_type NOT NULL DEFAULT 'open',
  budget_min         INT,
  budget_max         INT,
  city               TEXT NOT NULL,
  status             public.request_status NOT NULL DEFAULT 'open',
  offers_count       INT NOT NULL DEFAULT 0,
  selected_offer_id  UUID, -- FK added after offers table exists
  published_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_requests_customer_status_created
  ON public.requests (customer_id, status, created_at DESC);
CREATE INDEX idx_requests_status_category_created
  ON public.requests (status, category_id, created_at DESC);
CREATE INDEX idx_requests_category_subcategory
  ON public.requests (category_id, subcategory_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.requests TO authenticated;
GRANT ALL ON public.requests TO service_role;

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Customer sees own requests
CREATE POLICY "Customers view own requests"
  ON public.requests FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

-- Suppliers currently have NO access. A future migration will add
-- supplier-category matched read access when supplier_categories exists.

CREATE POLICY "Customers create own requests"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND public.has_role(auth.uid(), 'customer')
    AND status = 'open'
  );

CREATE POLICY "Customers update own requests"
  ON public.requests FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers delete own open request with no offers"
  ON public.requests FOR DELETE TO authenticated
  USING (
    auth.uid() = customer_id
    AND status = 'open'
    AND offers_count = 0
  );

-- Validation trigger: title/description length, budget coherence
CREATE OR REPLACE FUNCTION public.validate_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(btrim(NEW.title)) < 3 OR char_length(NEW.title) > 120 THEN
    RAISE EXCEPTION 'Invalid title length' USING ERRCODE = '22000';
  END IF;
  IF char_length(btrim(NEW.description)) < 20 OR char_length(NEW.description) > 4000 THEN
    RAISE EXCEPTION 'Invalid description length' USING ERRCODE = '22000';
  END IF;
  IF char_length(btrim(NEW.city)) < 2 OR char_length(NEW.city) > 80 THEN
    RAISE EXCEPTION 'Invalid city' USING ERRCODE = '22000';
  END IF;

  IF NEW.budget_type = 'fixed' THEN
    IF NEW.budget_min IS NULL OR NEW.budget_max IS NULL OR NEW.budget_min <> NEW.budget_max THEN
      RAISE EXCEPTION 'Fixed budget requires equal min and max' USING ERRCODE = '22000';
    END IF;
    IF NEW.budget_min <= 0 THEN
      RAISE EXCEPTION 'Budget must be positive' USING ERRCODE = '22000';
    END IF;
  ELSIF NEW.budget_type = 'range' THEN
    IF NEW.budget_min IS NULL OR NEW.budget_max IS NULL THEN
      RAISE EXCEPTION 'Range budget requires min and max' USING ERRCODE = '22000';
    END IF;
    IF NEW.budget_min <= 0 OR NEW.budget_max <= 0 OR NEW.budget_min > NEW.budget_max THEN
      RAISE EXCEPTION 'Invalid budget range' USING ERRCODE = '22000';
    END IF;
  ELSE -- 'open'
    IF NEW.budget_min IS NOT NULL OR NEW.budget_max IS NOT NULL THEN
      RAISE EXCEPTION 'Open budget must have null min and max' USING ERRCODE = '22000';
    END IF;
  END IF;

  -- Subcategory must belong to the request's category, if provided
  IF NEW.subcategory_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.subcategories
      WHERE id = NEW.subcategory_id AND category_id = NEW.category_id
    ) THEN
      RAISE EXCEPTION 'Subcategory does not belong to category' USING ERRCODE = '22000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_request_biu
  BEFORE INSERT OR UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_request();

-- Immutability + status transition trigger
CREATE OR REPLACE FUNCTION public.guard_request_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Core fields immutable immediately after creation
  IF NEW.customer_id       <> OLD.customer_id       THEN RAISE EXCEPTION 'customer_id is immutable'; END IF;
  IF NEW.category_id       <> OLD.category_id       THEN RAISE EXCEPTION 'category_id is immutable'; END IF;
  IF NEW.subcategory_id IS DISTINCT FROM OLD.subcategory_id THEN RAISE EXCEPTION 'subcategory_id is immutable'; END IF;
  IF NEW.budget_type       <> OLD.budget_type       THEN RAISE EXCEPTION 'budget_type is immutable'; END IF;
  IF NEW.budget_min IS DISTINCT FROM OLD.budget_min THEN RAISE EXCEPTION 'budget_min is immutable'; END IF;
  IF NEW.budget_max IS DISTINCT FROM OLD.budget_max THEN RAISE EXCEPTION 'budget_max is immutable'; END IF;
  IF NEW.city              <> OLD.city              THEN RAISE EXCEPTION 'city is immutable'; END IF;
  IF NEW.published_at      <> OLD.published_at      THEN RAISE EXCEPTION 'published_at is immutable'; END IF;

  -- Description can be edited only while no offers have arrived
  IF NEW.description <> OLD.description AND OLD.offers_count > 0 THEN
    RAISE EXCEPTION 'Description cannot change after offers arrive';
  END IF;

  -- Status transitions: open -> awarded | cancelled ; awarded -> closed ; terminal: closed, cancelled
  IF NEW.status <> OLD.status THEN
    IF OLD.status = 'open' AND NEW.status NOT IN ('awarded','cancelled') THEN
      RAISE EXCEPTION 'Illegal status transition from %', OLD.status;
    ELSIF OLD.status = 'awarded' AND NEW.status <> 'closed' THEN
      RAISE EXCEPTION 'Illegal status transition from %', OLD.status;
    ELSIF OLD.status IN ('closed','cancelled') THEN
      RAISE EXCEPTION 'Request is terminal (%), cannot change status', OLD.status;
    END IF;

    IF NEW.status IN ('closed','cancelled') AND NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_request_update_bu
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_request_update();

CREATE TRIGGER update_requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- REQUEST ATTACHMENTS ----------------------------------------

CREATE TABLE public.request_attachments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  storage_path  TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INT  NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20 * 1024 * 1024),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_request_attachments_request ON public.request_attachments (request_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.request_attachments TO authenticated;
GRANT ALL ON public.request_attachments TO service_role;

ALTER TABLE public.request_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Attachments follow parent request visibility"
  ON public.request_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
  );

CREATE POLICY "Customer inserts attachments on own request"
  ON public.request_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
        AND r.customer_id = auth.uid()
        AND r.status = 'open'
    )
  );

CREATE POLICY "Customer deletes attachments on own open request"
  ON public.request_attachments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id
        AND r.customer_id = auth.uid()
        AND r.status = 'open'
    )
  );

-- ---------- OFFERS ------------------------------------------------------

CREATE TABLE public.offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  supplier_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price           INT  NOT NULL CHECK (price > 0),
  estimated_days  INT  NOT NULL CHECK (estimated_days BETWEEN 1 AND 365),
  message         TEXT NOT NULL,
  status          public.offer_status NOT NULL DEFAULT 'submitted',
  withdrawn_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, supplier_id)
);

CREATE INDEX idx_offers_request_status_created ON public.offers (request_id, status, created_at DESC);
CREATE INDEX idx_offers_supplier_status_created ON public.offers (supplier_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Two distinct SELECT policies (OR'd by Postgres). A supplier can NEVER see
-- competing offers: their policy filters strictly to supplier_id = auth.uid().
CREATE POLICY "Customer sees offers on own requests"
  ON public.offers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
  );

CREATE POLICY "Supplier sees own offers only"
  ON public.offers FOR SELECT TO authenticated
  USING (auth.uid() = supplier_id);

CREATE POLICY "Supplier inserts own offer on open request"
  ON public.offers FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = supplier_id
    AND public.has_role(auth.uid(), 'supplier')
    AND status = 'submitted'
    AND EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.status = 'open'
    )
  );

-- Supplier revises/withdraws own submitted offer.
-- Customer awards (status -> selected) — enforced by trigger below.
CREATE POLICY "Offer updates: supplier own or customer of request"
  ON public.offers FOR UPDATE TO authenticated
  USING (
    auth.uid() = supplier_id
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = supplier_id
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = request_id AND r.customer_id = auth.uid()
    )
  );

-- Validation for offer content
CREATE OR REPLACE FUNCTION public.validate_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(btrim(NEW.message)) < 20 OR char_length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'Invalid offer message length' USING ERRCODE = '22000';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_offer_biu
  BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.validate_offer();

-- Guard: enforce who can change what, and status transitions
CREATE OR REPLACE FUNCTION public.guard_offer_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  is_customer BOOLEAN;
  is_supplier BOOLEAN;
BEGIN
  IF NEW.request_id  <> OLD.request_id  THEN RAISE EXCEPTION 'request_id is immutable';  END IF;
  IF NEW.supplier_id <> OLD.supplier_id THEN RAISE EXCEPTION 'supplier_id is immutable'; END IF;

  is_supplier := auth.uid() = OLD.supplier_id;
  is_customer := EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = OLD.request_id AND r.customer_id = auth.uid()
  );

  IF NEW.status <> OLD.status THEN
    -- Supplier can only withdraw their own submitted offer
    IF is_supplier AND NEW.status = 'withdrawn' AND OLD.status = 'submitted' THEN
      NEW.withdrawn_at := now();
    -- Customer can select a submitted offer (sibling rejection handled by AFTER trigger)
    ELSIF is_customer AND NEW.status = 'selected' AND OLD.status = 'submitted' THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Illegal offer status transition from % to %', OLD.status, NEW.status;
    END IF;
  ELSE
    -- No status change: only supplier may edit content, and only while submitted
    IF (NEW.price <> OLD.price OR NEW.estimated_days <> OLD.estimated_days OR NEW.message <> OLD.message) THEN
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

CREATE TRIGGER guard_offer_update_bu
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.guard_offer_update();

CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Award trigger: when an offer becomes selected, reject siblings, mark request awarded
CREATE OR REPLACE FUNCTION public.on_offer_awarded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'selected' AND (OLD.status IS DISTINCT FROM 'selected') THEN
    UPDATE public.offers
       SET status = 'rejected'
     WHERE request_id = NEW.request_id
       AND id <> NEW.id
       AND status IN ('submitted');

    UPDATE public.requests
       SET status = 'awarded',
           selected_offer_id = NEW.id
     WHERE id = NEW.request_id
       AND status = 'open';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.on_offer_awarded() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_offer_awarded_au
  AFTER UPDATE OF status ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.on_offer_awarded();

-- Offers counter maintenance
CREATE OR REPLACE FUNCTION public.sync_request_offers_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'submitted' THEN
      UPDATE public.requests SET offers_count = offers_count + 1 WHERE id = NEW.request_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'submitted' THEN
      UPDATE public.requests SET offers_count = GREATEST(offers_count - 1, 0) WHERE id = OLD.request_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'submitted' AND NEW.status <> 'submitted' THEN
      UPDATE public.requests SET offers_count = GREATEST(offers_count - 1, 0) WHERE id = NEW.request_id;
    ELSIF OLD.status <> 'submitted' AND NEW.status = 'submitted' THEN
      UPDATE public.requests SET offers_count = offers_count + 1 WHERE id = NEW.request_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_request_offers_count() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER sync_request_offers_count_aiud
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.sync_request_offers_count();

-- Finally: add deferred FK requests.selected_offer_id -> offers(id)
ALTER TABLE public.requests
  ADD CONSTRAINT requests_selected_offer_fk
  FOREIGN KEY (selected_offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;
