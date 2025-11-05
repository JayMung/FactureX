-- Fix super admin roles for francy@coccinelledrc.com and mungedijeancy@gmail.com
-- Date: 2025-11-01

-- 1. Update app_metadata for both users to super_admin
UPDATE auth.users 
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{role}',
  '"super_admin"'
)
WHERE email IN ('mungedijeancy@gmail.com', 'francy@coccinelledrc.com');

-- 2. Ensure both users are in admin_roles table
INSERT INTO admin_roles (user_id, email, role, is_active, granted_by, granted_at)
SELECT 
  u.id,
  u.email,
  'super_admin',
  true,
  '2de4ceaf-ddc5-4e9f-b492-a4199c77c881', -- mungedijeancy as granter
  NOW()
FROM auth.users u
WHERE u.email IN ('francy@coccinelledrc.com', 'mungedijeancy@gmail.com')
ON CONFLICT (user_id, email) 
DO UPDATE SET 
  role = 'super_admin',
  is_active = true,
  granted_at = NOW();

-- 3. Grant all permissions to both super admins
INSERT INTO user_permissions (user_id, module, can_read, can_create, can_update, can_delete)
SELECT 
  u.id,
  m.module_name,
  true,
  true,
  true,
  true
FROM auth.users u
CROSS JOIN (
  VALUES 
    ('clients'),
    ('transactions'),
    ('factures'),
    ('colis'),
    ('payment_methods'),
    ('exchange_rates'),
    ('transaction_fees'),
    ('settings'),
    ('users'),
    ('profile'),
    ('reports'),
    ('activity_logs'),
    ('security_logs')
) AS m(module_name)
WHERE u.email IN ('francy@coccinelledrc.com', 'mungedijeancy@gmail.com')
ON CONFLICT (user_id, module) 
DO UPDATE SET
  can_read = true,
  can_create = true,
  can_update = true,
  can_delete = true;

-- 4. Log this security change
INSERT INTO activity_logs (user_id, action, details, date, created_at)
SELECT 
  id,
  'SECURITY_FIX',
  jsonb_build_object(
    'fix', 'super_admin_roles_correction',
    'users', ARRAY['francy@coccinelledrc.com', 'mungedijeancy@gmail.com'],
    'description', 'Fixed super_admin roles in app_metadata and admin_roles'
  ),
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'mungedijeancy@gmail.com'
LIMIT 1;

-- 5. Verification query (comment out in production)
-- SELECT 
--   u.email,
--   u.raw_app_meta_data->>'role' as app_metadata_role,
--   ar.role as admin_role,
--   ar.is_active,
--   COUNT(up.module) as total_permissions
-- FROM auth.users u
-- LEFT JOIN admin_roles ar ON u.id = ar.user_id
-- LEFT JOIN user_permissions up ON u.id = up.user_id
-- WHERE u.email IN ('francy@coccinelledrc.com', 'mungedijeancy@gmail.com')
-- GROUP BY u.email, u.raw_app_meta_data, ar.role, ar.is_active;
