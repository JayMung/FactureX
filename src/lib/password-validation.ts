/**
 * Password Validation Utility
 * Implements OWASP password requirements
 * 
 * Requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 * - No common passwords
 */

export interface PasswordValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
}

// Common passwords to block (top 100 most common)
const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', '12345678', '12345', '1234567', 
  'password1', 'abc123', 'qwerty', 'monkey', '1234567890', 'letmein',
  'trustno1', 'dragon', 'baseball', '111111', 'iloveyou', 'master',
  'sunshine', 'ashley', 'bailey', 'passw0rd', 'shadow', '123123',
  '654321', 'superman', 'qazwsx', 'michael', 'football', 'welcome',
  'jesus', 'ninja', 'mustang', 'password123', 'admin', 'admin123',
  'root', 'toor', 'pass', 'test', 'guest', 'oracle', 'changeme'
]);

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  blockCommon: true,
} as const;

/**
 * Validates password against security requirements
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Le mot de passe doit contenir au moins ${PASSWORD_REQUIREMENTS.minLength} caractères`);
  } else {
    score += 20;
    // Bonus for extra length
    score += Math.min(20, (password.length - PASSWORD_REQUIREMENTS.minLength) * 2);
  }

  // Check uppercase
  if (PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre majuscule');
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  // Check lowercase
  if (PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une lettre minuscule');
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  // Check number
  if (PASSWORD_REQUIREMENTS.requireNumber && !/\d/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  } else if (/\d/.test(password)) {
    score += 15;
  }

  // Check special character
  if (PASSWORD_REQUIREMENTS.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*...)');
  } else if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 15;
  }

  // Check for common passwords
  if (PASSWORD_REQUIREMENTS.blockCommon && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Ce mot de passe est trop commun. Veuillez en choisir un plus sécurisé');
    score = 0;
  }

  // Check for sequential characters (123, abc, etc.)
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password)) {
    errors.push('Évitez les séquences de caractères (abc, 123, etc.)');
    score -= 10;
  }

  // Check for repeated characters (aaa, 111, etc.)
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Évitez les caractères répétés (aaa, 111, etc.)');
    score -= 10;
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine strength
  let strength: PasswordValidationResult['strength'];
  if (score >= 80) {
    strength = 'very-strong';
  } else if (score >= 60) {
    strength = 'strong';
  } else if (score >= 40) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return {
    isValid: errors.length === 0,
    score,
    errors,
    strength,
  };
}

/**
 * Get password strength label in French
 */
export function getPasswordStrengthLabel(strength: PasswordValidationResult['strength']): string {
  const labels = {
    'weak': 'Faible',
    'medium': 'Moyen',
    'strong': 'Fort',
    'very-strong': 'Très fort',
  };
  return labels[strength];
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(strength: PasswordValidationResult['strength']): string {
  const colors = {
    'weak': 'text-red-600 dark:text-red-400',
    'medium': 'text-orange-600 dark:text-orange-400',
    'strong': 'text-green-600 dark:text-green-400',
    'very-strong': 'text-emerald-600 dark:text-emerald-400',
  };
  return colors[strength];
}

/**
 * Get password strength background color for progress bar
 */
export function getPasswordStrengthBgColor(strength: PasswordValidationResult['strength']): string {
  const colors = {
    'weak': 'bg-red-500',
    'medium': 'bg-orange-500',
    'strong': 'bg-green-500',
    'very-strong': 'bg-emerald-500',
  };
  return colors[strength];
}
