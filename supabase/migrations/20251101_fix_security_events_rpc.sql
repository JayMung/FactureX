-- Fix get_recent_security_events to check admin_roles instead of JWT
-- This fixes the "Access denied. Admin role required." error

DROP FUNCTION IF EXISTS get_recent_security_events(integer, text, text);

CREATE OR REPLACE FUNCTION get_recent_security_events(
  p_limit INTEGER DEFAULT 100,
  p_severity TEXT DEFAULT NULL,
  p_event_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  severity TEXT,
  user_id UUID,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin BOOLEAN;
BEGIN
  -- Check if caller is admin using admin_roles table (not JWT)
  SELECT EXISTS (
    SELECT 1 FROM admin_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
    AND role IN ('super_admin', 'admin')
  ) INTO caller_is_admin;
  
  IF NOT caller_is_admin THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  -- Return security events with filters
  RETURN QUERY
  SELECT 
    se.id,
    se.event_type,
    se.severity,
    se.user_id,
    se.user_email,
    se.ip_address,
    se.user_agent,
    se.details,
    se.created_at
  FROM security_events se
  WHERE 
    (p_severity IS NULL OR se.severity = p_severity)
    AND (p_event_type IS NULL OR se.event_type = p_event_type)
  ORDER BY se.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_recent_security_events TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_recent_security_events IS 'Get recent security events. Only admins can access. Checks admin_roles table instead of JWT.';
