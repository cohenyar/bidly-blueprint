-- Supplier portfolio images use a private, owner-scoped Storage bucket. The
-- existing supplier_profiles.portfolio_links array remains backward-compatible:
-- HTTPS values are external links and relative UUID-prefixed values are Storage
-- object paths owned by the same Supplier.

BEGIN;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'supplier-portfolio-images',
  'supplier-portfolio-images',
  false,
  15 * 1024 * 1024,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Suppliers upload own portfolio images"
  ON storage.objects;
CREATE POLICY "Suppliers upload own portfolio images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'supplier')
  );

DROP POLICY IF EXISTS "Suppliers read own portfolio images"
  ON storage.objects;
CREATE POLICY "Suppliers read own portfolio images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'supplier-portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'supplier')
  );

DROP POLICY IF EXISTS "Suppliers delete own portfolio images"
  ON storage.objects;
CREATE POLICY "Suppliers delete own portfolio images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'supplier-portfolio-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND public.has_role(auth.uid(), 'supplier')
  );

CREATE OR REPLACE FUNCTION public.validate_supplier_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  link text;
BEGIN
  IF char_length(btrim(NEW.business_name)) < 2
    OR char_length(NEW.business_name) > 80 THEN
    RAISE EXCEPTION 'Invalid business_name length'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.description IS NULL THEN
    NEW.description := '';
  END IF;
  IF char_length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Description too long'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.service_area IS NULL THEN
    NEW.service_area := '';
  END IF;
  IF char_length(NEW.service_area) > 200 THEN
    RAISE EXCEPTION 'Service area too long'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.starting_price_ils IS NOT NULL
    AND NEW.starting_price_ils < 0 THEN
    RAISE EXCEPTION 'starting_price_ils must be non-negative'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.years_experience IS NOT NULL
    AND (
      NEW.years_experience < 0
      OR NEW.years_experience > 100
    ) THEN
    RAISE EXCEPTION 'years_experience out of range'
      USING ERRCODE = '22000';
  END IF;

  IF NEW.portfolio_links IS NULL THEN
    NEW.portfolio_links := '{}';
  END IF;
  IF array_length(NEW.portfolio_links, 1) > 5 THEN
    RAISE EXCEPTION 'Max 5 portfolio_links'
      USING ERRCODE = '22000';
  END IF;

  FOREACH link IN ARRAY NEW.portfolio_links LOOP
    IF char_length(link) > 500 THEN
      RAISE EXCEPTION 'Invalid portfolio source'
        USING ERRCODE = '22000';
    END IF;

    -- External portfolio sources remain HTTPS links.
    IF link ~* '^https://[^/[:space:]]+(/[^[:space:]]*)?$' THEN
      CONTINUE;
    END IF;

    -- Uploaded images use the existing relative Storage path convention and
    -- must remain inside the profile owner's UUID folder.
    IF split_part(link, '/', 1) = NEW.user_id::text
      AND link ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[A-Za-z0-9._-]+$'
      AND link !~ '(^|/)\.\.(/|$)' THEN
      CONTINUE;
    END IF;

    RAISE EXCEPTION 'Invalid portfolio source'
      USING ERRCODE = '22000';
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_supplier_profile()
  FROM PUBLIC, anon, authenticated;

COMMIT;
