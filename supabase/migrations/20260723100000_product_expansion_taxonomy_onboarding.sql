-- Product expansion: governed Service taxonomy, structured service areas, and
-- a database-backed Supplier onboarding transition. Existing technical
-- subcategories remain the governed Profession level.

-- -------------------------------------------------------------------------
-- Governed taxonomy: Category -> existing Subcategory (Profession) -> Service
-- -------------------------------------------------------------------------

CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subcategory_id uuid NOT NULL REFERENCES public.subcategories(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name_he text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subcategory_id, slug),
  CHECK (char_length(btrim(slug)) BETWEEN 1 AND 80),
  CHECK (char_length(btrim(name_he)) BETWEEN 1 AND 120)
);

CREATE INDEX services_subcategory_sort_idx
  ON public.services (subcategory_id, sort_order, name_he);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active services"
  ON public.services FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert services"
  ON public.services FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update services"
  ON public.services FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete services"
  ON public.services FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.supplier_subcategories
  ADD COLUMN is_primary boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX supplier_subcategories_one_primary_idx
  ON public.supplier_subcategories (supplier_id)
  WHERE is_primary;

CREATE TABLE public.supplier_services (
  supplier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (supplier_id, service_id),
  FOREIGN KEY (supplier_id, subcategory_id)
    REFERENCES public.supplier_subcategories(supplier_id, subcategory_id)
    ON DELETE CASCADE
);

CREATE INDEX supplier_services_service_idx
  ON public.supplier_services (service_id, supplier_id);

CREATE OR REPLACE FUNCTION public.validate_supplier_service()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.services service_row
    WHERE service_row.id = NEW.service_id
      AND service_row.subcategory_id = NEW.subcategory_id
      AND service_row.is_active
  ) THEN
    RAISE EXCEPTION 'Service does not belong to the selected profession'
      USING ERRCODE = '22000';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_supplier_service()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER supplier_services_validate_bi
  BEFORE INSERT ON public.supplier_services
  FOR EACH ROW EXECUTE FUNCTION public.validate_supplier_service();

GRANT SELECT, INSERT, DELETE ON public.supplier_services TO authenticated;
GRANT ALL ON public.supplier_services TO service_role;

ALTER TABLE public.supplier_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers read own services"
  ON public.supplier_services FOR SELECT TO authenticated
  USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers insert own services"
  ON public.supplier_services FOR INSERT TO authenticated
  WITH CHECK (
    supplier_id = auth.uid()
    AND public.has_role(auth.uid(), 'supplier')
  );

CREATE POLICY "Suppliers delete own services"
  ON public.supplier_services FOR DELETE TO authenticated
  USING (supplier_id = auth.uid());

DROP POLICY IF EXISTS "Suppliers update own professions"
  ON public.supplier_subcategories;
CREATE POLICY "Suppliers update own professions"
  ON public.supplier_subcategories FOR UPDATE TO authenticated
  USING (supplier_id = auth.uid())
  WITH CHECK (
    supplier_id = auth.uid()
    AND public.has_role(auth.uid(), 'supplier')
  );

REVOKE INSERT, UPDATE ON public.supplier_subcategories FROM authenticated;
GRANT INSERT (supplier_id, subcategory_id, is_primary)
  ON public.supplier_subcategories TO authenticated;
GRANT UPDATE (is_primary)
  ON public.supplier_subcategories TO authenticated;

REVOKE INSERT ON public.supplier_services FROM authenticated;
GRANT INSERT (supplier_id, subcategory_id, service_id)
  ON public.supplier_services TO authenticated;

-- -------------------------------------------------------------------------
-- Governed structured service areas. No production geography is seeded here.
-- -------------------------------------------------------------------------

CREATE TABLE public.service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_he text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(btrim(slug)) BETWEEN 1 AND 80),
  CHECK (char_length(btrim(name_he)) BETWEEN 1 AND 120)
);

CREATE INDEX service_areas_active_sort_idx
  ON public.service_areas (is_active, sort_order, name_he);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_areas TO authenticated;
GRANT ALL ON public.service_areas TO service_role;

ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active service areas"
  ON public.service_areas FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert service areas"
  ON public.service_areas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update service areas"
  ON public.service_areas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete service areas"
  ON public.service_areas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.supplier_service_areas (
  supplier_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_area_id uuid NOT NULL REFERENCES public.service_areas(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (supplier_id, service_area_id)
);

CREATE INDEX supplier_service_areas_area_idx
  ON public.supplier_service_areas (service_area_id, supplier_id);

GRANT SELECT, INSERT, DELETE ON public.supplier_service_areas TO authenticated;
GRANT ALL ON public.supplier_service_areas TO service_role;

ALTER TABLE public.supplier_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers read own service areas"
  ON public.supplier_service_areas FOR SELECT TO authenticated
  USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers insert own service areas"
  ON public.supplier_service_areas FOR INSERT TO authenticated
  WITH CHECK (
    supplier_id = auth.uid()
    AND public.has_role(auth.uid(), 'supplier')
    AND EXISTS (
      SELECT 1
      FROM public.service_areas area_row
      WHERE area_row.id = service_area_id
        AND area_row.is_active
    )
  );

CREATE POLICY "Suppliers delete own service areas"
  ON public.supplier_service_areas FOR DELETE TO authenticated
  USING (supplier_id = auth.uid());

REVOKE INSERT ON public.supplier_service_areas FROM authenticated;
GRANT INSERT (supplier_id, service_area_id)
  ON public.supplier_service_areas TO authenticated;

-- -------------------------------------------------------------------------
-- Supplier profile fields and stable legacy/current onboarding policy.
-- -------------------------------------------------------------------------

ALTER TABLE public.supplier_profiles
  ADD COLUMN business_type text,
  ADD COLUMN base_city text,
  ADD COLUMN service_mode text,
  ADD COLUMN max_travel_km integer,
  ADD COLUMN remote_available boolean;

ALTER TABLE public.supplier_profiles
  ADD CONSTRAINT supplier_profiles_business_type_check
    CHECK (
      business_type IS NULL
      OR char_length(btrim(business_type)) BETWEEN 2 AND 80
    ) NOT VALID,
  ADD CONSTRAINT supplier_profiles_base_city_check
    CHECK (
      base_city IS NULL
      OR char_length(btrim(base_city)) BETWEEN 2 AND 80
    ) NOT VALID,
  ADD CONSTRAINT supplier_profiles_service_mode_check
    CHECK (
      service_mode IS NULL
      OR service_mode IN ('on_site', 'remote', 'both')
    ) NOT VALID,
  ADD CONSTRAINT supplier_profiles_max_travel_check
    CHECK (
      max_travel_km IS NULL
      OR max_travel_km BETWEEN 0 AND 500
    ) NOT VALID;

REVOKE INSERT, UPDATE ON public.supplier_profiles FROM authenticated;
GRANT INSERT (
  user_id,
  business_name,
  description,
  service_area,
  starting_price_ils,
  years_experience,
  portfolio_links,
  business_type,
  base_city,
  service_mode,
  max_travel_km,
  remote_available
) ON public.supplier_profiles TO authenticated;
GRANT UPDATE (
  user_id,
  business_name,
  description,
  service_area,
  starting_price_ils,
  years_experience,
  portfolio_links,
  business_type,
  base_city,
  service_mode,
  max_travel_km,
  remote_available
) ON public.supplier_profiles TO authenticated;

CREATE TABLE public.supplier_onboarding_state (
  supplier_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  eligibility_policy text NOT NULL
    CHECK (eligibility_policy IN ('legacy', 'current')),
  current_stage integer NOT NULL DEFAULT 1
    CHECK (current_stage BETWEEN 1 AND 6),
  submitted_at timestamptz,
  notice_dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER supplier_onboarding_state_updated_at
  BEFORE UPDATE ON public.supplier_onboarding_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Every Supplier role that exists at migration time is protected by the
-- transition policy. This does not alter Matches, Offers, or profile data.
INSERT INTO public.supplier_onboarding_state (supplier_id, eligibility_policy)
SELECT role_row.user_id, 'legacy'
FROM public.user_roles role_row
WHERE role_row.role = 'supplier'
ON CONFLICT (supplier_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.initialize_supplier_onboarding_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'supplier' THEN
    INSERT INTO public.supplier_onboarding_state (
      supplier_id,
      eligibility_policy
    )
    VALUES (NEW.user_id, 'current')
    ON CONFLICT (supplier_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.initialize_supplier_onboarding_state() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.initialize_supplier_onboarding_state()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER user_roles_initialize_supplier_onboarding_ai
  AFTER INSERT ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.initialize_supplier_onboarding_state();

GRANT SELECT ON public.supplier_onboarding_state TO authenticated;
GRANT ALL ON public.supplier_onboarding_state TO service_role;
GRANT UPDATE (current_stage, notice_dismissed_at)
  ON public.supplier_onboarding_state TO authenticated;

ALTER TABLE public.supplier_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers read own onboarding state"
  ON public.supplier_onboarding_state FOR SELECT TO authenticated
  USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers update own onboarding progress"
  ON public.supplier_onboarding_state FOR UPDATE TO authenticated
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

CREATE OR REPLACE FUNCTION public._is_legacy_supplier_profile_complete(
  _supplier_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.supplier_profiles profile_row
      WHERE profile_row.user_id = _supplier_id
        AND char_length(btrim(COALESCE(profile_row.business_name, '')))
          BETWEEN 2 AND 80
        AND char_length(btrim(COALESCE(profile_row.description, '')))
          >= 1
        AND char_length(COALESCE(profile_row.description, ''))
          <= 1000
        AND char_length(btrim(COALESCE(profile_row.service_area, '')))
          BETWEEN 2 AND 200
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_categories category_row
      WHERE category_row.supplier_id = _supplier_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_subcategories profession_row
      JOIN public.subcategories subcategory_row
        ON subcategory_row.id = profession_row.subcategory_id
      JOIN public.supplier_categories category_row
        ON category_row.supplier_id = profession_row.supplier_id
       AND category_row.category_id = subcategory_row.category_id
      WHERE profession_row.supplier_id = _supplier_id
    );
$$;

ALTER FUNCTION public._is_legacy_supplier_profile_complete(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public._is_legacy_supplier_profile_complete(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._is_legacy_supplier_profile_complete(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public._is_current_supplier_onboarding_data_complete(
  _supplier_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.supplier_profiles profile_row
      WHERE profile_row.user_id = _supplier_id
        AND char_length(btrim(COALESCE(profile_row.business_name, '')))
          BETWEEN 2 AND 80
        AND char_length(btrim(COALESCE(profile_row.description, '')))
          BETWEEN 20 AND 1000
        AND char_length(btrim(COALESCE(profile_row.business_type, '')))
          BETWEEN 2 AND 80
        AND char_length(btrim(COALESCE(profile_row.base_city, '')))
          BETWEEN 2 AND 80
        AND profile_row.service_mode IN ('on_site', 'remote', 'both')
        AND profile_row.remote_available IS NOT NULL
        AND (
          profile_row.service_mode = 'remote'
          OR profile_row.max_travel_km BETWEEN 0 AND 500
        )
        AND (
          profile_row.service_mode = 'on_site'
          OR profile_row.remote_available
        )
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_categories category_row
      WHERE category_row.supplier_id = _supplier_id
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_subcategories profession_row
      WHERE profession_row.supplier_id = _supplier_id
        AND profession_row.is_primary
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_services service_row
      WHERE service_row.supplier_id = _supplier_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.supplier_profiles profile_row
        WHERE profile_row.user_id = _supplier_id
          AND profile_row.service_mode = 'remote'
      )
      OR EXISTS (
        SELECT 1
        FROM public.supplier_service_areas area_row
        WHERE area_row.supplier_id = _supplier_id
      )
    );
$$;

ALTER FUNCTION public._is_current_supplier_onboarding_data_complete(uuid)
  OWNER TO postgres;
REVOKE ALL ON FUNCTION public._is_current_supplier_onboarding_data_complete(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._is_current_supplier_onboarding_data_complete(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public._is_supplier_profile_complete(
  _supplier_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(
      (
        SELECT state_row.eligibility_policy
        FROM public.supplier_onboarding_state state_row
        WHERE state_row.supplier_id = _supplier_id
      ),
      'current'
    ) = 'legacy'
      THEN public._is_legacy_supplier_profile_complete(_supplier_id)
    ELSE
      EXISTS (
        SELECT 1
        FROM public.supplier_onboarding_state state_row
        WHERE state_row.supplier_id = _supplier_id
          AND state_row.eligibility_policy = 'current'
          AND state_row.submitted_at IS NOT NULL
      )
      AND public._is_current_supplier_onboarding_data_complete(_supplier_id)
  END;
$$;

ALTER FUNCTION public._is_supplier_profile_complete(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._is_supplier_profile_complete(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._is_supplier_profile_complete(uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.submit_supplier_onboarding()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL
    OR NOT public.has_role(auth.uid(), 'supplier') THEN
    RAISE EXCEPTION 'Supplier authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.supplier_onboarding_state state_row
    WHERE state_row.supplier_id = auth.uid()
      AND state_row.eligibility_policy = 'current'
  ) THEN
    RAISE EXCEPTION 'Only current-policy suppliers submit onboarding'
      USING ERRCODE = '22000';
  END IF;

  IF NOT public._is_current_supplier_onboarding_data_complete(auth.uid()) THEN
    RAISE EXCEPTION 'Supplier onboarding is incomplete'
      USING ERRCODE = '22000';
  END IF;

  UPDATE public.supplier_onboarding_state
  SET submitted_at = COALESCE(submitted_at, now()),
      current_stage = 6,
      updated_at = now()
  WHERE supplier_id = auth.uid();

  PERFORM public._generate_matches_for_supplier(auth.uid());
  RETURN true;
END;
$$;

ALTER FUNCTION public.submit_supplier_onboarding() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_supplier_onboarding()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_supplier_onboarding()
  TO authenticated, service_role;
