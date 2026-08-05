-- Google OAuth creates the Auth user before Bidly can ask which workspace the
-- person needs. Keep such users roleless until they make an explicit choice.
-- Email/password registration continues to provide an approved role in user
-- metadata and therefore keeps the existing automatic role assignment.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _requested_role text;
  _display_name text;
BEGIN
  _display_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'display_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'name'), ''),
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, _display_name);

  _requested_role := NEW.raw_user_meta_data ->> 'role';
  IF _requested_role IN ('customer', 'supplier') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, _requested_role::public.app_role);
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Complete registration for the current authenticated user only. The auth row
-- lock serializes simultaneous callback submissions so a user cannot acquire
-- both customer and supplier roles through a race.
CREATE OR REPLACE FUNCTION public.complete_registration_role(
  _role public.app_role
)
RETURNS public.app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _existing_role public.app_role;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF _role IS NULL OR _role NOT IN ('customer'::public.app_role, 'supplier'::public.app_role) THEN
    RAISE EXCEPTION 'Invalid registration role' USING ERRCODE = '22023';
  END IF;

  PERFORM 1
  FROM auth.users
  WHERE id = _user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user not found' USING ERRCODE = '42501';
  END IF;

  SELECT role_row.role
  INTO _existing_role
  FROM public.user_roles role_row
  WHERE role_row.user_id = _user_id
  ORDER BY CASE role_row.role
    WHEN 'admin'::public.app_role THEN 1
    WHEN 'supplier'::public.app_role THEN 2
    ELSE 3
  END
  LIMIT 1;

  -- Existing accounts keep their established role; OAuth never overwrites it.
  IF _existing_role IS NOT NULL THEN
    RETURN _existing_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _role;
END;
$$;

ALTER FUNCTION public.complete_registration_role(public.app_role) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.complete_registration_role(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_registration_role(public.app_role)
  TO authenticated, service_role;
