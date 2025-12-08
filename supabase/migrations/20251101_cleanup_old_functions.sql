-- Cleanup old conflicting functions
-- Remove deprecated functions that could cause conflicts

-- Drop old grant_admin_role function (replaced by apply_role_atomic)
DROP FUNCTION IF EXISTS grant_admin_role;

-- Drop old revoke_admin_role function (replaced by revoke_role_atomic)
DROP FUNCTION IF EXISTS revoke_admin_role;

-- Drop any other old functions that might conflict
DROP FUNCTION IF EXISTS sync_user_permissions;

-- Add comment for documentation
COMMENT ON SCHEMA public IS 'Cleaned up old functions - now using atomic operations';
