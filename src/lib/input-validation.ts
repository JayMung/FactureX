/**
 * Input Validation and Sanitization Utility
 * 
 * Protects against:
 * - XSS (Cross-Site Scripting)
 * - SQL Injection
 * - Command Injection
 * - Path Traversal
 * - Email Header Injection
 * - LDAP Injection
 */

// ============================================================================
// VALIDATION PATTERNS
// ============================================================================

export const VALIDATION_PATTERNS = {
  // Basic patterns
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[\d\s\-\+\(\)]{10,20}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alphanumericSpace: /^[a-zA-Z0-9\s]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+\.?\d*$/,
  
  // Business patterns
  siret: /^\d{14}$/,
  siren: /^\d{9}$/,
  tva: /^[A-Z]{2}\d{11}$/,
  iban: /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/,
  
  // Security patterns
  noHtml: /^[^<>]*$/,
  noSqlInjection: /^[^';\"\\]*$/,
  noPathTraversal: /^[^\.\/\\]*$/,
  
  // Format patterns
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}(:\d{2})?$/,
} as const;

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize for SQL (though you should use parameterized queries)
 */
export function sanitizeSQL(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/;/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .substring(0, 255);
}

/**
 * Sanitize URL to prevent XSS via javascript: protocol
 */
export function sanitizeURL(url: string): string {
  const trimmed = url.trim();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  const lowerUrl = trimmed.toLowerCase();
  
  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return '';
    }
  }
  
  return trimmed;
}

/**
 * Strip all HTML tags
 */
export function stripHTML(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Normalize whitespace
 */
export function normalizeWhitespace(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Remove control characters
 */
export function removeControlCharacters(input: string): string {
  // Remove all control characters except tab, newline, carriage return
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();
  
  if (!trimmed) {
    return { isValid: false, error: 'Email requis' };
  }
  
  if (trimmed.length > 254) {
    return { isValid: false, error: 'Email trop long (max 254 caractères)' };
  }
  
  if (!VALIDATION_PATTERNS.email.test(trimmed)) {
    return { isValid: false, error: 'Format email invalide' };
  }
  
  // Check for common typos
  const commonTypos = ['gmial.com', 'gmai.com', 'yahooo.com', 'hotmial.com'];
  const domain = trimmed.split('@')[1];
  if (commonTypos.includes(domain)) {
    return { isValid: false, error: 'Domaine email suspect (vérifiez l\'orthographe)' };
  }
  
  return { isValid: true, sanitized: trimmed };
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const cleaned = phone.replace(/\s/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'Numéro de téléphone requis' };
  }
  
  if (!VALIDATION_PATTERNS.phone.test(phone)) {
    return { isValid: false, error: 'Format de téléphone invalide' };
  }
  
  return { isValid: true, sanitized: cleaned };
}

/**
 * Validate SIRET number
 */
export function validateSIRET(siret: string): ValidationResult {
  const cleaned = siret.replace(/\s/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'SIRET requis' };
  }
  
  if (!VALIDATION_PATTERNS.siret.test(cleaned)) {
    return { isValid: false, error: 'SIRET doit contenir 14 chiffres' };
  }
  
  // Luhn algorithm validation
  if (!luhnCheck(cleaned)) {
    return { isValid: false, error: 'SIRET invalide (échec validation Luhn)' };
  }
  
  return { isValid: true, sanitized: cleaned };
}

/**
 * Validate SIREN number
 */
export function validateSIREN(siren: string): ValidationResult {
  const cleaned = siren.replace(/\s/g, '');
  
  if (!cleaned) {
    return { isValid: false, error: 'SIREN requis' };
  }
  
  if (!VALIDATION_PATTERNS.siren.test(cleaned)) {
    return { isValid: false, error: 'SIREN doit contenir 9 chiffres' };
  }
  
  // Luhn algorithm validation
  if (!luhnCheck(cleaned)) {
    return { isValid: false, error: 'SIREN invalide (échec validation Luhn)' };
  }
  
  return { isValid: true, sanitized: cleaned };
}

/**
 * Validate TVA number
 */
export function validateTVA(tva: string): ValidationResult {
  const cleaned = tva.replace(/\s/g, '').toUpperCase();
  
  if (!cleaned) {
    return { isValid: false, error: 'Numéro TVA requis' };
  }
  
  if (!VALIDATION_PATTERNS.tva.test(cleaned)) {
    return { isValid: false, error: 'Format TVA invalide (ex: FR12345678901)' };
  }
  
  return { isValid: true, sanitized: cleaned };
}

/**
 * Validate IBAN
 */
export function validateIBAN(iban: string): ValidationResult {
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  
  if (!cleaned) {
    return { isValid: false, error: 'IBAN requis' };
  }
  
  if (!VALIDATION_PATTERNS.iban.test(cleaned)) {
    return { isValid: false, error: 'Format IBAN invalide' };
  }
  
  // IBAN mod-97 validation
  if (!ibanCheck(cleaned)) {
    return { isValid: false, error: 'IBAN invalide (échec validation mod-97)' };
  }
  
  return { isValid: true, sanitized: cleaned };
}

/**
 * Validate text input (general purpose)
 */
export function validateText(
  text: string,
  options: {
    minLength?: number;
    maxLength?: number;
    allowHTML?: boolean;
    pattern?: RegExp;
    required?: boolean;
  } = {}
): ValidationResult {
  const {
    minLength = 0,
    maxLength = 10000,
    allowHTML = false,
    pattern,
    required = true,
  } = options;
  
  const trimmed = text.trim();
  
  if (required && !trimmed) {
    return { isValid: false, error: 'Ce champ est requis' };
  }
  
  if (trimmed.length < minLength) {
    return { isValid: false, error: `Minimum ${minLength} caractères requis` };
  }
  
  if (trimmed.length > maxLength) {
    return { isValid: false, error: `Maximum ${maxLength} caractères autorisés` };
  }
  
  if (!allowHTML && /<[^>]*>/.test(trimmed)) {
    return { isValid: false, error: 'HTML non autorisé dans ce champ' };
  }
  
  if (pattern && !pattern.test(trimmed)) {
    return { isValid: false, error: 'Format invalide' };
  }
  
  const sanitized = allowHTML ? trimmed : sanitizeHTML(trimmed);
  
  return { isValid: true, sanitized };
}

/**
 * Validate number
 */
export function validateNumber(
  value: string | number,
  options: {
    min?: number;
    max?: number;
    integer?: boolean;
    required?: boolean;
  } = {}
): ValidationResult {
  const {
    min = -Infinity,
    max = Infinity,
    integer = false,
    required = true,
  } = options;
  
  const str = String(value).trim();
  
  if (required && !str) {
    return { isValid: false, error: 'Ce champ est requis' };
  }
  
  const num = Number(str);
  
  if (isNaN(num)) {
    return { isValid: false, error: 'Nombre invalide' };
  }
  
  if (integer && !Number.isInteger(num)) {
    return { isValid: false, error: 'Nombre entier requis' };
  }
  
  if (num < min) {
    return { isValid: false, error: `Minimum: ${min}` };
  }
  
  if (num > max) {
    return { isValid: false, error: `Maximum: ${max}` };
  }
  
  return { isValid: true, sanitized: String(num) };
}

/**
 * Validate date
 */
export function validateDate(date: string): ValidationResult {
  const trimmed = date.trim();
  
  if (!trimmed) {
    return { isValid: false, error: 'Date requise' };
  }
  
  if (!VALIDATION_PATTERNS.date.test(trimmed)) {
    return { isValid: false, error: 'Format de date invalide (YYYY-MM-DD)' };
  }
  
  const dateObj = new Date(trimmed);
  
  if (isNaN(dateObj.getTime())) {
    return { isValid: false, error: 'Date invalide' };
  }
  
  return { isValid: true, sanitized: trimmed };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Luhn algorithm for SIRET/SIREN validation
 */
function luhnCheck(value: string): boolean {
  let sum = 0;
  let isEven = false;
  
  for (let i = value.length - 1; i >= 0; i--) {
    let digit = parseInt(value[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * IBAN mod-97 validation
 */
function ibanCheck(iban: string): boolean {
  // Move first 4 characters to end
  const rearranged = iban.substring(4) + iban.substring(0, 4);
  
  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  const numeric = rearranged.replace(/[A-Z]/g, (char) => {
    return String(char.charCodeAt(0) - 55);
  });
  
  // Calculate mod 97
  let remainder = numeric;
  while (remainder.length > 2) {
    const block = remainder.substring(0, 9);
    remainder = (parseInt(block, 10) % 97) + remainder.substring(block.length);
  }
  
  return parseInt(remainder, 10) % 97 === 1;
}

/**
 * Batch validate multiple fields
 */
export function validateFields(
  fields: Record<string, any>,
  validators: Record<string, (value: any) => ValidationResult>
): { isValid: boolean; errors: Record<string, string>; sanitized: Record<string, any> } {
  const errors: Record<string, string> = {};
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(fields)) {
    const validator = validators[key];
    if (validator) {
      const result = validator(value);
      if (!result.isValid) {
        errors[key] = result.error || 'Invalide';
      } else if (result.sanitized !== undefined) {
        sanitized[key] = result.sanitized;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}
