/**
 * Security validation utilities for Supabase requests
 */

export interface SecurityValidationResult {
  isValid: boolean;
  error?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * Validate Supabase request for security compliance
 */
export const validateSupabaseRequest = (request: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
}): SecurityValidationResult => {
  const { url, method, headers = {} } = request;

  // Check for required security headers
  const requiredHeaders = ['x-requested-with'];
  const missingHeaders = requiredHeaders.filter(
    header => !headers[header.toLowerCase()]
  );

  if (missingHeaders.length > 0) {
    return {
      isValid: false,
      error: `Missing required security headers: ${missingHeaders.join(', ')}`,
      riskLevel: 'medium'
    };
  }

  // Validate request method
  const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (method && !allowedMethods.includes(method.toUpperCase())) {
    return {
      isValid: false,
      error: `Invalid HTTP method: ${method}`,
      riskLevel: 'high'
    };
  }

  // Check for suspicious patterns in URL
  if (url) {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:/i,
      /vbscript:/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return {
          isValid: false,
          error: 'Suspicious content detected in request URL',
          riskLevel: 'high'
        };
      }
    }
  }

  return {
    isValid: true,
    riskLevel: 'low'
  };
};

/**
 * Validate user session for security
 */
export const validateUserSession = (user: any): SecurityValidationResult => {
  if (!user) {
    return {
      isValid: false,
      error: 'No authenticated user found',
      riskLevel: 'high'
    };
  }

  // Check if user email is verified
  if (!user.email_confirmed_at) {
    return {
      isValid: false,
      error: 'User email not verified',
      riskLevel: 'medium'
    };
  }

  // Check for suspicious user metadata
  const suspiciousMetadata = [
    'admin',
    'super_user',
    'bypass_rls'
  ];

  for (const key of suspiciousMetadata) {
    if (user.user_metadata?.[key] || user.app_metadata?.[key]) {
      return {
        isValid: false,
        error: `Suspicious user metadata detected: ${key}`,
        riskLevel: 'high'
      };
    }
  }

  return {
    isValid: true,
    riskLevel: 'low'
  };
};

/**
 * Sanitize error messages to prevent information leakage
 */
export const sanitizeErrorMessage = (error: any): string => {
  if (!error) return 'Unknown error occurred';

  const errorMessage = error.message || error.toString();
  
  // Remove sensitive information from error messages
  const sanitizedMessage = errorMessage
    .replace(/password/i, '***')
    .replace(/token/i, '***')
    .replace(/key/i, '***')
    .replace(/secret/i, '***')
    .replace(/auth\.[a-z_]+/gi, 'auth.field')
    .replace(/supabase\.[a-z_]+/gi, 'supabase.field');

  return sanitizedMessage;
};

/**
 * Generate security fingerprint for request tracking
 */
export const generateSecurityFingerprint = (request: {
  userAgent?: string;
  ip?: string;
  timestamp?: string;
}): string => {
  const { userAgent = '', ip = '', timestamp = Date.now().toString() } = request;
  
  // Create a hash of request characteristics
  const data = `${userAgent}-${ip}-${timestamp}`;
  return btoa(data).substring(0, 16);
};

/**
 * Check for common attack patterns
 */
export const detectAttackPatterns = (input: string): {
  isAttack: boolean;
  attackType?: string;
  riskLevel: 'low' | 'medium' | 'high';
} => {
  const attackPatterns = [
    { pattern: /<script[^>]*>.*?<\/script>/gi, type: 'XSS', risk: 'high' as const },
    { pattern: /javascript:/gi, type: 'XSS', risk: 'high' as const },
    { pattern: /union\s+select/gi, type: 'SQL Injection', risk: 'high' as const },
    { pattern: /drop\s+table/gi, type: 'SQL Injection', risk: 'high' as const },
    { pattern: /<iframe[^>]*>/gi, type: 'XSS', risk: 'medium' as const },
    { pattern: /on\w+\s*=/gi, type: 'XSS', risk: 'medium' as const },
  ];

  for (const { pattern, type, risk } of attackPatterns) {
    if (pattern.test(input)) {
      return {
        isAttack: true,
        attackType: type,
        riskLevel: risk
      };
    }
  }

  return {
    isAttack: false,
    riskLevel: 'low'
  };
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (identifier: string, limit: number, window: number): {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
} => {
  const now = Date.now();
  const key = `rate_limit_${identifier}`;
  
  // Get current request count from localStorage (client-side)
  const stored = localStorage.getItem(key);
  const data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + window };
  
  // Reset if window expired
  if (now > data.resetTime) {
    data.count = 0;
    data.resetTime = now + window;
  }
  
  const allowed = data.count < limit;
  const remainingRequests = Math.max(0, limit - data.count);
  
  if (allowed) {
    data.count++;
    localStorage.setItem(key, JSON.stringify(data));
  }
  
  return {
    allowed,
    remainingRequests,
    resetTime: data.resetTime
  };
};
