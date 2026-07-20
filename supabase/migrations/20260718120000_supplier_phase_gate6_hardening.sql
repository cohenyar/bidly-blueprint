-- Supplier Phase Gate 6 hardening.
-- Restrict browser writes to business inputs and enforce upload/offer invariants
-- at the database boundary. No workflow or product behavior is added here.

-- RLS controls rows, not columns. Suppliers previously had direct SELECT on a
-- matched request row and could ask PostgREST for customer_id, offers_count, or
-- selected_offer_id even though the UI intentionally omitted those fields.
-- Expose only the Gate 5 request projection through a caller-scoped function.
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
    subcategory_row.id,
    subcategory_row.name_he,
    match_row.created_at
  FROM public.matches match_row
  JOIN public.requests request_row
    ON request_row.id = match_row.request_id
  JOIN public.categories category_row
    ON category_row.id = request_row.category_id
  LEFT JOIN public.subcategories subcategory_row
    ON subcategory_row.id = request_row.subcategory_id
  WHERE auth.uid() IS NOT NULL
    AND public.has_role(auth.uid(), 'supplier')
    AND match_row.supplier_id = auth.uid()
    AND match_row.status = 'active'
    AND request_row.status = 'open'
    AND (_request_id IS NULL OR request_row.id = _request_id)
  ORDER BY match_row.created_at DESC;
$$;

ALTER FUNCTION public.get_active_supplier_requests(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_active_supplier_requests(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_active_supplier_requests(uuid)
  TO authenticated, service_role;

DROP POLICY IF EXISTS "Suppliers view matched requests" ON public.requests;

-- Offer submission still needs a request-status check after direct Supplier
-- request SELECT is removed. Keep that check behind a caller-scoped helper.
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
    AND EXISTS (
      SELECT 1
      FROM public.matches match_row
      JOIN public.requests request_row
        ON request_row.id = match_row.request_id
      WHERE match_row.supplier_id = auth.uid()
        AND match_row.request_id = _request_id
        AND match_row.status = 'active'
        AND request_row.status = 'open'
    );
$$;

ALTER FUNCTION public.can_submit_offer(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.can_submit_offer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_submit_offer(uuid)
  TO authenticated, service_role;

-- New offers must always begin in the submitted state. Column privileges below
-- also prevent clients from supplying lifecycle and audit fields directly.
DROP POLICY IF EXISTS "Supplier can insert own offer when matched" ON public.offers;

CREATE POLICY "Supplier can insert own offer when matched"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND supplier_id = auth.uid()
  AND status = 'submitted'
  AND withdrawn_at IS NULL
  AND public.can_submit_offer(request_id)
  AND NOT EXISTS (
    SELECT 1
    FROM public.offers existing_offer
    WHERE existing_offer.request_id = offers.request_id
      AND existing_offer.supplier_id = auth.uid()
  )
);

REVOKE INSERT ON public.offers FROM authenticated;
GRANT INSERT (request_id, supplier_id, price, estimated_days, message)
  ON public.offers TO authenticated;
REVOKE DELETE ON public.offers FROM authenticated;

-- Requests are published immediately by the existing workflow. Defaults own
-- status/timestamps/counters; customers may only provide request content.
REVOKE INSERT ON public.requests FROM authenticated;
GRANT INSERT (
  customer_id,
  category_id,
  subcategory_id,
  title,
  description,
  budget_type,
  budget_min,
  budget_max,
  city
) ON public.requests TO authenticated;

-- Supplier profile upserts may write only profile content. The conflict key is
-- included in UPDATE privileges because PostgREST's upsert assigns it back to
-- the same RLS-protected value.
REVOKE INSERT, UPDATE, DELETE ON public.supplier_profiles FROM authenticated;
GRANT INSERT (
  user_id,
  business_name,
  description,
  service_area,
  starting_price_ils,
  years_experience,
  portfolio_links
) ON public.supplier_profiles TO authenticated;
GRANT UPDATE (
  user_id,
  business_name,
  description,
  service_area,
  starting_price_ils,
  years_experience,
  portfolio_links
) ON public.supplier_profiles TO authenticated;

REVOKE INSERT ON public.supplier_categories FROM authenticated;
GRANT INSERT (supplier_id, category_id)
  ON public.supplier_categories TO authenticated;

REVOKE INSERT ON public.supplier_subcategories FROM authenticated;
GRANT INSERT (supplier_id, subcategory_id)
  ON public.supplier_subcategories TO authenticated;

-- The notification guard trigger already rejects other changes. Column grants
-- make the intended read-receipt-only API explicit as defense in depth.
REVOKE UPDATE ON public.notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.notifications TO authenticated;

-- Attachment metadata must match the private bucket contract. NOT VALID keeps
-- the migration deployable with legacy rows while enforcing every new write.
ALTER TABLE public.request_attachments
  ADD CONSTRAINT request_attachments_gate6_size_check
  CHECK (size_bytes <= 15 * 1024 * 1024) NOT VALID,
  ADD CONSTRAINT request_attachments_gate6_mime_check
  CHECK (
    mime_type IN (
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf'
    )
  ) NOT VALID,
  ADD CONSTRAINT request_attachments_gate6_name_check
  CHECK (
    char_length(btrim(file_name)) BETWEEN 1 AND 255
    AND file_name !~ '[[:cntrl:]]'
  ) NOT VALID,
  ADD CONSTRAINT request_attachments_gate6_path_check
  CHECK (
    char_length(storage_path) BETWEEN 1 AND 1024
    AND split_part(storage_path, '/', 2) = request_id::text
    AND storage_path !~ '(^|/)\.\.(/|$)'
  ) NOT VALID;

REVOKE INSERT ON public.request_attachments FROM authenticated;
GRANT INSERT (request_id, storage_path, file_name, mime_type, size_bytes)
  ON public.request_attachments TO authenticated;
REVOKE UPDATE ON public.request_attachments FROM authenticated;

-- Enforce the same limits for direct Storage API uploads when the bucket is
-- present. The bucket remains private and existing object policies are intact.
UPDATE storage.buckets
SET
  file_size_limit = 15 * 1024 * 1024,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]::text[]
WHERE id = 'request-attachments';
