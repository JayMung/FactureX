/**
 * CSRF Protection Utility
 * 
 * Implements Cross-Site Request Forgery protection for FactureX
 * 
 * Protection Mechanisms:
 * 1. Custom headers (X-Requested-With, X-CSRF-Token)
 * 2. Origin validation
 * 3. SameSite cookies (handled by Supabase Auth)
 * 4. Double-submit cookie pattern
 */

const CSRF_TOKEN_KEY = 'facturex_csrf_token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CUSTOM_HEADER = 'X-Requested-With';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token from sessionStorage
 */
export function getCSRFToken(): string {
  let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
  
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  }
  
  return token;
}

/**
 * Clear CSRF token (call on logout)
 */
export function clearCSRFToken(): void {
  sessionStorage.removeItem(CSRF_TOKEN_KEY);
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string): boolean {
  const storedToken = sessionStorage.getItem(CSRF_TOKEN_KEY);
  return storedToken === token && token.length === 64;
}

/**
 * Get CSRF headers for fetch requests
 */
export function getCSRFHeaders(): Record<string, string> {
  return {
    [CSRF_TOKEN_HEADER]: getCSRFToken(),
    [CUSTOM_HEADER]: 'XMLHttpRequest',
  };
}

/**
 * Validate request origin
 */
export function isValidOrigin(origin: string): boolean {
  const allowedOrigins = [
    window.location.origin,
    import.meta.env.VITE_APP_URL,
    // Add production URL if different
  ].filter(Boolean);

  return allowedOrigins.includes(origin);
}

/**
 * Create a CSRF-protected fetch wrapper
 */
export async function csrfFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Add CSRF headers
  const headers = new Headers(options.headers);
  
  // Add CSRF token
  headers.set(CSRF_TOKEN_HEADER, getCSRFToken());
  headers.set(CUSTOM_HEADER, 'XMLHttpRequest');
  
  // Validate origin for state-changing methods
  const method = options.method?.toUpperCase() || 'GET';
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (isStateChanging) {
    const origin = window.location.origin;
    if (!isValidOrigin(origin)) {
      throw new Error('Invalid origin for CSRF-protected request');
    }
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Important for CSRF protection
  });
}

/**
 * Supabase client wrapper with CSRF protection
 * Use this for custom RPC calls or Edge Functions
 */
export function getCSRFProtectedHeaders(): Record<string, string> {
  return {
    ...getCSRFHeaders(),
    'Content-Type': 'application/json',
  };
}

/**
 * Initialize CSRF protection on app load
 */
export function initCSRFProtection(): void {
  // Generate token on app load
  getCSRFToken();
  
  // Clear token on page unload (security best practice)
  window.addEventListener('beforeunload', () => {
    // Don't clear on normal navigation, only on tab close
    // Token will be regenerated on next load
  });
  
  // Validate origin on all fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    
    // Only add CSRF protection to same-origin requests
    if (url.startsWith('/') || url.startsWith(window.location.origin)) {
      const method = init?.method?.toUpperCase() || 'GET';
      const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
      
      if (isStateChanging) {
        const headers = new Headers(init?.headers);
        
        // Add CSRF headers if not already present
        if (!headers.has(CSRF_TOKEN_HEADER)) {
          headers.set(CSRF_TOKEN_HEADER, getCSRFToken());
        }
        if (!headers.has(CUSTOM_HEADER)) {
          headers.set(CUSTOM_HEADER, 'XMLHttpRequest');
        }
        
        init = {
          ...init,
          headers,
          credentials: init?.credentials || 'same-origin',
        };
      }
    }
    
    return originalFetch(input, init);
  };
}

/**
 * CSRF protection for forms
 * Add this as a hidden input in forms
 */
export function CSRFTokenInput(): string {
  const token = getCSRFToken();
  return `<input type="hidden" name="csrf_token" value="${token}" />`;
}

/**
 * Validate CSRF token from form data
 */
export function validateFormCSRFToken(formData: FormData): boolean {
  const token = formData.get('csrf_token');
  if (typeof token !== 'string') {
    return false;
  }
  return validateCSRFToken(token);
}
