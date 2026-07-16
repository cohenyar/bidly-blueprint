-- Gate 4: Secure Supplier Offer INSERT restoration
-- Adds ONLY the minimum INSERT policy on public.offers.
-- Authorization is enforced by RLS; data integrity remains with existing triggers/constraints.

DROP POLICY IF EXISTS "Supplier can insert own offer when matched" ON public.offers;

CREATE POLICY "Supplier can insert own offer when matched"
ON public.offers
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND supplier_id = auth.uid()
  AND public.has_role(auth.uid(), 'supplier')
  AND public.has_active_match(request_id)
  AND EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = offers.request_id
      AND r.status = 'open'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.request_id = offers.request_id
      AND o.supplier_id = auth.uid()
  )
);