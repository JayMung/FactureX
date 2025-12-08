/**
 * API Authentication & Authorization
 * Handles API key validation, permissions, and rate limiting
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Ratelimit } from "https://esm.sh/@upstash/ratelimit@0.4.4";
import { Redis } from "https://esm.sh/@upstash/redis@1.22.0";
import type { ApiKey, ApiKeyType, RATE_LIMITS } from './api-types.ts';
import { Errors } from './api-response.ts';

// ============================================================================
// Environment & Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Initialize Redis for rate limiting (optional, falls back to in-memory)
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

try {
  const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  
  if (redisUrl && redisToken) {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    // Default rate limit: 1000 requests per hour for secret keys
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, "1 h"),
      analytics: true,
      prefix: "ratelimit:api",
    });
  }
} catch (error) {
  console.warn('Redis not configured, rate limiting disabled:', error);
}

// ============================================================================
// API Key Validation
// ============================================================================

/**
 * Extract API key from request headers
 */
export function extractApiKey(req: Request): string | null {
  return req.headers.get('X-API-Key') || req.headers.get('Authorization')?.replace('Bearer ', '');
}

/**
 * Extract organization ID from request headers
 */
export function extractOrganizationId(req: Request): string | null {
  return req.headers.get('X-Organization-ID');
}

/**
 * Hash API key for storage (SHA-256)
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate API key and return key details
 */
export async function validateApiKey(
  apiKey: string,
  organizationId: string
): Promise<{ valid: boolean; keyData?: ApiKey; error?: Response }> {
  if (!apiKey || !organizationId) {
    return {
      valid: false,
      error: Errors.UNAUTHORIZED('Missing API key or organization ID')
    };
  }

  // Extract key prefix (pk_live_, sk_live_, ak_live_)
  const prefix = apiKey.substring(0, 8);
  
  if (!['pk_live_', 'sk_live_', 'ak_live_'].includes(prefix)) {
    return {
      valid: false,
      error: Errors.UNAUTHORIZED('Invalid API key format')
    };
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Hash the provided key
    const keyHash = await hashApiKey(apiKey);
    
    // Query the api_keys table
    const { data: keyData, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', keyHash)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !keyData) {
      return {
        valid: false,
        error: Errors.UNAUTHORIZED('Invalid or expired API key')
      };
    }

    // Check expiration
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return {
        valid: false,
        error: Errors.UNAUTHORIZED('API key has expired')
      };
    }

    // Update last_used_at
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    return {
      valid: true,
      keyData: keyData as ApiKey
    };
  } catch (error) {
    console.error('API key validation error:', error);
    return {
      valid: false,
      error: Errors.INTERNAL_ERROR('Failed to validate API key')
    };
  }
}

/**
 * Check if API key has required permission
 */
export function hasPermission(keyData: ApiKey, requiredPermission: string): boolean {
  // Admin keys have all permissions
  if (keyData.permissions.includes('*')) {
    return true;
  }

  // Check for wildcard permissions (e.g., 'read:*')
  const [action, resource] = requiredPermission.split(':');
  const wildcardPermission = `${action}:*`;
  
  if (keyData.permissions.includes(wildcardPermission)) {
    return true;
  }

  // Check for exact permission
  return keyData.permissions.includes(requiredPermission);
}

/**
 * Validate permission for endpoint
 */
export function validatePermission(
  keyData: ApiKey,
  requiredPermission: string
): Response | null {
  if (!hasPermission(keyData, requiredPermission)) {
    return Errors.FORBIDDEN(`Missing permission: ${requiredPermission}`);
  }
  return null;
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Apply rate limiting based on API key type
 */
export async function applyRateLimit(
  keyData: ApiKey,
  identifier: string
): Promise<Response | null> {
  if (!ratelimit) {
    // Rate limiting not configured, skip
    return null;
  }

  try {
    // Determine rate limit based on key type
    const limits = {
      public: { requests: 100, window: '1 h' },
      secret: { requests: 1000, window: '1 h' },
      admin: { requests: 5000, window: '1 h' }
    };

    const limit = limits[keyData.type];
    
    // Create rate limiter for this key type
    const keyRatelimit = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit.requests, limit.window),
      analytics: true,
      prefix: `ratelimit:api:${keyData.type}`,
    });

    const { success, remaining, reset } = await keyRatelimit.limit(identifier);

    if (!success) {
      return Errors.RATE_LIMIT(limit.requests, limit.window);
    }

    // Add rate limit headers to response (will be added by caller)
    return null;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Don't block request if rate limiting fails
    return null;
  }
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Log API request for audit trail
 */
export async function logApiRequest(
  keyData: ApiKey,
  req: Request,
  statusCode: number,
  responseTimeMs: number,
  errorMessage?: string
): Promise<void> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const url = new URL(req.url);
    
    await supabase.from('api_audit_logs').insert({
      organization_id: keyData.organization_id,
      api_key_id: keyData.id,
      endpoint: url.pathname,
      method: req.method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      error_message: errorMessage
    });
  } catch (error) {
    console.error('Failed to log API request:', error);
    // Don't throw, logging failure shouldn't break the request
  }
}

// ============================================================================
// Complete Authentication Flow
// ============================================================================

/**
 * Complete authentication and authorization flow
 * Returns keyData if successful, or error Response
 */
export async function authenticateRequest(
  req: Request,
  requiredPermission?: string
): Promise<{ keyData: ApiKey } | { error: Response }> {
  const startTime = Date.now();
  
  // Extract credentials
  const apiKey = extractApiKey(req);
  const organizationId = extractOrganizationId(req);

  if (!apiKey || !organizationId) {
    return { error: Errors.UNAUTHORIZED('Missing API key or organization ID') };
  }

  // Validate API key
  const { valid, keyData, error } = await validateApiKey(apiKey, organizationId);
  
  if (!valid || !keyData) {
    await logApiRequest(
      { organization_id: organizationId } as ApiKey,
      req,
      401,
      Date.now() - startTime,
      'Invalid API key'
    );
    return { error: error || Errors.UNAUTHORIZED() };
  }

  // Check permissions
  if (requiredPermission) {
    const permissionError = validatePermission(keyData, requiredPermission);
    if (permissionError) {
      await logApiRequest(keyData, req, 403, Date.now() - startTime, 'Insufficient permissions');
      return { error: permissionError };
    }
  }

  // Apply rate limiting
  const rateLimitError = await applyRateLimit(keyData, `${keyData.organization_id}:${keyData.id}`);
  if (rateLimitError) {
    await logApiRequest(keyData, req, 429, Date.now() - startTime, 'Rate limit exceeded');
    return { error: rateLimitError };
  }

  return { keyData };
}

// ============================================================================
// API Key Generation (for admin endpoints)
// ============================================================================

/**
 * Generate a new API key
 */
export function generateApiKey(type: ApiKeyType): string {
  const prefix = type === 'public' ? 'pk_live_' : type === 'secret' ? 'sk_live_' : 'ak_live_';
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const randomString = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}${randomString}`;
}

/**
 * Create a new API key in the database
 */
export async function createApiKey(
  organizationId: string,
  name: string,
  type: ApiKeyType,
  permissions: string[],
  createdBy: string,
  expiresInDays?: number
): Promise<{ key: string; keyData: ApiKey } | { error: Response }> {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Generate new key
    const key = generateApiKey(type);
    const keyHash = await hashApiKey(key);
    const keyPrefix = key.substring(0, 8);
    
    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;
    
    // Insert into database
    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        organization_id: organizationId,
        name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        type,
        permissions,
        is_active: true,
        expires_at: expiresAt,
        created_by: createdBy
      })
      .select()
      .single();

    if (error || !data) {
      return { error: Errors.INTERNAL_ERROR('Failed to create API key') };
    }

    return {
      key, // Return the plain key only once
      keyData: data as ApiKey
    };
  } catch (error) {
    console.error('API key creation error:', error);
    return { error: Errors.INTERNAL_ERROR('Failed to create API key') };
  }
}
