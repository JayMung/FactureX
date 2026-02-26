-- ============================================================================
-- Migration: Create set_user_role RPC + fix profiles.role constraint
-- 
-- Problem: The frontend calls set_user_role() and get_user_role() RPCs but
-- they were never created. Also, profiles.role CHECK constraint only allows
-- ('admin', 'operateur') — missing 'super_admin' and 'comptable'.
--
-- Applied via Supabase MCP as: fix_role_rpcs_and_profiles_constraint
-- ============================================================================

-- STEP 1: Fix profiles.role CHECK constraint
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  FOR v_constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE t.relname = 'profiles' 
    AND n.nspname = 'public'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) LIKE '%role%'
  LOOP
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  END LOOP;

  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IS NULL OR role IN ('operateur', 'admin', 'super_admin', 'comptable'));
END $$;

-- STEP 2: Drop functions that need signature changes (CASCADE for dependencies)
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role(UUID, TEXT) CASCADE;

-- STEP 3: Recreate get_my_role()
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'operateur'
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- STEP 4: Recreate get_user_role(p_user_id) with TEXT return
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_target_role TEXT;
BEGIN
  v_caller_role := public.get_my_role();

  IF p_user_id != auth.uid() AND v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Accès refusé: seuls les administrateurs peuvent consulter les rôles';
  END IF;

  SELECT COALESCE(raw_app_meta_data ->> 'role', 'operateur')
  INTO v_target_role
  FROM auth.users
  WHERE id = p_user_id;

  IF v_target_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non trouvé: %', p_user_id;
  END IF;

  RETURN v_target_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;

-- STEP 5: Create set_user_role(p_target_user_id, p_role)
CREATE OR REPLACE FUNCTION public.set_user_role(
  p_target_user_id UUID,
  p_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_old_role TEXT;
  v_target_email TEXT;
  v_admin_role_exists BOOLEAN;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := public.get_my_role();

  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Accès refusé: seul un super_admin peut modifier les rôles';
  END IF;

  IF p_role NOT IN ('operateur', 'admin', 'super_admin', 'comptable') THEN
    RAISE EXCEPTION 'Rôle invalide: %', p_role;
  END IF;

  IF p_target_user_id = v_caller_id THEN
    RAISE EXCEPTION 'Modification de son propre rôle interdite';
  END IF;

  SELECT COALESCE(raw_app_meta_data ->> 'role', 'operateur'), email
  INTO v_old_role, v_target_email
  FROM auth.users
  WHERE id = p_target_user_id;

  IF v_old_role IS NULL THEN
    RAISE EXCEPTION 'Utilisateur cible non trouvé';
  END IF;

  -- 1. Update app_metadata (SOURCE OF TRUTH)
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(p_role)
  )
  WHERE id = p_target_user_id;

  -- 2. Update admin_roles (audit trail)
  IF p_role IN ('admin', 'super_admin') THEN
    SELECT EXISTS(
      SELECT 1 FROM admin_roles WHERE user_id = p_target_user_id AND is_active = TRUE
    ) INTO v_admin_role_exists;

    IF v_admin_role_exists THEN
      UPDATE admin_roles 
      SET role = p_role, updated_at = NOW(), granted_by = v_caller_id
      WHERE user_id = p_target_user_id AND is_active = TRUE;
    ELSE
      INSERT INTO admin_roles (user_id, email, role, granted_by, granted_at, is_active)
      VALUES (p_target_user_id, v_target_email, p_role, v_caller_id, NOW(), TRUE);
    END IF;
  ELSE
    UPDATE admin_roles 
    SET is_active = FALSE, updated_at = NOW()
    WHERE user_id = p_target_user_id AND is_active = TRUE;
  END IF;

  -- 3. Update profiles.role (read cache)
  UPDATE profiles
  SET role = p_role, updated_at = NOW()
  WHERE id = p_target_user_id;

  -- 4. Log the role change
  INSERT INTO activity_logs (user_id, action, cible, details, date)
  VALUES (
    v_caller_id,
    'Modification de rôle',
    'Utilisateur: ' || v_target_email,
    'Ancien rôle: ' || v_old_role || ' → Nouveau rôle: ' || p_role,
    NOW()
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated;

-- STEP 6: Recreate RLS policies on paiements that were dropped by CASCADE
CREATE POLICY "paiements_insert_policy" ON public.paiements
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_my_role() IN ('admin', 'super_admin')
    OR auth.uid() = created_by
  );

CREATE POLICY "paiements_update_policy" ON public.paiements
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'super_admin')
    OR auth.uid() = created_by
  );

CREATE POLICY "paiements_delete_policy" ON public.paiements
  FOR DELETE TO authenticated
  USING (
    public.get_my_role() IN ('admin', 'super_admin')
  );
