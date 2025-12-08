-- CRITICAL SECURITY FIX: Activity Logs Access Control
-- This migration fixes the critical vulnerability where all authenticated users 
-- could access activity logs and audit trails

-- 1. DROP DANGEROUS POLICIES THAT ALLOW UNRESTRICTED ACCESS
DROP POLICY IF EXISTS "Enable read for authenticated users" ON activity_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON activity_logs;

-- 2. CREATE SECURE ADMIN-ONLY POLICIES
-- Only admins can read activity logs
CREATE POLICY "activity_logs_admin_read" ON activity_logs
  FOR SELECT USING (
    (auth.jwt() ->> 'role'::text) IN ('admin', 'super_admin')
  );

-- Users can insert their own activity logs (for system logging)
CREATE POLICY "activity_logs_user_insert" ON activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can update activity logs
CREATE POLICY "activity_logs_admin_update" ON activity_logs
  FOR UPDATE USING (
    (auth.jwt() ->> 'role'::text) IN ('admin', 'super_admin')
  );

-- Only admins can delete activity logs
CREATE POLICY "activity_logs_admin_delete" ON activity_logs
  FOR DELETE USING (
    (auth.jwt() ->> 'role'::text) IN ('admin', 'super_admin')
  );

-- 3. CREATE SECURE RPC FUNCTIONS FOR CONTROLLED ACCESS
CREATE OR REPLACE FUNCTION get_activity_logs_secure(
  page_num INTEGER DEFAULT 1,
  page_size INTEGER DEFAULT 10,
  filter_action TEXT DEFAULT NULL,
  filter_user_id TEXT DEFAULT NULL,
  filter_date_range TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  action TEXT,
  cible TEXT,
  cible_id TEXT,
  details JSONB,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  user_first_name TEXT,
  user_last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- SECURITY CHECK: ONLY ADMINS CAN ACCESS LOGS
  user_role := auth.jwt() ->> 'role';
  
  IF user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required to access activity logs';
  END IF;
  
  -- BUILD THE SECURE QUERY
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.action,
    al.cible,
    al.cible_id,
    al.details,
    al.date,
    al.created_at,
    COALESCE(p.email, 'Utilisateur inconnu') as user_email,
    COALESCE(p.first_name, '') as user_first_name,
    COALESCE(p.last_name, '') as user_last_name
  FROM activity_logs al
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE 
    -- APPLY FILTERS
    (filter_action IS NULL OR al.action ILIKE '%' || filter_action || '%')
    AND (filter_user_id IS NULL OR al.user_id = filter_user_id::UUID)
    AND (
      filter_date_range IS NULL 
      OR (filter_date_range = 'today' AND al.date >= CURRENT_DATE)
      OR (filter_date_range = 'week' AND al.date >= CURRENT_DATE - INTERVAL '7 days')
      OR (filter_date_range = 'month' AND al.date >= CURRENT_DATE - INTERVAL '30 days')
    )
  ORDER BY al.date DESC
  LIMIT page_size OFFSET ((page_num - 1) * page_size);
END;
$$;

-- 4. CREATE SECURE COUNT FUNCTION
CREATE OR REPLACE FUNCTION count_activity_logs_secure(
  filter_action TEXT DEFAULT NULL,
  filter_user_id TEXT DEFAULT NULL,
  filter_date_range TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role TEXT;
  log_count INTEGER;
BEGIN
  -- SECURITY CHECK: ONLY ADMINS CAN COUNT LOGS
  user_role := auth.jwt() ->> 'role';
  
  IF user_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required to count activity logs';
  END IF;
  
  -- COUNT LOGS WITH FILTERS
  SELECT COUNT(*) INTO log_count
  FROM activity_logs
  WHERE 
    (filter_action IS NULL OR action ILIKE '%' || filter_action || '%')
    AND (filter_user_id IS NULL OR user_id = filter_user_id::UUID)
    AND (
      filter_date_range IS NULL 
      OR (filter_date_range = 'today' AND date >= CURRENT_DATE)
      OR (filter_date_range = 'week' AND date >= CURRENT_DATE - INTERVAL '7 days')
      OR (filter_date_range = 'month' AND date >= CURRENT_DATE - INTERVAL '30 days')
    );
  
  RETURN log_count;
END;
$$;

-- 5. GRANT EXECUTE PERMISSIONS
GRANT EXECUTE ON FUNCTION get_activity_logs_secure TO authenticated;
GRANT EXECUTE ON FUNCTION get_activity_logs_secure TO service_role;
GRANT EXECUTE ON FUNCTION count_activity_logs_secure TO authenticated;
GRANT EXECUTE ON FUNCTION count_activity_logs_secure TO service_role;

-- 6. CREATE SECURITY LOG ENTRY FOR THIS FIX
INSERT INTO activity_logs (user_id, action, details, date, created_at)
SELECT 
  id,
  'SECURITY_FIX',
  '{"fix": "activity_logs_access_control", "severity": "critical", "description": "Fixed unrestricted access to activity logs"}'::jsonb,
  NOW(),
  NOW()
FROM auth.users 
WHERE email = 'mungedijeancy@gmail.com'
LIMIT 1;

-- 7. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE activity_logs IS 'SECURE: Activity logs with admin-only read access. Use get_activity_logs_secure() RPC function for controlled access.';
COMMENT ON POLICY "activity_logs_admin_read" ON activity_logs IS 'SECURITY: Only admins (admin, super_admin) can read activity logs';
COMMENT ON FUNCTION get_activity_logs_secure IS 'SECURITY: Secure RPC function for activity logs access with admin role verification';
COMMENT ON FUNCTION count_activity_logs_secure IS 'SECURITY: Secure RPC function for counting activity logs with admin role verification';
