-- Recreate session refresh functions with correct activity_logs column names

-- Drop and recreate force_session_refresh function
DROP FUNCTION IF EXISTS force_session_refresh;

CREATE OR REPLACE FUNCTION force_session_refresh(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Force app_metadata update to trigger JWT refresh
  UPDATE auth.users
  SET raw_app_meta_data = jsonb_set(
    COALESCE(raw_app_meta_data, '{}'::jsonb),
    '{session_refresh}',
    to_jsonb(NOW())
  )
  WHERE id = target_user_id;

  -- Log the session refresh
  INSERT INTO activity_logs (
    user_id,
    action,
    cible,
    details,
    date
  ) VALUES (
    auth.uid(),
    'Rafraîchissement de session',
    'Utilisateur: ' || (SELECT email FROM profiles WHERE id = target_user_id),
    'Session forcée à se rafraîchir',
    NOW()
  );

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION force_session_refresh TO authenticated;

-- Add comment
COMMENT ON FUNCTION force_session_refresh IS 'Forces session refresh by updating app_metadata';
