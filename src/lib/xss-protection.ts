/**
 * XSS Protection Utilities
 * Provides client-side sanitization for defense in depth
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Removes dangerous HTML tags, attributes, and protocols
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gis, '');
  
  // Remove all HTML tags except safe ones
  const allowedTags = ['p', 'br', 'b', 'i', 'strong', 'em', 'u', 'span'];
  sanitized = sanitized.replace(/<(?!\/?(p|br|b|i|strong|em|u|span)\b)[^>]*>/gis, '');
  
  // Remove event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gis, '');
  
  // Remove dangerous protocols
  sanitized = sanitized.replace(/javascript:/gis, '');
  sanitized = sanitized.replace(/vbscript:/gis, '');
  sanitized = sanitized.replace(/data:(?!image\/)/gis, '');
  
  // Remove dangerous tags
  const dangerousTags = ['iframe', 'object', 'embed', 'meta', 'link', 'style'];
  dangerousTags.forEach(tag => {
    sanitized = sanitized.replace(new RegExp(`<\\/?${tag}[^>]*>`, 'gis'), '');
  });
  
  // Remove HTML comments
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove srcdoc attributes (can contain HTML)
  sanitized = sanitized.replace(/\s*srcdoc\s*=\s*["'][^"']*["']/gis, '');
  
  // Remove form and input tags
  sanitized = sanitized.replace(/<\/?(form|input|button|select|textarea)[^>]*>/gis, '');
  
  return sanitized.trim();
}

/**
 * Sanitizes URLs to prevent XSS via javascript: or data: protocols
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
  // Remove dangerous protocols
  let sanitized = url.replace(/javascript:/gis, '');
  sanitized = sanitized.replace(/vbscript:/gis, '');
  sanitized = sanitized.replace(/data:(?!image\/)/gis, '');
  
  // Remove script tags
  sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gis, '');
  
  // Remove HTML tags completely from URLs
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Basic URL validation
  if (sanitized && !sanitized.match(/^https?:\/\//) && !sanitized.match(/^\/\//)) {
    // If it doesn't look like a URL, return empty
    return '';
  }
  
  return sanitized.trim();
}

/**
 * Encodes HTML entities for safe display
 */
export function encodeHtml(input: string): string {
  if (!input) return '';
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Safe HTML rendering component props
 */
export interface SafeHtmlProps {
  content: string;
  className?: string;
  tag?: keyof JSX.IntrinsicElements;
}

/**
 * Creates a safe HTML string for rendering
 */
export function createSafeHtml(content: string): string {
  return encodeHtml(content);
}
