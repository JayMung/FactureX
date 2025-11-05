-- Fix security_logs severity constraint to support all severity levels
-- This resolves the constraint violation error

-- Drop the existing restrictive constraint
ALTER TABLE security_logs DROP CONSTRAINT IF EXISTS security_logs_severity_check;

-- Add a more permissive constraint that supports all severity levels
ALTER TABLE security_logs 
ADD CONSTRAINT security_logs_severity_check 
CHECK (severity IN ('info', 'warning', 'medium', 'high', 'critical', 'low', 'debug'));

-- Grant necessary permissions for the security_logs table
GRANT ALL ON security_logs TO authenticated;
GRANT ALL ON security_logs TO service_role;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_logs_severity ON security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);

-- Add comment for documentation
COMMENT ON TABLE security_logs IS 'Security event logs for tracking authentication, authorization, and security-related events';
COMMENT ON COLUMN security_logs.severity IS 'Severity level: info, warning, medium, high, critical, low, debug';
