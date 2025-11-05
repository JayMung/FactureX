-- Fix missing permission functions and role constraint
-- This creates the missing update_user_permission function and fixes role constraints

-- Create update_user_permission function
CREATE OR REPLACE FUNCTION update_user_permission(
  p_user_id UUID,
  p_module TEXT,
  p_can_read BOOLEAN DEFAULT FALSE,
  p_can_create BOOLEAN DEFAULT FALSE,
  p_can_update BOOLEAN DEFAULT FALSE,
  p_can_delete BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upsert user permission
  INSERT INTO user_permissions (
    user_id,
    module,
    can_read,
    can_create,
    can_update,
    can_delete,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_module,
    p_can_read,
    p_can_create,
    p_can_update,
    p_can_delete,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, module)
  DO UPDATE SET
    can_read = EXCLUDED.can_read,
    can_create = EXCLUDED.can_create,
    can_update = EXCLUDED.can_update,
    can_delete = EXCLUDED.can_delete,
    updated_at = NOW();

  -- Log the permission change
  INSERT INTO activity_logs (
    user_id,
    action,
    cible,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    'Modification de permission',
    'Utilisateur: ' || p_module,
    'Permissions mises à jour pour le module ' || p_module,
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Fix admin_roles role constraint to allow 'operateur'
ALTER TABLE admin_roles DROP CONSTRAINT IF EXISTS admin_roles_role_check;
ALTER TABLE admin_roles ADD CONSTRAINT admin_roles_role_check 
  CHECK (role IN ('admin', 'super_admin', 'operateur'));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_permission TO authenticated;

-- Add comments
COMMENT ON FUNCTION update_user_permission IS 'Updates user permissions with proper security context';
