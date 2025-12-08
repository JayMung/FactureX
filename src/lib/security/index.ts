/**
 * Security configuration and utilities
 */

// Export all security modules
export * from './validation';
export * from './error-handling';
export * from './headers';

// Security configuration
export const SECURITY_CONFIG = {
  // Rate limiting
  RATE_LIMIT: {
    LOGIN: { limit: 5, window: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
    SIGNUP: { limit: 3, window: 60 * 60 * 1000 }, // 3 attempts per hour
    GENERAL: { limit: 100, window: 60 * 1000 }, // 100 requests per minute
  },
  
  // Session security
  SESSION: {
    MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    REFRESH_THRESHOLD: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  },
  
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
  },
  
  // Security monitoring
  MONITORING: {
    LOG_FAILED_ATTEMPTS: true,
    LOG_PERMISSION_DENIED: true,
    LOG_ADMIN_ACTIONS: true,
    LOG_DATA_ACCESS: true,
  },
  
  // CSRF protection
  CSRF: {
    TOKEN_LENGTH: 32,
    TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
  },
};

// Security levels
export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Security event types
export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  SIGNUP_SUCCESS = 'signup_success',
  SIGNUP_FAILED = 'signup_failed',
  PERMISSION_DENIED = 'permission_denied',
  DATA_ACCESS = 'data_access',
  ADMIN_ACTION = 'admin_action',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  CSRF_TOKEN_INVALID = 'csrf_token_invalid',
}

// Default security headers for API requests
export const DEFAULT_SECURITY_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Check if current environment is secure
 */
export const isSecureEnvironment = (): boolean => {
  return (
    import.meta.env.PROD ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  );
};

/**
 * Get security context for logging
 */
export const getSecurityContext = (): Record<string, any> => {
  return {
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: location.href,
    environment: import.meta.env.MODE,
    isSecure: isSecureEnvironment(),
  };
};

/**
 * Validate security requirements are met
 */
export const validateSecurityRequirements = (): {
  isValid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];

  // Check HTTPS in production
  if (import.meta.env.PROD && location.protocol !== 'https:') {
    issues.push('HTTPS required in production');
  }

  // Check required environment variables
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  requiredEnvVars.forEach(envVar => {
    if (!import.meta.env[envVar]) {
      issues.push(`Missing environment variable: ${envVar}`);
    }
  });

  // Check for console in production
  if (import.meta.env.PROD && (console as any).clear) {
    issues.push('Console should be disabled in production');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};
