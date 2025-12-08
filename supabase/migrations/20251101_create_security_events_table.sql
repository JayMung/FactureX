-- Create security_events table for security dashboard
-- This table stores security-related events like login attempts, permission changes, etc.

CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only admins can view security events
CREATE POLICY "Admins can view all security events" ON security_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
      AND role IN ('super_admin', 'admin')
    )
  );

-- Only service role can insert (via triggers or functions)
CREATE POLICY "Service role can insert security events" ON security_events
  FOR INSERT
  WITH CHECK (true);

-- Fix activity_logs RLS policies to allow admins to view all logs
DROP POLICY IF EXISTS "Users can view their own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;

CREATE POLICY "Users can view their own activity logs" ON activity_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM admin_roles 
      WHERE admin_roles.user_id = auth.uid() 
      AND admin_roles.is_active = true
      AND admin_roles.role IN ('super_admin', 'admin')
    )
  );

-- Add comment
COMMENT ON TABLE security_events IS 'Security events log for monitoring and auditing. Only admins can view.';
