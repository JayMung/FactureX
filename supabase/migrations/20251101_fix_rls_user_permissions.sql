-- Fix RLS policies for user_permissions table
-- Allow admins to manage permissions for other users

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can view their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Users can insert their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Users can update their own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Users can delete their own permissions" ON user_permissions;

-- 2. Create new policies that allow admins to manage permissions

-- Policy for reading permissions
CREATE POLICY "Users can view their own permissions" ON user_permissions
  FOR SELECT
  USING (
    -- Users can view their own permissions
    user_id = auth.uid()
    OR
    -- Admins can view all permissions
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policy for inserting permissions
CREATE POLICY "Admins can insert permissions for any user" ON user_permissions
  FOR INSERT
  WITH CHECK (
    -- Only admins can insert permissions
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policy for updating permissions
CREATE POLICY "Admins can update permissions for any user" ON user_permissions
  FOR UPDATE
  USING (
    -- Only admins can update permissions
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    -- Only admins can update permissions
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    )
  );

-- Policy for deleting permissions
CREATE POLICY "Admins can delete permissions for any user" ON user_permissions
  FOR DELETE
  USING (
    -- Only admins can delete permissions
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    )
  );

-- 3. Create a helper function for permission management
CREATE OR REPLACE FUNCTION can_manage_permissions()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if current user is an admin
  RETURN EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('super_admin', 'admin')
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_manage_permissions() TO authenticated;
GRANT EXECUTE ON FUNCTION can_manage_permissions() TO service_role;

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_module ON user_permissions(module);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_module ON user_permissions(user_id, module);

-- 5. Add comment
COMMENT ON TABLE user_permissions IS 'User permissions with RLS policies that allow admins to manage permissions for all users';
