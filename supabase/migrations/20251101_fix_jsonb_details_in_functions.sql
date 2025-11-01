-- Fix JSONB details column in all RPC functions
-- Convert text details to proper JSONB format

-- Drop and recreate update_user_permission with JSONB details
DROP FUNCTION IF EXISTS update_user_permission;

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

  -- Log the permission change with proper JSONB details
  INSERT INTO activity_logs (
    user_id,
    action,
    cible,
    details,
    date
  ) VALUES (
    auth.uid(),
    'Modification de permission',
    'Utilisateur: ' || p_module,
    jsonb_build_object(
      'module', p_module,
      'user_id', p_user_id,
      'permissions', jsonb_build_object(
        'can_read', p_can_read,
        'can_create', p_can_create,
        'can_update', p_can_update,
        'can_delete', p_can_delete
      ),
      'message', 'Permissions mises à jour pour le module ' || p_module
    ),
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Drop and recreate apply_role_atomic with JSONB details
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
  v_user_email TEXT;
BEGIN
  -- Get user email for logging
  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = target_user_id;

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

    -- Log the role change with proper JSONB details
    INSERT INTO activity_logs (
      user_id,
      action,
      cible,
      details,
      date
    ) VALUES (
      granted_by_user_id,
      'Modification de rôle',
      'Utilisateur: ' || v_user_email,
      jsonb_build_object(
        'target_user_id', target_user_id,
        'target_email', v_user_email,
        'new_role', role_name,
        'granted_by', granted_by_user_id,
        'message', 'Rôle défini sur: operateur'
      ),
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
        v_user_email,
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

    -- Log the role change with proper JSONB details
    INSERT INTO activity_logs (
      user_id,
      action,
      cible,
      details,
      date
    ) VALUES (
      granted_by_user_id,
      'Modification de rôle',
      'Utilisateur: ' || v_user_email,
      jsonb_build_object(
        'target_user_id', target_user_id,
        'target_email', v_user_email,
        'new_role', role_name,
        'granted_by', granted_by_user_id,
        'message', 'Nouveau rôle: ' || role_name
      ),
      NOW()
    );

    RETURN TRUE;
  END IF;

  -- Invalid role
  RAISE EXCEPTION 'Invalid role: %', role_name;
END;
$$;

-- Drop and recreate revoke_role_atomic with JSONB details
DROP FUNCTION IF EXISTS revoke_role_atomic;

CREATE OR REPLACE FUNCTION revoke_role_atomic(
  target_user_id UUID,
  revoked_by_user_id UUID,
  force_session_refresh BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get user email for logging
  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = target_user_id;

  -- Deactivate admin role instead of deleting
  UPDATE admin_roles
  SET 
    is_active = FALSE,
    updated_at = NOW()
  WHERE user_id = target_user_id AND is_active = TRUE;

  -- Update user's app_metadata to operateur (default role)
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

  -- Log the role revocation with proper JSONB details
  INSERT INTO activity_logs (
    user_id,
    action,
    cible,
    details,
    date
  ) VALUES (
    revoked_by_user_id,
    'Révocation de rôle',
    'Utilisateur: ' || v_user_email,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_email', v_user_email,
      'revoked_role', 'admin',
      'revoked_by', revoked_by_user_id,
      'message', 'Rôle révoqué: admin'
    ),
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Drop and recreate force_session_refresh with JSONB details
DROP FUNCTION IF EXISTS force_session_refresh;

CREATE OR REPLACE FUNCTION force_session_refresh(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_email TEXT;
BEGIN
  -- Get user email for logging
  SELECT email INTO v_user_email
  FROM profiles
  WHERE id = target_user_id;

  -- Force app_metadata update to trigger JWT refresh
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{session_refresh}',
    to_jsonb(NOW())
  )
  WHERE id = target_user_id;

  -- Log the session refresh with proper JSONB details
  INSERT INTO activity_logs (
    user_id,
    action,
    cible,
    details,
    date
  ) VALUES (
    auth.uid(),
    'Rafraîchissement de session',
    'Utilisateur: ' || v_user_email,
    jsonb_build_object(
      'target_user_id', target_user_id,
      'target_email', v_user_email,
      'session_refresh', NOW(),
      'message', 'Session forcée à se rafraîchir'
    ),
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_user_permission TO authenticated;
GRANT EXECUTE ON FUNCTION apply_role_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_role_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION force_session_refresh TO authenticated;

-- Add comments
COMMENT ON FUNCTION update_user_permission IS 'Updates user permissions with proper JSONB logging';
COMMENT ON FUNCTION apply_role_atomic IS 'Enhanced atomic role application with JSONB logging';
COMMENT ON FUNCTION revoke_role_atomic IS 'Enhanced atomic role revocation with JSONB logging';
COMMENT ON FUNCTION force_session_refresh IS 'Forces session refresh with JSONB logging';
