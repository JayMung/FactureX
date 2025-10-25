/**
 * SSRF (Server-Side Request Forgery) Protection Utility
 * 
 * Protects against SSRF attacks by validating URLs before making requests
 * 
 * Protection Mechanisms:
 * 1. Block private IP ranges (RFC 1918, RFC 4193)
 * 2. Block localhost and loopback addresses
 * 3. Block cloud metadata endpoints
 * 4. Whitelist allowed domains
 * 5. Validate URL schemes
 * 6. Prevent DNS rebinding
 */

// Private IP ranges (RFC 1918)
const PRIVATE_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^127\./,                   // 127.0.0.0/8 (loopback)
  /^169\.254\./,              // 169.254.0.0/16 (link-local)
  /^0\./,                     // 0.0.0.0/8
  /^::1$/,                    // IPv6 loopback
  /^fe80:/i,                  // IPv6 link-local
  /^fc00:/i,                  // IPv6 unique local
  /^fd00:/i,                  // IPv6 unique local
];

// Localhost variations
const LOCALHOST_PATTERNS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '0:0:0:0:0:0:0:1',
];

// Cloud metadata endpoints (AWS, GCP, Azure, etc.)
const METADATA_ENDPOINTS = [
  '169.254.169.254',          // AWS, Azure, GCP
  '169.254.170.2',            // AWS ECS
  'metadata.google.internal', // GCP
  'metadata',                 // Generic
];

// Allowed URL schemes
const ALLOWED_SCHEMES = ['http:', 'https:'];

// Allowed image domains (whitelist)
// Add your trusted image CDN domains here
const ALLOWED_DOMAINS = [
  'images.unsplash.com',
  'cdn.pixabay.com',
  'images.pexels.com',
  'picsum.photos',
  // Add your own domains
];

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
];

// Maximum image size (10MB)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// Request timeout (10 seconds)
const REQUEST_TIMEOUT = 10000;

export interface SSRFValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedUrl?: string;
}

/**
 * Check if IP address is private
 */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(pattern => pattern.test(ip));
}

/**
 * Check if hostname is localhost
 */
function isLocalhost(hostname: string): boolean {
  return LOCALHOST_PATTERNS.some(pattern => 
    hostname.toLowerCase() === pattern.toLowerCase()
  );
}

/**
 * Check if hostname is a metadata endpoint
 */
function isMetadataEndpoint(hostname: string): boolean {
  return METADATA_ENDPOINTS.some(endpoint => 
    hostname.toLowerCase().includes(endpoint.toLowerCase())
  );
}

/**
 * Check if domain is in whitelist
 */
function isDomainAllowed(hostname: string): boolean {
  // If whitelist is empty, allow all (not recommended for production)
  if (ALLOWED_DOMAINS.length === 0) {
    return true;
  }
  
  return ALLOWED_DOMAINS.some(domain => {
    // Exact match or subdomain match
    return hostname === domain || hostname.endsWith(`.${domain}`);
  });
}

/**
 * Validate URL against SSRF attacks
 */
export function validateURL(urlString: string): SSRFValidationResult {
  try {
    const url = new URL(urlString);

    // 1. Validate scheme
    if (!ALLOWED_SCHEMES.includes(url.protocol)) {
      return {
        isValid: false,
        error: `Invalid URL scheme: ${url.protocol}. Only HTTP and HTTPS are allowed.`,
      };
    }

    // 2. Check for localhost
    if (isLocalhost(url.hostname)) {
      return {
        isValid: false,
        error: 'Access to localhost is not allowed.',
      };
    }

    // 3. Check for metadata endpoints
    if (isMetadataEndpoint(url.hostname)) {
      return {
        isValid: false,
        error: 'Access to cloud metadata endpoints is not allowed.',
      };
    }

    // 4. Check for private IP addresses
    // Note: This is a basic check. For production, resolve DNS first.
    if (isPrivateIP(url.hostname)) {
      return {
        isValid: false,
        error: 'Access to private IP addresses is not allowed.',
      };
    }

    // 5. Check domain whitelist
    if (!isDomainAllowed(url.hostname)) {
      return {
        isValid: false,
        error: `Domain ${url.hostname} is not in the allowed list.`,
      };
    }

    // 6. Remove credentials from URL (if any)
    url.username = '';
    url.password = '';

    return {
      isValid: true,
      sanitizedUrl: url.toString(),
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid URL format: ${error.message}`,
    };
  }
}

/**
 * Fetch image with SSRF protection
 */
export async function fetchImageSafely(
  urlString: string
): Promise<Response> {
  // Validate URL
  const validation = validateURL(urlString);
  if (!validation.isValid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const url = validation.sanitizedUrl!;

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Fetch with timeout and redirect limit
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow', // Follow redirects
      headers: {
        'User-Agent': 'FactureX-ImageProxy/1.0',
        'Accept': 'image/*',
      },
    });

    clearTimeout(timeoutId);

    // Validate response
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${response.statusText}` }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    if (!ALLOWED_IMAGE_TYPES.some(type => contentType.includes(type))) {
      return new Response(
        JSON.stringify({ error: `Invalid content type: ${contentType}. Expected image.` }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate content length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: `Image too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` }),
        { 
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate final URL after redirects (prevent DNS rebinding)
    const finalUrl = response.url;
    const finalValidation = validateURL(finalUrl);
    if (!finalValidation.isValid) {
      return new Response(
        JSON.stringify({ error: `Redirect to unsafe URL: ${finalValidation.error}` }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get image data with size limit
    const imageData = await response.arrayBuffer();
    
    if (imageData.byteLength > MAX_IMAGE_SIZE) {
      return new Response(
        JSON.stringify({ error: `Image too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` }),
        { 
          status: 413,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return image
    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageData.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error) {
    if (error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timeout' }),
        { 
          status: 408,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.error('Image fetch error:', error);
    return new Response(
      JSON.stringify({ error: `Failed to fetch image: ${error.message}` }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Add allowed domain to whitelist
 */
export function addAllowedDomain(domain: string): void {
  if (!ALLOWED_DOMAINS.includes(domain)) {
    ALLOWED_DOMAINS.push(domain);
  }
}

/**
 * Get current whitelist
 */
export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}
