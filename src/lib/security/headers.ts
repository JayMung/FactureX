/**
 * Security headers configuration
 */

export const securityHeaders = {
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://ddnxtuhswmewoxrwswzg.supabase.co wss://ddnxtuhswmewoxrwswzg.supabase.co",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ].join('; '),

  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',

  // Prevent clickjacking
  'X-Frame-Options': 'DENY',

  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',

  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Control feature policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()'
  ].join(', '),

  // HSTS (only in production)
  ...(import.meta.env.PROD ? {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  } : {})
};

/**
 * CSRF protection headers
 */
export const csrfHeaders = {
  'X-Requested-With': 'XMLHttpRequest',
  'X-CSRF-Token': generateCSRFToken()
};

/**
 * Generate CSRF token
 */
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Get all security headers for a request
 */
export const getAllSecurityHeaders = (): Record<string, string> => {
  return {
    ...securityHeaders,
    ...csrfHeaders
  };
};

/**
 * Validate security headers are present
 */
export const validateSecurityHeaders = (headers: Record<string, string>): {
  isValid: boolean;
  missingHeaders: string[];
} => {
  const requiredHeaders = Object.keys(securityHeaders);
  const missingHeaders = requiredHeaders.filter(header => !headers[header]);

  return {
    isValid: missingHeaders.length === 0,
    missingHeaders
  };
};

/**
 * Apply security headers to fetch options
 */
export const applySecurityHeaders = (options: RequestInit = {}): RequestInit => {
  const headers = new Headers(options.headers);
  
  // Add all security headers
  Object.entries(getAllSecurityHeaders()).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return {
    ...options,
    headers
  };
};

/**
 * Get CSRF protection headers
 */
export const getCSRFHeaders = (): Record<string, string> => {
  return {
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 'no-token'
  };
};
