-- Expose only the Supplier profile fields already approved for contextual
-- Customer offer comparison. Portfolio access remains private and is limited
-- to the owner of a Request that received an Offer from that Supplier.
BEGIN;

DROP FUNCTION public.get_customer_request_offers(uuid);

CREATE FUNCTION public.get_customer_request_offers(
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
  years_experience integer,
  portfolio_links text[]
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
    profile_row.years_experience,
    COALESCE(profile_row.portfolio_links, '{}'::text[])
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

DROP POLICY IF EXISTS "Customers read contextual supplier portfolio images"
  ON storage.objects;
CREATE POLICY "Customers read contextual supplier portfolio images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'supplier-portfolio-images'
    AND public.has_role(auth.uid(), 'customer')
    AND EXISTS (
      SELECT 1
      FROM public.requests request_row
      JOIN public.offers offer_row
        ON offer_row.request_id = request_row.id
      JOIN public.supplier_profiles profile_row
        ON profile_row.user_id = offer_row.supplier_id
      WHERE request_row.customer_id = auth.uid()
        AND offer_row.supplier_id::text = (storage.foldername(name))[1]
        AND name = ANY(profile_row.portfolio_links)
    )
  );

COMMIT;
