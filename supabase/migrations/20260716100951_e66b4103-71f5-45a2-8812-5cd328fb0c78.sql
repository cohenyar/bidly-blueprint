
-- Gate 3: Match-aware RLS for Service Providers.
-- Deny-by-default is preserved: RLS is already enabled on all target tables,
-- and we ONLY add narrowly scoped SELECT policies. Nothing existing is removed,
-- weakened, or replaced.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) public.requests — supplier SELECT gated by an active match owned by caller
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Suppliers view matched requests" ON public.requests;
CREATE POLICY "Suppliers view matched requests"
  ON public.requests
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'supplier')
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.request_id  = requests.id
        AND m.supplier_id = auth.uid()
        AND m.status      = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) public.request_attachments — supplier SELECT gated by an active match
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Suppliers view attachments on matched requests"
  ON public.request_attachments;
CREATE POLICY "Suppliers view attachments on matched requests"
  ON public.request_attachments
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'supplier')
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.request_id  = request_attachments.request_id
        AND m.supplier_id = auth.uid()
        AND m.status      = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) storage.objects — supplier SELECT on request-attachments bucket
--    Path convention: {customer_uid}/{request_id}/{filename}
--    Suppliers can read a file iff they have an active match for the request
--    identified by folder position 2. Bucket remains private; INSERT/DELETE
--    remain customer-only via the existing policies.
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Suppliers read matched request files" ON storage.objects;
CREATE POLICY "Suppliers read matched request files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'request-attachments'
    AND public.has_role(auth.uid(), 'supplier')
    AND EXISTS (
      SELECT 1
      FROM public.matches m
      WHERE m.request_id::text = (storage.foldername(name))[2]
        AND m.supplier_id      = auth.uid()
        AND m.status           = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Performance: the existing partial index
--    matches_active_supplier_request_idx (supplier_id, request_id)
--      WHERE status = 'active'
--    already services all three EXISTS lookups above. No new index required.
-- ─────────────────────────────────────────────────────────────────────────────
