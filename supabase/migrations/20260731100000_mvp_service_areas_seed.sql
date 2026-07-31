-- Governed Bidly MVP service-area catalog.
-- Existing rows outside these approved stable slugs are intentionally untouched.

INSERT INTO public.service_areas (
  slug,
  name_he,
  sort_order,
  is_active
)
VALUES
  ('north', 'צפון', 10, true),
  ('haifa-krayot', 'חיפה והקריות', 20, true),
  ('sharon', 'השרון', 30, true),
  ('center', 'מרכז', 40, true),
  ('jerusalem', 'ירושלים והסביבה', 50, true),
  ('south', 'דרום', 60, true),
  ('nationwide', 'כל הארץ', 70, true)
ON CONFLICT (slug) DO UPDATE
SET
  name_he = EXCLUDED.name_he,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;
