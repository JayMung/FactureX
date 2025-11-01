-- Add session refresh functionality to role change functions
-- This prevents stale JWT issues when roles are changed

-- Drop existing functions to recreate with session refresh
DROP FUNCTION IF EXISTS apply_role_atomic;
DROP FUNCTION IF EXISTS revoke_role_atomic;

-- Enhanced apply_role_atomic with session refresh capability
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
  v_current_role TEXT;
BEGIN
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
    date
  ) VALUES (
    granted_by_user_id,
    'Modification de rôle',
    'Utilisateur: ' || (SELECT email FROM profiles WHERE id = target_user_id),
    'Nouveau rôle: ' || role_name,
    NOW()
  );

  -- Return success
  RETURN TRUE;
END;
$$;

-- Enhanced revoke_role_atomic with session refresh capability
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

  -- Log the role revocation
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
    'Rôle révoqué: admin',
    NOW()
  );

  -- Return success
  RETURN TRUE;
END;
$$;

-- Create function to force session refresh for a specific user
CREATE OR REPLACE FUNCTION force_session_refresh(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the user's app_metadata to trigger session refresh
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    raw_app_meta_data,
    '{session_refresh}',
    EXTRACT(EPOCH FROM NOW())::TEXT
  )
  WHERE id = target_user_id;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION apply_role_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_role_atomic TO authenticated;
GRANT EXECUTE ON FUNCTION force_session_refresh TO authenticated;

-- Add comments
COMMENT ON FUNCTION apply_role_atomic IS 'Enhanced atomic role application with immediate app_metadata update to prevent stale JWT issues';
COMMENT ON FUNCTION revoke_role_atomic IS 'Enhanced atomic role revocation with immediate app_metadata update to prevent stale JWT issues';
COMMENT ON FUNCTION force_session_refresh IS 'Forces session refresh by updating app_metadata timestamp';
