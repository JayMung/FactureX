/**
 * CSRF Protection Middleware for Supabase Edge Functions
 * 
 * Usage:
 * import { validateCSRF } from '../_shared/csrf-middleware.ts';
 * 
 * Deno.serve(async (req) => {
 *   const csrfError = validateCSRF(req);
 *   if (csrfError) return csrfError;
 *   
 *   // Your function logic here
 * });
 */

// Note: Deno is available in Edge Functions runtime
// @ts-ignore - Deno is available in Supabase Edge Functions
const ALLOWED_ORIGINS = [
  Deno?.env?.get('APP_URL'),
  'http://localhost:5173',
  'http://localhost:3000',
  // Add production URLs
].filter(Boolean) as string[];

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CUSTOM_HEADER = 'x-requested-with';

/**
 * Validate CSRF token and origin
 */
export function validateCSRF(req: Request): Response | null {
  const method = req.method.toUpperCase();
  
  // Only validate state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }

  // 1. Validate Origin header
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  
  if (!origin && !referer) {
    return new Response(
      JSON.stringify({ error: 'Missing origin or referer header' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const requestOrigin = origin || new URL(referer!).origin;
  
  if (!ALLOWED_ORIGINS.includes(requestOrigin)) {
    console.error(`CSRF: Invalid origin ${requestOrigin}`);
    return new Response(
      JSON.stringify({ error: 'Invalid origin' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 2. Validate custom header (X-Requested-With)
  const customHeader = req.headers.get(CUSTOM_HEADER);
  
  if (customHeader !== 'XMLHttpRequest') {
    console.error('CSRF: Missing or invalid X-Requested-With header');
    return new Response(
      JSON.stringify({ error: 'Missing required header' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // 3. Validate CSRF token (optional, for extra security)
  const csrfToken = req.headers.get(CSRF_TOKEN_HEADER);
  
  if (!csrfToken || csrfToken.length !== 64) {
    console.error('CSRF: Missing or invalid CSRF token');
    return new Response(
      JSON.stringify({ error: 'Invalid CSRF token' }),
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // All validations passed
  return null;
}

/**
 * CORS headers for Edge Functions
 */
export function getCORSHeaders(origin?: string): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) 
    ? origin 
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token, x-requested-with',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCORS(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin');
    return new Response(null, {
      status: 204,
      headers: getCORSHeaders(origin || undefined),
    });
  }
  return null;
}

/**
 * Complete CSRF + CORS validation
 */
export function validateRequest(req: Request): Response | null {
  // Handle CORS preflight
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  // Validate CSRF for state-changing methods
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  return null;
}

/**
 * Wrap response with CORS headers
 */
export function withCORS(response: Response, origin?: string | null): Response {
  const headers = new Headers(response.headers);
  const corsHeaders = getCORSHeaders(origin || undefined);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
