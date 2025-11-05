/**
 * Content Sanitization Security Utilities
 * 
 * Prevents XSS attacks by sanitizing user-generated content
 * before displaying it in the UI.
 */

import DOMPurify from 'dompurify';

// Configure DOMPurify for optimal security
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  // Allow safe attributes for specific elements
  if (data.attrName === 'class' && ['span', 'div', 'p', 'strong', 'em'].includes(node.tagName?.toLowerCase())) {
    // Only allow specific safe CSS classes
    const allowedClasses = [
      'font-bold', 'font-medium', 'font-normal',
      'text-red-500', 'text-green-500', 'text-blue-500', 'text-yellow-500',
      'bg-red-50', 'bg-green-50', 'bg-blue-50', 'bg-yellow-50',
      'border-red-200', 'border-green-200', 'border-blue-200', 'border-yellow-200',
      'truncate', 'text-center', 'text-left', 'text-right',
      'uppercase', 'lowercase', 'capitalize'
    ];
    
    if (data.attrValue && !allowedClasses.some(cls => data.attrValue.includes(cls))) {
      data.keepAttr = false;
    }
  }
  
  // Remove all style attributes except for safe CSS properties
  if (data.attrName === 'style') {
    const allowedStyles = ['color', 'font-weight', 'text-decoration'];
    const styleValue = data.attrValue;
    
    if (styleValue) {
      const hasAllowedStyle = allowedStyles.some(style => 
        styleValue.includes(style)
      );
      
      if (!hasAllowedStyle) {
        data.keepAttr = false;
      }
    }
  }
  
  // Remove dangerous attributes
  const dangerousAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur'];
  if (dangerousAttrs.includes(data.attrName.toLowerCase())) {
    data.keepAttr = false;
  }
});

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  // Allow only safe elements
  const allowedElements = [
    'p', 'br', 'strong', 'em', 'u', 'i', 'b',
    'span', 'div', 'small', 'sub', 'sup',
    'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'blockquote', 'code', 'pre'
  ];
  
  if (!allowedElements.includes(data.tagName.toLowerCase())) {
    // Remove disallowed elements but keep their text content
    if (node.textContent) {
      node.parentNode?.replaceChild(document.createTextNode(node.textContent), node);
    }
  }
});

export interface SanitizationConfig {
  allowedTags?: string[];
  allowedAttributes?: string[];
  allowHTML?: boolean;
  stripHTML?: boolean;
  maxLength?: number;
  preserveWhitespace?: boolean;
}

const DEFAULT_CONFIG: SanitizationConfig = {
  allowHTML: false,
  stripHTML: true,
  maxLength: 1000,
  preserveWhitespace: true
};

/**
 * Sanitize text content to prevent XSS attacks
 */
export const sanitizeText = (text: string, config: Partial<SanitizationConfig> = {}): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Trim and limit length
  let sanitized = text.trim();
  
  if (finalConfig.maxLength && sanitized.length > finalConfig.maxLength) {
    sanitized = sanitized.substring(0, finalConfig.maxLength);
  }

  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Control characters
    .replace(/[\uFFFE\uFFFF]/g, '') // Invalid Unicode
    .replace(/[\u2028\u2029]/g, ' '); // Line/paragraph separators

  if (finalConfig.stripHTML) {
    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // HTML entity encoding for special characters
  if (!finalConfig.allowHTML) {
    sanitized = encodeHTML(sanitized);
  }

  return sanitized;
};

/**
 * Sanitize HTML content while preserving safe formatting
 */
export const sanitizeHTML = (html: string, config: Partial<SanitizationConfig> = {}): string => {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const finalConfig = { ...DEFAULT_CONFIG, ...config, allowHTML: true, stripHTML: false };

  // Use DOMPurify for comprehensive HTML sanitization
  const cleanHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: finalConfig.allowedTags || [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'span', 'div', 'small', 'sub', 'sup',
      'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'code', 'pre'
    ],
    ALLOWED_ATTR: finalConfig.allowedAttributes || ['class'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea'],
    FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'onfocus', 'onblur', 'style']
  });

  return cleanHTML;
};

/**
 * Sanitize attribute values (like title, alt, etc.)
 */
export const sanitizeAttribute = (value: string): string => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value
    .replace(/[<>"'&]/g, '') // Remove HTML special characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 200); // Limit length
};

/**
 * Sanitize URLs to prevent XSS
 */
export const sanitizeURL = (url: string): string => {
  if (!url || typeof url !== 'string') {
    return '';
  }

  try {
    // Remove dangerous protocols
    const cleanURL = url
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      .trim();

    // Basic URL validation
    if (cleanURL.startsWith('http://') || cleanURL.startsWith('https://') || cleanURL.startsWith('/')) {
      return cleanURL.substring(0, 500); // Limit length
    }

    return '';
  } catch {
    return '';
  }
};

/**
 * Sanitize client names specifically
 */
export const sanitizeClientName = (name: string): string => {
  return sanitizeText(name, {
    maxLength: 100,
    allowHTML: false,
    stripHTML: true,
    preserveWhitespace: false
  });
};

/**
 * Sanitize phone numbers specifically
 */
export const sanitizePhoneNumber = (phone: string): string => {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Keep only digits, plus, spaces, hyphens, and parentheses
  const cleaned = phone.replace(/[^\d\+\-\s\(\)]/g, '');
  
  return cleaned.substring(0, 20); // Reasonable phone number length
};

/**
 * Sanitize city names specifically
 */
export const sanitizeCityName = (city: string): string => {
  return sanitizeText(city, {
    maxLength: 50,
    allowHTML: false,
    stripHTML: true,
    preserveWhitespace: false
  });
};

/**
 * Sanitize transaction motifs/descriptions
 */
export const sanitizeTransactionMotif = (motif: string): string => {
  return sanitizeText(motif, {
    maxLength: 100,
    allowHTML: false,
    stripHTML: true,
    preserveWhitespace: false
  });
};

/**
 * Sanitize payment method descriptions
 */
export const sanitizePaymentMethod = (method: string): string => {
  return sanitizeText(method, {
    maxLength: 50,
    allowHTML: false,
    stripHTML: true,
    preserveWhitespace: false
  });
};

/**
 * Encode HTML special characters
 */
export const encodeHTML = (str: string): string => {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Decode HTML entities (use with caution)
 */
export const decodeHTML = (str: string): string => {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
};

/**
 * Sanitize user input for display in tooltips or popovers
 */
export const sanitizeTooltip = (content: string): string => {
  return sanitizeText(content, {
    maxLength: 200,
    allowHTML: false,
    stripHTML: true,
    preserveWhitespace: true
  });
};

/**
 * Sanitize content for CSV export
 */
export const sanitizeCSV = (value: string): string => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  // Remove CSV injection characters
  return value
    .replace(/^[=+\-@]/, '') // Remove formula starters
    .replace(/[\t\n\r]/g, ' ') // Replace line breaks with spaces
    .replace(/"/g, '""') // Escape quotes
    .trim()
    .substring(0, 1000);
};

/**
 * Comprehensive sanitization for user-generated content
 */
export const sanitizeUserContent = (
  content: string, 
  type: 'text' | 'html' | 'attribute' | 'url' | 'client-name' | 'phone' | 'city' | 'motif' | 'payment-method' | 'tooltip' | 'csv' = 'text'
): string => {
  switch (type) {
    case 'html':
      return sanitizeHTML(content);
    case 'attribute':
      return sanitizeAttribute(content);
    case 'url':
      return sanitizeURL(content);
    case 'client-name':
      return sanitizeClientName(content);
    case 'phone':
      return sanitizePhoneNumber(content);
    case 'city':
      return sanitizeCityName(content);
    case 'motif':
      return sanitizeTransactionMotif(content);
    case 'payment-method':
      return sanitizePaymentMethod(content);
    case 'tooltip':
      return sanitizeTooltip(content);
    case 'csv':
      return sanitizeCSV(content);
    default:
      return sanitizeText(content);
  }
};

/**
 * React hook for safe content rendering
 */
export const useSanitizedContent = (content: string, type: Parameters<typeof sanitizeUserContent>[1] = 'text') => {
  return sanitizeUserContent(content, type);
};

/**
 * Security validation for content length and patterns
 */
export const validateContentSecurity = (content: string, patterns: RegExp[] = []): {
  isValid: boolean;
  threats: string[];
  sanitized: string;
} => {
  const threats: string[] = [];
  
  // Check for common XSS patterns
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<form\b[^>]*>/gi,
    /<input\b[^>]*>/gi,
    /<textarea\b[^>]*>/gi
  ];

  const allPatterns = [...xssPatterns, ...patterns];
  
  allPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      threats.push(`Suspicious pattern detected: ${pattern.source}`);
    }
  });

  const sanitized = sanitizeText(content);
  const isValid = threats.length === 0;

  return {
    isValid,
    threats,
    sanitized
  };
};

export default {
  sanitizeText,
  sanitizeHTML,
  sanitizeAttribute,
  sanitizeURL,
  sanitizeClientName,
  sanitizePhoneNumber,
  sanitizeCityName,
  sanitizeTransactionMotif,
  sanitizePaymentMethod,
  sanitizeTooltip,
  sanitizeCSV,
  sanitizeUserContent,
  useSanitizedContent,
  validateContentSecurity,
  encodeHTML,
  decodeHTML
};
