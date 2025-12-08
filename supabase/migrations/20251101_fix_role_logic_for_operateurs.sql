-- Fix role logic to handle 'operateur' role correctly
-- Operateurs should not be in admin_roles table, only admins and super_admins

-- Drop and recreate apply_role_atomic with proper logic
DROP FUNCTION IF EXISTS apply_role_atomic;

CREATE OR REPLACE FUNCTION apply_role_atomic(
  target_user_id UUID,
  role_name TEXT,
  granted_by_user_id UUID,
  force_session_refresh BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role_exists BOOLEAN;
BEGIN
  -- Handle operateur role: remove from admin_roles if exists
  IF role_name = 'operateur' THEN
    -- Remove any existing admin role
    UPDATE admin_roles 
    SET 
      is_active = FALSE,
      updated_at = NOW()
    WHERE user_id = target_user_id AND is_active = TRUE;
    
    -- Update user's app_metadata (for immediate JWT refresh)
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      '"operateur"'
    )
    WHERE id = target_user_id;

    -- Update profiles table for consistency
    UPDATE profiles
    SET 
      role = 'operateur',
      updated_at = NOW()
    WHERE id = target_user_id;

    -- Log the role change
    INSERT INTO activity_logs (
      user_id,
      action,
      cible,
      details,
      created_at
    ) VALUES (
      granted_by_user_id,
      'Modification de rôle',
      'Utilisateur: ' || (SELECT email FROM profiles WHERE id = target_user_id),
      'Rôle défini sur: operateur',
      NOW()
    );

    RETURN TRUE;
  END IF;

  -- Handle admin/super_admin roles
  IF role_name IN ('admin', 'super_admin') THEN
    -- Check if admin role already exists
    SELECT EXISTS(
      SELECT 1 FROM admin_roles 
      WHERE user_id = target_user_id AND is_active = TRUE
    ) INTO v_admin_role_exists;

    IF v_admin_role_exists THEN
      -- Update existing role
      UPDATE admin_roles 
      SET 
        role = role_name,
        updated_at = NOW(),
        granted_by = granted_by_user_id
      WHERE user_id = target_user_id AND is_active = TRUE;
    ELSE
      -- Insert new admin role
      INSERT INTO admin_roles (
        user_id, 
        email, 
        role, 
        granted_by, 
        granted_at, 
        is_active
      ) VALUES (
        target_user_id,
        (SELECT email FROM profiles WHERE id = target_user_id),
        role_name,
        granted_by_user_id,
        NOW(),
        TRUE
      );
    END IF;

    -- Update user's app_metadata (for immediate JWT refresh)
    UPDATE auth.users
    SET raw_app_meta_data = jsonb_set(
      COALESCE(raw_app_meta_data, '{}'::jsonb),
      '{role}',
      '"' || role_name || '"'
    )
    WHERE id = target_user_id;

    -- Update profiles table for consistency
    UPDATE profiles
    SET 
      role = role_name,
      updated_at = NOW()
    WHERE id = target_user_id;

    -- Log the role change
    INSERT INTO activity_logs (
      user_id,
      action,
      cible,
      details,
      created_at
    ) VALUES (
      granted_by_user_id,
      'Modification de rôle',
      'Utilisateur: ' || (SELECT email FROM profiles WHERE id = target_user_id),
      'Nouveau rôle: ' || role_name,
      NOW()
    );

    RETURN TRUE;
  END IF;

  -- Invalid role
  RAISE EXCEPTION 'Invalid role: %', role_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apply_role_atomic TO authenticated;

-- Add comment
COMMENT ON FUNCTION apply_role_atomic IS 'Enhanced atomic role application with proper handling for operateur role';
