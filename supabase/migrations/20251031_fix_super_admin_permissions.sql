-- Fix super admin permissions and ensure proper role consistency
-- This migration resolves the access denied issue for super admin

-- First, ensure the super admin role exists and is properly configured
INSERT INTO admin_roles (user_id, email, role, is_active, granted_by, granted_at, created_at, updated_at)
VALUES (
  '2de4ceaf-ddc5-4e9f-b492-a4199c77c881',
  'mungedijeancy@gmail.com',
  'super_admin',
  true,
  '2de4ceaf-ddc5-4e9f-b492-a4199c77c881',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (user_id, email) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Ensure user has all module permissions for super admin
INSERT INTO user_permissions (user_id, module, can_read, can_create, can_update, can_delete, created_at, updated_at)
VALUES 
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'clients', true, true, true, true, NOW(), NOW()),
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'transactions', true, true, true, true, NOW(), NOW()),
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'factures', true, true, true, true, NOW(), NOW()),
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'settings', true, true, true, true, NOW(), NOW()),
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'users', true, true, true, true, NOW(), NOW()),
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'reports', true, true, true, true, NOW(), NOW()),
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'activity_logs', true, false, false, false, NOW(), NOW()),
  ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'security_logs', true, false, false, false, NOW(), NOW())
ON CONFLICT (user_id, module) DO UPDATE SET
  can_read = EXCLUDED.can_read,
  can_create = EXCLUDED.can_create,
  can_update = EXCLUDED.can_update,
  can_delete = EXCLUDED.can_delete,
  updated_at = NOW();

-- Update user's app_metadata to include super_admin role
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
  raw_user_meta_data, 
  '{app_metadata}', 
  '{"role": "super_admin"}'::jsonb
)
WHERE id = '2de4ceaf-ddc5-4e9f-b492-a4199c77c881';

-- Create a function to refresh user permissions
CREATE OR REPLACE FUNCTION refresh_user_permissions(user_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role_record RECORD;
BEGIN
  -- Get admin role for the user
  SELECT * INTO admin_role_record 
  FROM admin_roles 
  WHERE user_id = user_uuid AND is_active = true;
  
  -- If user is admin, ensure they have all permissions
  IF FOUND THEN
    INSERT INTO user_permissions (user_id, module, can_read, can_create, can_update, can_delete, created_at, updated_at)
    VALUES 
      (user_uuid, 'clients', true, true, true, true, NOW(), NOW()),
      (user_uuid, 'transactions', true, true, true, true, NOW(), NOW()),
      (user_uuid, 'factures', true, true, true, true, NOW(), NOW()),
      (user_uuid, 'settings', true, true, true, true, NOW(), NOW()),
      (user_uuid, 'users', true, true, true, true, NOW(), NOW()),
      (user_uuid, 'reports', true, true, true, true, NOW(), NOW()),
      (user_uuid, 'activity_logs', true, false, false, false, NOW(), NOW()),
      (user_uuid, 'security_logs', true, false, false, false, NOW(), NOW())
    ON CONFLICT (user_id, module) DO UPDATE SET
      can_read = EXCLUDED.can_read,
      can_create = EXCLUDED.can_create,
      can_update = EXCLUDED.can_update,
      can_delete = EXCLUDED.can_delete,
      updated_at = NOW();
  END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION refresh_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_user_permissions(UUID) TO service_role;

-- Log the fix
INSERT INTO activity_logs (user_id, action, details, created_at)
VALUES ('2de4ceaf-ddc5-4e9f-b492-a4199c77c881', 'PERMISSIONS_FIXED', 'Super admin permissions synchronized and fixed', NOW());
