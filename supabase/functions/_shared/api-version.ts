/**
 * API Versioning Utilities
 * 
 * Provides version extraction, validation, and deprecation headers
 * for all FactureX API endpoints.
 * 
 * Versioned routes:   /v1/api-transactions, /v1/api-clients, etc.
 * Legacy routes:      /api-transactions, /api-clients, etc. (deprecated, still supported)
 * 
 * Clients can also specify the version via the X-API-Version header,
 * which takes precedence over the URL path.
 */

// ============================================================================
// Constants
// ============================================================================

/** Current (latest) API version */
export const CURRENT_API_VERSION = 'v1';

/** All supported API versions */
export const SUPPORTED_VERSIONS = ['v1'] as const;

export type ApiVersion = typeof SUPPORTED_VERSIONS[number];

/** Date when unversioned (legacy) routes will be removed */
export const LEGACY_SUNSET_DATE = '2026-06-01';

// ============================================================================
// Version Extraction
// ============================================================================

/**
 * Extract the API version from the request.
 * 
 * Priority:
 *   1. X-API-Version header  (e.g. "v1")
 *   2. URL path prefix       (e.g. /v1/api-transactions)
 *   3. Falls back to null    (legacy / unversioned request)
 */
export function extractApiVersion(req: Request): ApiVersion | null {
  // 1. Check header
  const headerVersion = req.headers.get('X-API-Version');
  if (headerVersion && isValidVersion(headerVersion)) {
    return headerVersion as ApiVersion;
  }

  // 2. Check URL path
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);

  // Supabase Edge Functions path: /<function-name>/v1/...
  // The function name is the first segment; version would be the second.
  if (pathSegments.length >= 2) {
    const potentialVersion = pathSegments[1];
    if (isValidVersion(potentialVersion)) {
      return potentialVersion as ApiVersion;
    }
  }

  // Also check if v1 is the first segment (direct invocation)
  if (pathSegments.length >= 1 && isValidVersion(pathSegments[0])) {
    return pathSegments[0] as ApiVersion;
  }

  return null;
}

/**
 * Check if a string is a valid API version
 */
export function isValidVersion(version: string): boolean {
  return (SUPPORTED_VERSIONS as readonly string[]).includes(version);
}

// ============================================================================
// Deprecation Headers
// ============================================================================

/**
 * Build standard versioning headers to include in every API response.
 * 
 * For versioned requests (/v1/...):
 *   - X-API-Version: v1
 * 
 * For legacy (unversioned) requests:
 *   - X-API-Version: v1  (resolved version)
 *   - Deprecation: true
 *   - Sunset: <date>
 *   - X-API-Deprecation-Notice: human-readable message
 */
export function getVersionHeaders(
  resolvedVersion: ApiVersion,
  isLegacy: boolean,
  functionName: string
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-API-Version': resolvedVersion,
  };

  if (isLegacy) {
    headers['Deprecation'] = 'true';
    headers['Sunset'] = LEGACY_SUNSET_DATE;
    headers['X-API-Deprecation-Notice'] =
      `Unversioned API routes are deprecated and will be removed on ${LEGACY_SUNSET_DATE}. ` +
      `Please migrate to /v1/${functionName}. ` +
      `See documentation: /docs/api/migration-guide`;
  }

  return headers;
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Merge version headers into an existing headers object.
 */
export function withVersionHeaders(
  existingHeaders: Record<string, string>,
  req: Request,
  functionName: string
): Record<string, string> {
  const version = extractApiVersion(req);
  const resolvedVersion = version || CURRENT_API_VERSION;
  const isLegacy = version === null;

  return {
    ...existingHeaders,
    ...getVersionHeaders(resolvedVersion, isLegacy, functionName),
  };
}

/**
 * Build a version metadata object to include in the response body.
 */
export function getVersionMeta(req: Request, functionName: string): {
  api_version: string;
  deprecated?: boolean;
  sunset?: string;
  migration_url?: string;
} {
  const version = extractApiVersion(req);
  const isLegacy = version === null;
  const resolvedVersion = version || CURRENT_API_VERSION;

  const meta: {
    api_version: string;
    deprecated?: boolean;
    sunset?: string;
    migration_url?: string;
  } = {
    api_version: resolvedVersion,
  };

  if (isLegacy) {
    meta.deprecated = true;
    meta.sunset = LEGACY_SUNSET_DATE;
    meta.migration_url = `/v1/${functionName}`;
  }

  return meta;
}
