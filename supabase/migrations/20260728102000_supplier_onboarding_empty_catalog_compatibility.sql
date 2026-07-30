-- Empty-catalog compatibility for Supplier onboarding. This preserves the
-- hardened taxonomy and profile requirements while allowing onboarding to be
-- submitted when the managed catalog offers no possible selection.

BEGIN;

CREATE OR REPLACE FUNCTION
  public._is_current_supplier_onboarding_data_complete(
    _supplier_id uuid
  )
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH catalog_state AS (
    SELECT
      EXISTS (
        SELECT 1
        FROM public.supplier_subcategories profession_selection
        JOIN public.subcategories profession_row
          ON profession_row.id = profession_selection.subcategory_id
         AND profession_row.is_active
        JOIN public.supplier_categories category_selection
          ON category_selection.supplier_id =
            profession_selection.supplier_id
         AND category_selection.category_id =
           profession_row.category_id
        JOIN public.categories category_row
          ON category_row.id = category_selection.category_id
         AND category_row.is_active
        JOIN public.services service_row
          ON service_row.subcategory_id = profession_row.id
         AND service_row.is_active
        WHERE profession_selection.supplier_id = _supplier_id
      ) AS has_available_services,
      EXISTS (
        SELECT 1
        FROM public.service_areas area_row
        WHERE area_row.is_active
      ) AS has_available_service_areas
  )
  SELECT
    EXISTS (
      SELECT 1
      FROM public.supplier_profiles profile_row
      WHERE profile_row.user_id = _supplier_id
        AND char_length(
          btrim(COALESCE(profile_row.business_name, ''))
        ) BETWEEN 2 AND 80
        AND char_length(
          btrim(COALESCE(profile_row.description, ''))
        ) BETWEEN 20 AND 1000
        AND char_length(
          btrim(COALESCE(profile_row.business_type, ''))
        ) BETWEEN 2 AND 80
        AND char_length(
          btrim(COALESCE(profile_row.base_city, ''))
        ) BETWEEN 2 AND 80
        AND profile_row.service_mode IN (
          'on_site',
          'remote',
          'both'
        )
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
      FROM public.supplier_subcategories profession_selection
      JOIN public.subcategories profession_row
        ON profession_row.id =
          profession_selection.subcategory_id
       AND profession_row.is_active
      JOIN public.supplier_categories category_selection
        ON category_selection.supplier_id =
          profession_selection.supplier_id
       AND category_selection.category_id =
         profession_row.category_id
      JOIN public.categories category_row
        ON category_row.id = category_selection.category_id
       AND category_row.is_active
      WHERE profession_selection.supplier_id = _supplier_id
        AND profession_selection.is_primary
    )
    -- A Service remains mandatory whenever the Supplier's current, valid
    -- profession selections offer at least one active managed Service.
    AND (
      NOT catalog_state.has_available_services
      OR public._supplier_has_valid_service_selection(
        _supplier_id,
        NULL
      )
    )
    AND EXISTS (
      SELECT 1
      FROM public.supplier_profiles profile_row
      WHERE profile_row.user_id = _supplier_id
        AND (
          (
            profile_row.service_mode = 'remote'
            AND (
              -- Remote compatibility cannot require an impossible Service
              -- choice while the selected professions have no catalog rows.
              NOT catalog_state.has_available_services
              OR EXISTS (
                SELECT 1
                FROM public.supplier_services service_selection
                JOIN public.services service_row
                  ON service_row.id = service_selection.service_id
                 AND service_row.subcategory_id =
                   service_selection.subcategory_id
                 AND service_row.is_active
                 AND service_row.supports_remote
                WHERE service_selection.supplier_id = _supplier_id
                  AND public._supplier_has_valid_service_selection(
                    _supplier_id,
                    service_selection.service_id
                  )
              )
            )
          )
          OR (
            profile_row.service_mode IN ('on_site', 'both')
            AND (
              -- On-site coverage becomes mandatory automatically as soon as
              -- the managed Service Area catalog has an active choice.
              NOT catalog_state.has_available_service_areas
              OR EXISTS (
                SELECT 1
                FROM public.supplier_service_areas area_selection
                JOIN public.service_areas area_row
                  ON area_row.id = area_selection.service_area_id
                 AND area_row.is_active
                WHERE area_selection.supplier_id = _supplier_id
              )
            )
          )
        )
    )
  FROM catalog_state;
$$;

COMMIT;
