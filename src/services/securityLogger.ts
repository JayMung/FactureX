/**
 * Security Logger Service
 * 
 * Logs security events to the database for monitoring and audit trail
 */

import { supabase } from '@/integrations/supabase/client';

export type SecurityEventType =
  // Authentication
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'signup_success'
  | 'signup_failed'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'email_verification_sent'
  | 'email_verified'
  // Authorization
  | 'permission_denied'
  | 'admin_access_granted'
  | 'role_changed'
  // Data Access
  | 'sensitive_data_accessed'
  | 'bulk_export'
  | 'data_deleted'
  | 'data_modified'
  // Security
  | 'rate_limit_exceeded'
  | 'csrf_token_invalid'
  | 'ssrf_attempt_blocked'
  | 'xss_attempt_blocked'
  | 'sql_injection_attempt'
  | 'suspicious_activity'
  // Admin Actions
  | 'user_created'
  | 'user_deleted'
  | 'organization_created'
  | 'organization_deleted'
  | 'settings_changed';

export type SecuritySeverity = 'info' | 'warning' | 'critical';

export interface SecurityLogDetails {
  [key: string]: any;
}

export interface SecurityLogOptions {
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: SecurityLogDetails;
}

/**
 * Get client IP address (best effort)
 */
function getClientIP(): string | undefined {
  // In browser, we can't reliably get the real IP
  // This would need to be set by the server
  return undefined;
}

/**
 * Get user agent
 */
function getUserAgent(): string {
  return navigator.userAgent;
}

/**
 * Log a security event
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  severity: SecuritySeverity,
  options: SecurityLogOptions = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const logData = {
      event_type: eventType,
      severity,
      user_id: options.userId || user?.id || null,
      organization_id: options.organizationId || null,
      ip_address: options.ipAddress || getClientIP() || null,
      user_agent: options.userAgent || getUserAgent(),
      details: options.details || {},
    };

    const { error } = await supabase
      .from('security_logs')
      .insert(logData);

    if (error) {
      console.error('Failed to log security event:', error);
    }
  } catch (error) {
    // Don't throw errors from logging - fail silently
    console.error('Security logging error:', error);
  }
}

/**
 * Log authentication success
 */
export async function logLoginSuccess(email: string): Promise<void> {
  await logSecurityEvent('login_success', 'info', {
    details: { email },
  });
}

/**
 * Log authentication failure
 */
export async function logLoginFailed(email: string, reason?: string): Promise<void> {
  await logSecurityEvent('login_failed', 'warning', {
    details: { email, reason },
  });
}

/**
 * Log logout
 */
export async function logLogout(): Promise<void> {
  await logSecurityEvent('logout', 'info');
}

/**
 * Log signup success
 */
export async function logSignupSuccess(email: string): Promise<void> {
  await logSecurityEvent('signup_success', 'info', {
    details: { email },
  });
}

/**
 * Log signup failure
 */
export async function logSignupFailed(email: string, reason?: string): Promise<void> {
  await logSecurityEvent('signup_failed', 'warning', {
    details: { email, reason },
  });
}

/**
 * Log permission denied
 */
export async function logPermissionDenied(
  resource: string,
  action: string
): Promise<void> {
  await logSecurityEvent('permission_denied', 'warning', {
    details: { resource, action },
  });
}

/**
 * Log admin access
 */
export async function logAdminAccess(action: string): Promise<void> {
  await logSecurityEvent('admin_access_granted', 'info', {
    details: { action },
  });
}

/**
 * Log rate limit exceeded
 */
export async function logRateLimitExceeded(
  endpoint: string,
  attempts: number
): Promise<void> {
  await logSecurityEvent('rate_limit_exceeded', 'warning', {
    details: { endpoint, attempts },
  });
}

/**
 * Log CSRF token invalid
 */
export async function logCSRFInvalid(endpoint: string): Promise<void> {
  await logSecurityEvent('csrf_token_invalid', 'critical', {
    details: { endpoint },
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  reason: string,
  details?: SecurityLogDetails
): Promise<void> {
  await logSecurityEvent('suspicious_activity', 'critical', {
    details: { reason, ...details },
  });
}

/**
 * Log sensitive data access
 */
export async function logSensitiveDataAccess(
  dataType: string,
  recordId?: string
): Promise<void> {
  await logSecurityEvent('sensitive_data_accessed', 'info', {
    details: { dataType, recordId },
  });
}

/**
 * Log bulk data export
 */
export async function logBulkExport(
  dataType: string,
  recordCount: number
): Promise<void> {
  await logSecurityEvent('bulk_export', 'warning', {
    details: { dataType, recordCount },
  });
}

/**
 * Log data deletion
 */
export async function logDataDeleted(
  dataType: string,
  recordId: string
): Promise<void> {
  await logSecurityEvent('data_deleted', 'warning', {
    details: { dataType, recordId },
  });
}

/**
 * Log settings change
 */
export async function logSettingsChanged(
  settingName: string,
  oldValue?: any,
  newValue?: any
): Promise<void> {
  await logSecurityEvent('settings_changed', 'info', {
    details: { settingName, oldValue, newValue },
  });
}

/**
 * Get recent security events (admin only)
 */
export async function getRecentSecurityEvents(
  limit: number = 100,
  severity?: SecuritySeverity,
  eventType?: SecurityEventType
) {
  const { data, error } = await supabase.rpc('get_recent_security_events', {
    p_limit: limit,
    p_severity: severity || null,
    p_event_type: eventType || null,
  });

  if (error) {
    console.error('Failed to fetch security events:', error);
    return [];
  }

  return data || [];
}

/**
 * Get security dashboard summary (admin only)
 */
export async function getSecurityDashboard() {
  const { data, error } = await supabase
    .from('security_dashboard')
    .select('*');

  if (error) {
    console.error('Failed to fetch security dashboard:', error);
    return [];
  }

  return data || [];
}
