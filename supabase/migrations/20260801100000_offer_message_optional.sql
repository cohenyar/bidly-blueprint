-- Offer details are optional. Keep the existing non-null storage contract by
-- normalizing NULL to an empty string, while preserving the 2,000-character cap.
CREATE OR REPLACE FUNCTION public.validate_offer()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.message := COALESCE(NEW.message, '');

  IF char_length(NEW.message) > 2000 THEN
    RAISE EXCEPTION 'Invalid offer message length' USING ERRCODE = '22000';
  END IF;

  RETURN NEW;
END;
$$;
