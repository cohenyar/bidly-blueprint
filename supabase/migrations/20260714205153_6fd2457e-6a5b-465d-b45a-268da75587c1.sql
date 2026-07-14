
-- Gate 1: Supplier Profile, Supplier Categories, Supplier Subcategories

-- ============ supplier_profiles ============
CREATE TABLE public.supplier_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  service_area text NOT NULL DEFAULT '',
  starting_price_ils integer,
  years_experience integer,
  portfolio_links text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_profiles TO authenticated;
GRANT ALL ON public.supplier_profiles TO service_role;

ALTER TABLE public.supplier_profiles ENABLE ROW LEVEL SECURITY;

-- Suppliers may read/write ONLY their own profile.
CREATE POLICY "Supplier reads own profile"
  ON public.supplier_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'supplier'));

CREATE POLICY "Supplier inserts own profile"
  ON public.supplier_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'supplier'));

CREATE POLICY "Supplier updates own profile"
  ON public.supplier_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'supplier'))
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'supplier'));

-- No DELETE policy: profiles remain (cascade only via auth.users deletion).

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_supplier_profile()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  link text;
BEGIN
  IF char_length(btrim(NEW.business_name)) < 2 OR char_length(NEW.business_name) > 80 THEN
    RAISE EXCEPTION 'Invalid business_name length' USING ERRCODE = '22000';
  END IF;

  IF NEW.description IS NULL THEN NEW.description := ''; END IF;
  IF char_length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Description too long' USING ERRCODE = '22000';
  END IF;

  IF NEW.service_area IS NULL THEN NEW.service_area := ''; END IF;
  IF char_length(NEW.service_area) > 200 THEN
    RAISE EXCEPTION 'Service area too long' USING ERRCODE = '22000';
  END IF;

  IF NEW.starting_price_ils IS NOT NULL AND NEW.starting_price_ils < 0 THEN
    RAISE EXCEPTION 'starting_price_ils must be non-negative' USING ERRCODE = '22000';
  END IF;

  IF NEW.years_experience IS NOT NULL AND (NEW.years_experience < 0 OR NEW.years_experience > 100) THEN
    RAISE EXCEPTION 'years_experience out of range' USING ERRCODE = '22000';
  END IF;

  IF NEW.portfolio_links IS NULL THEN NEW.portfolio_links := '{}'; END IF;
  IF array_length(NEW.portfolio_links, 1) > 5 THEN
    RAISE EXCEPTION 'Max 5 portfolio_links' USING ERRCODE = '22000';
  END IF;
  IF NEW.portfolio_links IS NOT NULL THEN
    FOREACH link IN ARRAY NEW.portfolio_links LOOP
      IF link !~* '^https?://[^\s]+$' OR char_length(link) > 500 THEN
        RAISE EXCEPTION 'Invalid portfolio link' USING ERRCODE = '22000';
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_supplier_profile() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER supplier_profiles_validate
  BEFORE INSERT OR UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_profile();

CREATE TRIGGER supplier_profiles_updated_at
  BEFORE UPDATE ON public.supplier_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ supplier_categories ============
CREATE TABLE public.supplier_categories (
  supplier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (supplier_id, category_id)
);

CREATE INDEX supplier_categories_category_idx ON public.supplier_categories(category_id);

GRANT SELECT, INSERT, DELETE ON public.supplier_categories TO authenticated;
GRANT ALL ON public.supplier_categories TO service_role;

ALTER TABLE public.supplier_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier reads own categories"
  ON public.supplier_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id AND public.has_role(auth.uid(), 'supplier'));

CREATE POLICY "Supplier inserts own categories"
  ON public.supplier_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = supplier_id
    AND public.has_role(auth.uid(), 'supplier')
    AND EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_id AND c.is_active)
  );

CREATE POLICY "Supplier deletes own categories"
  ON public.supplier_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = supplier_id AND public.has_role(auth.uid(), 'supplier'));

-- ============ supplier_subcategories ============
CREATE TABLE public.supplier_subcategories (
  supplier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (supplier_id, subcategory_id)
);

CREATE INDEX supplier_subcategories_subcategory_idx ON public.supplier_subcategories(subcategory_id);

GRANT SELECT, INSERT, DELETE ON public.supplier_subcategories TO authenticated;
GRANT ALL ON public.supplier_subcategories TO service_role;

ALTER TABLE public.supplier_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supplier reads own subcategories"
  ON public.supplier_subcategories FOR SELECT
  TO authenticated
  USING (auth.uid() = supplier_id AND public.has_role(auth.uid(), 'supplier'));

CREATE POLICY "Supplier inserts own subcategories"
  ON public.supplier_subcategories FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = supplier_id
    AND public.has_role(auth.uid(), 'supplier')
    AND EXISTS (SELECT 1 FROM public.subcategories s WHERE s.id = subcategory_id AND s.is_active)
  );

CREATE POLICY "Supplier deletes own subcategories"
  ON public.supplier_subcategories FOR DELETE
  TO authenticated
  USING (auth.uid() = supplier_id AND public.has_role(auth.uid(), 'supplier'));

-- Enforce that a supplier's subcategory belongs to one of their categories.
CREATE OR REPLACE FUNCTION public.validate_supplier_subcategory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _cat uuid;
BEGIN
  SELECT category_id INTO _cat FROM public.subcategories WHERE id = NEW.subcategory_id;
  IF _cat IS NULL THEN
    RAISE EXCEPTION 'Unknown subcategory' USING ERRCODE = '22000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.supplier_categories
     WHERE supplier_id = NEW.supplier_id AND category_id = _cat
  ) THEN
    RAISE EXCEPTION 'Supplier must own the parent category first' USING ERRCODE = '22000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_supplier_subcategory() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER supplier_subcategories_validate
  BEFORE INSERT ON public.supplier_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_subcategory();
