-- Fix infinite recursion in RLS policies
-- Use raw_app_meta_data instead of admin_roles table for role checking

-- 1. Drop all existing RLS policies that cause recursion
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions for any user" ON user_permissions;
DROP POLICY IF EXISTS "Admins can update permissions for any user" ON user_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions for any user" ON user_permissions;

DROP POLICY IF EXISTS "Admins can view all admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Users can view their own admin role" ON admin_roles;
DROP POLICY IF EXISTS "Admins can insert admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can update admin roles" ON admin_roles;
DROP POLICY IF EXISTS "Admins can delete admin roles" ON admin_roles;

-- 2. Create new policies using raw_app_meta_data to avoid recursion

-- User permissions policies
CREATE POLICY "Users can view their own permissions" ON user_permissions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    -- Check if user is admin using raw_app_meta_data (no recursion)
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can insert permissions for any user" ON user_permissions
  FOR INSERT
  WITH CHECK (
    -- Check if user is admin using raw_app_meta_data (no recursion)
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can update permissions for any user" ON user_permissions
  FOR UPDATE
  USING (
    -- Check if user is admin using raw_app_meta_data (no recursion)
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  )
  WITH CHECK (
    -- Check if user is admin using raw_app_meta_data (no recursion)
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  );

CREATE POLICY "Admins can delete permissions for any user" ON user_permissions
  FOR DELETE
  USING (
    -- Check if user is admin using raw_app_meta_data (no recursion)
    (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  );

-- Admin roles policies (using raw_app_meta_data)
CREATE POLICY "Admins can view all admin roles" ON admin_roles
  FOR SELECT
  USING (
    -- Users can view their own admin role
    user_id = auth.uid()
    OR
    -- Super admins can view all admin roles
    (auth.jwt() ->> 'role') = 'super_admin'
  );

CREATE POLICY "Users can view their own admin role" ON admin_roles
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

CREATE POLICY "Super admins can insert admin roles" ON admin_roles
  FOR INSERT
  WITH CHECK (
    -- Only super admins can create new admins
    (auth.jwt() ->> 'role') = 'super_admin'
  );

CREATE POLICY "Super admins can update admin roles" ON admin_roles
  FOR UPDATE
  USING (
    -- Only super admins can modify admin roles
    (auth.jwt() ->> 'role') = 'super_admin'
  )
  WITH CHECK (
    -- Only super admins can modify admin roles
    (auth.jwt() ->> 'role') = 'super_admin'
  );

CREATE POLICY "Super admins can delete admin roles" ON admin_roles
  FOR DELETE
  USING (
    -- Only super admins can delete admin roles
    (auth.jwt() ->> 'role') = 'super_admin'
  );

-- 3. Update the helper function to use raw_app_meta_data
CREATE OR REPLACE FUNCTION can_manage_permissions()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is admin using raw_app_meta_data (no recursion)
  RETURN (auth.jwt() ->> 'role') IN ('super_admin', 'admin');
END;
$$;

-- 4. Update the apply_role_atomic function to use raw_app_meta_data
DROP FUNCTION IF EXISTS apply_role_atomic(uuid, text, uuid);

CREATE OR REPLACE FUNCTION apply_role_atomic(
  target_user_id UUID,
  role_name TEXT,
  granted_by_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- SECURITY CHECK: Use raw_app_meta_data to avoid recursion
  current_user_role := (auth.jwt() ->> 'role');
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only administrators can apply roles';
  END IF;

  -- Super admins can apply any role, admins can only apply operateur
  IF current_user_role = 'admin' AND role_name IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Admins can only apply operateur role to other users';
  END IF;

  -- Validate role name
  IF role_name NOT IN ('super_admin', 'admin', 'operateur') THEN
    RAISE EXCEPTION 'Invalid role name: %', role_name;
  END IF;

  -- Update app_metadata in auth.users (use raw_app_meta_data)
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    to_jsonb(role_name)
  )
  WHERE id = target_user_id;

  -- Update or insert into admin_roles if admin or super_admin
  IF role_name IN ('super_admin', 'admin') THEN
    INSERT INTO admin_roles (user_id, email, role, is_active, granted_by, granted_at)
    SELECT 
      target_user_id,
      u.email,
      role_name,
      true,
      granted_by_user_id,
      NOW()
    FROM auth.users u
    WHERE u.id = target_user_id
    ON CONFLICT (user_id, email) 
    DO UPDATE SET 
      role = role_name,
      is_active = true,
      granted_by = granted_by_user_id,
      granted_at = NOW();
  ELSE
    -- Remove from admin_roles if downgrading to operateur
    DELETE FROM admin_roles WHERE user_id = target_user_id;
  END IF;

  -- Delete existing permissions for this user
  DELETE FROM user_permissions WHERE user_id = target_user_id;

  -- Apply role permissions based on role_name
  IF role_name = 'super_admin' THEN
    INSERT INTO user_permissions (user_id, module, can_read, can_create, can_update, can_delete)
    VALUES
      (target_user_id, 'clients', true, true, true, true),
      (target_user_id, 'transactions', true, true, true, true),
      (target_user_id, 'factures', true, true, true, true),
      (target_user_id, 'colis', true, true, true, true),
      (target_user_id, 'settings', true, true, true, true),
      (target_user_id, 'payment_methods', true, true, true, true),
      (target_user_id, 'exchange_rates', true, true, true, true),
      (target_user_id, 'transaction_fees', true, true, true, true),
      (target_user_id, 'activity_logs', true, false, false, false),
      (target_user_id, 'users', true, true, true, true),
      (target_user_id, 'profile', true, true, true, true),
      (target_user_id, 'reports', true, true, true, true),
      (target_user_id, 'security_logs', true, false, false, false);
      
  ELSIF role_name = 'admin' THEN
    INSERT INTO user_permissions (user_id, module, can_read, can_create, can_update, can_delete)
    VALUES
      (target_user_id, 'clients', true, true, true, true),
      (target_user_id, 'transactions', true, true, true, true),
      (target_user_id, 'factures', true, true, true, true),
      (target_user_id, 'colis', true, true, true, false),
      (target_user_id, 'settings', true, true, true, false),
      (target_user_id, 'payment_methods', true, true, true, false),
      (target_user_id, 'exchange_rates', true, true, true, false),
      (target_user_id, 'transaction_fees', true, true, true, false),
      (target_user_id, 'activity_logs', true, false, false, false),
      (target_user_id, 'users', true, true, true, false),
      (target_user_id, 'profile', true, true, true, false),
      (target_user_id, 'reports', true, true, false, false),
      (target_user_id, 'security_logs', false, false, false, false);
      
  ELSIF role_name = 'operateur' THEN
    INSERT INTO user_permissions (user_id, module, can_read, can_create, can_update, can_delete)
    VALUES
      (target_user_id, 'clients', true, true, true, false),
      (target_user_id, 'transactions', true, true, true, false),
      (target_user_id, 'factures', true, true, true, false),
      (target_user_id, 'colis', true, true, false, false),
      (target_user_id, 'settings', false, false, false, false),
      (target_user_id, 'payment_methods', true, false, false, false),
      (target_user_id, 'exchange_rates', true, false, false, false),
      (target_user_id, 'transaction_fees', true, false, false, false),
      (target_user_id, 'activity_logs', false, false, false, false),
      (target_user_id, 'users', false, false, false, false),
      (target_user_id, 'profile', true, false, true, false),
      (target_user_id, 'reports', true, false, false, false),
      (target_user_id, 'security_logs', false, false, false, false);
  END IF;

  -- Log the role application
  INSERT INTO activity_logs (user_id, action, details, date)
  VALUES (
    granted_by_user_id,
    'ROLE_APPLIED',
    jsonb_build_object(
      'target_user_id', target_user_id,
      'role_name', role_name,
      'granted_by', granted_by_user_id
    ),
    NOW()
  );

  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apply_role_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION apply_role_atomic TO service_role;
GRANT EXECUTE ON FUNCTION can_manage_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_permissions() TO service_role;

-- Add comments
COMMENT ON FUNCTION apply_role_atomic IS 'Atomically apply a role to a user with all associated permissions. Uses raw_app_meta_data to avoid RLS recursion.';
COMMENT ON FUNCTION can_manage_permissions IS 'Check if current user can manage permissions using raw_app_meta_data to avoid recursion.';
