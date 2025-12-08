-- Migration: Security Logging and Monitoring
-- Description: Create security event logging system
-- Date: 2025-01-26
-- Security Task: #10 - Security Logging (HIGH)

-- ============================================================================
-- PART 1: Create Security Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON public.security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON public.security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_organization_id ON public.security_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON public.security_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view all logs in their organization
CREATE POLICY "security_logs_admin_select" ON public.security_logs
FOR SELECT TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' AND
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: System can insert logs
CREATE POLICY "security_logs_insert" ON public.security_logs
FOR INSERT TO authenticated
WITH CHECK (true);

COMMENT ON TABLE public.security_logs IS 
'Security event logs for monitoring and audit trail';

-- ============================================================================
-- PART 2: Create Security Event Types Enum (for documentation)
-- ============================================================================

-- Event types (documented, not enforced):
-- Authentication:
--   - login_success
--   - login_failed
--   - logout
--   - signup_success
--   - signup_failed
--   - password_reset_requested
--   - password_reset_completed
--   - email_verification_sent
--   - email_verified
--
-- Authorization:
--   - permission_denied
--   - admin_access_granted
--   - role_changed
--
-- Data Access:
--   - sensitive_data_accessed
--   - bulk_export
--   - data_deleted
--   - data_modified
--
-- Security:
--   - rate_limit_exceeded
--   - csrf_token_invalid
--   - ssrf_attempt_blocked
--   - xss_attempt_blocked
--   - sql_injection_attempt
--   - suspicious_activity
--
-- Admin Actions:
--   - user_created
--   - user_deleted
--   - organization_created
--   - organization_deleted
--   - settings_changed

-- ============================================================================
-- PART 3: Create Helper Functions
-- ============================================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_severity TEXT,
  p_user_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  -- Validate severity
  IF p_severity NOT IN ('info', 'warning', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity: %. Must be info, warning, or critical', p_severity;
  END IF;

  -- Insert log
  INSERT INTO public.security_logs (
    event_type,
    severity,
    user_id,
    organization_id,
    ip_address,
    user_agent,
    details
  ) VALUES (
    p_event_type,
    p_severity,
    p_user_id,
    p_organization_id,
    p_ip_address,
    p_user_agent,
    p_details
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, UUID, UUID, TEXT, TEXT, JSONB) TO authenticated;

COMMENT ON FUNCTION public.log_security_event IS 
'Logs a security event with specified severity and details';

-- ============================================================================
-- PART 4: Create Trigger for Failed Login Attempts
-- ============================================================================

-- Function to detect suspicious login patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  failed_attempts INTEGER;
  recent_failures INTEGER;
BEGIN
  -- Count failed login attempts in last 15 minutes
  SELECT COUNT(*) INTO recent_failures
  FROM public.security_logs
  WHERE event_type = 'login_failed'
    AND user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '15 minutes';

  -- If more than 5 failed attempts, log as suspicious
  IF recent_failures >= 5 THEN
    PERFORM public.log_security_event(
      'suspicious_activity',
      'critical',
      NEW.user_id,
      NEW.organization_id,
      NEW.ip_address,
      NEW.user_agent,
      jsonb_build_object(
        'reason', 'multiple_failed_logins',
        'count', recent_failures,
        'timeframe', '15 minutes'
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on security_logs for failed logins
CREATE TRIGGER detect_suspicious_login_trigger
AFTER INSERT ON public.security_logs
FOR EACH ROW
WHEN (NEW.event_type = 'login_failed')
EXECUTE FUNCTION public.detect_suspicious_login();

-- ============================================================================
-- PART 5: Create Cleanup Function for Old Logs
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete logs older than retention period
  DELETE FROM public.security_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  PERFORM public.log_security_event(
    'logs_cleaned',
    'info',
    NULL,
    NULL,
    NULL,
    NULL,
    jsonb_build_object(
      'deleted_count', deleted_count,
      'retention_days', p_retention_days
    )
  );
  
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_old_security_logs(INTEGER) TO service_role;

COMMENT ON FUNCTION public.cleanup_old_security_logs IS 
'Deletes security logs older than specified retention period (default 90 days)';

-- ============================================================================
-- PART 6: Create View for Security Dashboard
-- ============================================================================

CREATE OR REPLACE VIEW public.security_dashboard AS
SELECT 
  event_type,
  severity,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as last_occurrence,
  MIN(created_at) as first_occurrence
FROM public.security_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, severity
ORDER BY event_count DESC;

COMMENT ON VIEW public.security_dashboard IS 
'Security events summary for the last 24 hours';

-- Grant access to admins
GRANT SELECT ON public.security_dashboard TO authenticated;

-- ============================================================================
-- PART 7: Create Function to Get Recent Security Events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_recent_security_events(
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
  organization_id UUID,
  ip_address TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can access
  IF (auth.jwt() -> 'app_metadata' ->> 'role') != 'admin' THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    sl.id,
    sl.event_type,
    sl.severity,
    sl.user_id,
    au.email as user_email,
    sl.organization_id,
    sl.ip_address,
    sl.details,
    sl.created_at
  FROM public.security_logs sl
  LEFT JOIN auth.users au ON sl.user_id = au.id
  WHERE 
    (p_severity IS NULL OR sl.severity = p_severity) AND
    (p_event_type IS NULL OR sl.event_type = p_event_type) AND
    sl.organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  ORDER BY sl.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_security_events(INTEGER, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.get_recent_security_events IS 
'Returns recent security events for admin users';

-- ============================================================================
-- PART 8: Grant Permissions
-- ============================================================================

-- Grant necessary permissions
GRANT SELECT ON public.security_logs TO authenticated;
GRANT INSERT ON public.security_logs TO authenticated;

-- ============================================================================
-- PART 9: Documentation
-- ============================================================================

-- Migration completed successfully
DO $$
BEGIN
  RAISE NOTICE 'Security logging migration completed successfully';
  RAISE NOTICE 'Created table: security_logs';
  RAISE NOTICE 'Created function: log_security_event()';
  RAISE NOTICE 'Created function: cleanup_old_security_logs()';
  RAISE NOTICE 'Created function: get_recent_security_events()';
  RAISE NOTICE 'Created view: security_dashboard';
  RAISE NOTICE 'Created trigger: detect_suspicious_login_trigger';
  RAISE NOTICE 'Default retention: 90 days';
END $$;
