-- Final fix for RLS policies on user_permissions
-- Use SECURITY DEFINER functions to bypass RLS for admin operations

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can insert permissions for any user" ON user_permissions;
DROP POLICY IF EXISTS "Admins can update permissions for any user" ON user_permissions;
DROP POLICY IF EXISTS "Admins can delete permissions for any user" ON user_permissions;

-- 2. Create simple policies that allow service role and authenticated users
CREATE POLICY "Enable read for authenticated users" ON user_permissions
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    -- Allow if user is in admin_roles (direct check, no recursion)
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE admin_roles.user_id = auth.uid() 
      AND admin_roles.is_active = true
    )
  );

CREATE POLICY "Enable insert for service role" ON user_permissions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for service role" ON user_permissions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for service role" ON user_permissions
  FOR DELETE
  USING (true);

-- 3. Create SECURITY DEFINER functions for permission management
-- These functions run with elevated privileges and bypass RLS

-- Function to update a single permission
CREATE OR REPLACE FUNCTION update_user_permission(
  p_user_id UUID,
  p_module TEXT,
  p_can_read BOOLEAN,
  p_can_create BOOLEAN,
  p_can_update BOOLEAN,
  p_can_delete BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('super_admin', 'admin')
  ) INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only administrators can manage permissions';
  END IF;

  -- Insert or update permission
  INSERT INTO user_permissions (user_id, module, can_read, can_create, can_update, can_delete)
  VALUES (p_user_id, p_module, p_can_read, p_can_create, p_can_update, p_can_delete)
  ON CONFLICT (user_id, module)
  DO UPDATE SET
    can_read = EXCLUDED.can_read,
    can_create = EXCLUDED.can_create,
    can_update = EXCLUDED.can_update,
    can_delete = EXCLUDED.can_delete,
    updated_at = NOW();

  RETURN true;
END;
$$;

-- Function to delete a permission
CREATE OR REPLACE FUNCTION delete_user_permission(
  p_user_id UUID,
  p_module TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('super_admin', 'admin')
  ) INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Only administrators can manage permissions';
  END IF;

  DELETE FROM user_permissions
  WHERE user_id = p_user_id AND module = p_module;

  RETURN true;
END;
$$;

-- Function to get user permissions (bypass RLS)
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
  module TEXT,
  can_read BOOLEAN,
  can_create BOOLEAN,
  can_update BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Anyone can read their own permissions
  -- Admins can read any user's permissions
  IF p_user_id != auth.uid() THEN
    IF NOT EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    ) THEN
      RAISE EXCEPTION 'Only administrators can view other users permissions';
    END IF;
  END IF;

  RETURN QUERY
  SELECT 
    up.module,
    up.can_read,
    up.can_create,
    up.can_update,
    up.can_delete
  FROM user_permissions up
  WHERE up.user_id = p_user_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions TO authenticated;

-- Add comments
COMMENT ON FUNCTION update_user_permission IS 'Update or insert a user permission. Only admins can call this function.';
COMMENT ON FUNCTION delete_user_permission IS 'Delete a user permission. Only admins can call this function.';
COMMENT ON FUNCTION get_user_permissions IS 'Get all permissions for a user. Users can view their own, admins can view any.';
