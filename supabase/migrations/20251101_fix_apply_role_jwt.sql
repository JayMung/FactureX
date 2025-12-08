-- Fix apply_role_atomic to check admin_roles table instead of JWT
-- This fixes the "Only administrators can apply roles" error

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
  current_user_is_admin BOOLEAN;
  current_user_role TEXT;
BEGIN
  -- SECURITY CHECK: Check admin_roles table directly instead of JWT
  -- This avoids issues with stale JWT tokens
  SELECT 
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = granted_by_user_id 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    ),
    COALESCE(
      (SELECT role FROM admin_roles WHERE user_id = granted_by_user_id AND is_active = true),
      'operateur'
    )
  INTO current_user_is_admin, current_user_role;
  
  IF NOT current_user_is_admin THEN
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

-- Add comment
COMMENT ON FUNCTION apply_role_atomic IS 'Atomically apply a role to a user. Checks admin_roles table directly instead of JWT to avoid stale token issues.';
