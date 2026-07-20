-- Supplier Phase Gate 6 hardening.
-- Restrict browser writes to business inputs and enforce upload/offer invariants
-- at the database boundary. No workflow or product behavior is added here.

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
  AND public.has_role(auth.uid(), 'supplier')
  AND public.has_active_match(request_id)
  AND EXISTS (
    SELECT 1
    FROM public.requests request_row
    WHERE request_row.id = offers.request_id
      AND request_row.status = 'open'
  )
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
