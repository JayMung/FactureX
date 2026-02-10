-- Enable RLS on role_permissions if not already enabled
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to be safe)
DROP POLICY IF EXISTS "Allow read access for authenticated users" ON role_permissions;
DROP POLICY IF EXISTS "Allow write access for service role only" ON role_permissions;

-- Create restrictive policies for role_permissions
-- READ: Allow all authenticated users to read permissions (for UI checks)
CREATE POLICY "Allow read access for authenticated users" 
ON role_permissions 
FOR SELECT 
TO authenticated 
USING (true);

-- WRITE: Allow ONLY service_role (or super admins if you have that role concept in auth.users metadata, but service_role is safer for system config)
-- Actually, role_permissions is likely a system table. We don't want users editing it.
-- Explicitly NO policy for INSERT/UPDATE/DELETE means only superuser/replication role can do it, which is good.

-- Secure Views
-- Set security_invoker = true to respect RLS of underlying tables
ALTER VIEW IF EXISTS exchange_rate_history_with_user SET (security_invoker = true);

-- Note: security_dashboard might be critical so checking if it exists first
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'security_dashboard') THEN
        ALTER VIEW security_dashboard SET (security_invoker = true);
    END IF;
END $$;
