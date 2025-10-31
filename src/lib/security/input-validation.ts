/**
 * Input validation and sanitization for transaction creation
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: any;
  error?: string;
}

export class InputValidator {
  // Maximum lengths for text fields
  private static readonly MAX_LENGTHS = {
    client_id: 36, // UUID
    mode_paiement: 100,
    statut: 50,
    devise: 10,
    motif: 50
  };

  // Allowed values for enums
  private static readonly ALLOWED_VALUES = {
    devise: ['USD', 'CDF'],
    motif: ['Commande', 'Transfert'],
    statut: ['En attente', 'Servi', 'Remboursé', 'Annulé']
  };

  // Numeric constraints
  private static readonly NUMERIC_CONSTRAINTS = {
    montant: { min: 0.01, max: 999999999.99, decimals: 2 },
    frais: { min: 0, max: 999999999.99, decimals: 2 },
    benefice: { min: -999999999.99, max: 999999999.99, decimals: 2 },
    taux_usd_cny: { min: 0.01, max: 9999.9999, decimals: 4 },
    taux_usd_cdf: { min: 0.01, max: 99999.99, decimals: 2 },
    montant_cny: { min: 0, max: 999999999.99, decimals: 2 }
  };

  /**
   * Validate and sanitize transaction data
   */
  static validateTransactionData(data: any): ValidationResult {
    const errors: string[] = [];
    const sanitized: any = {};

    // Validate client_id (UUID)
    if (data.client_id) {
      const clientResult = this.validateUUID(data.client_id, 'client_id');
      if (!clientResult.isValid) {
        errors.push(clientResult.error || 'Invalid client ID');
      } else {
        sanitized.client_id = clientResult.sanitizedValue;
      }
    }

    // Validate montant (numeric)
    if (data.montant !== undefined) {
      const montantResult = this.validateNumeric(
        data.montant, 
        'montant', 
        this.NUMERIC_CONSTRAINTS.montant
      );
      if (!montantResult.isValid) {
        errors.push(montantResult.error || 'Invalid amount');
      } else {
        sanitized.montant = montantResult.sanitizedValue;
      }
    }

    // Validate devise (enum)
    if (data.devise) {
      const deviseResult = this.validateEnum(
        data.devise, 
        'devise', 
        this.ALLOWED_VALUES.devise
      );
      if (!deviseResult.isValid) {
        errors.push(deviseResult.error || 'Invalid currency');
      } else {
        sanitized.devise = deviseResult.sanitizedValue;
      }
    }

    // Validate motif (enum)
    if (data.motif) {
      const motifResult = this.validateEnum(
        data.motif, 
        'motif', 
        this.ALLOWED_VALUES.motif
      );
      if (!motifResult.isValid) {
        errors.push(motifResult.error || 'Invalid motif');
      } else {
        sanitized.motif = motifResult.sanitizedValue;
      }
    }

    // Validate mode_paiement (text)
    if (data.mode_paiement) {
      const paiementResult = this.validateText(
        data.mode_paiement, 
        'mode_paiement', 
        this.MAX_LENGTHS.mode_paiement
      );
      if (!paiementResult.isValid) {
        errors.push(paiementResult.error || 'Invalid payment method');
      } else {
        sanitized.mode_paiement = paiementResult.sanitizedValue;
      }
    }

    // Validate statut (enum)
    if (data.statut) {
      const statutResult = this.validateEnum(
        data.statut, 
        'statut', 
        this.ALLOWED_VALUES.statut
      );
      if (!statutResult.isValid) {
        errors.push(statutResult.error || 'Invalid status');
      } else {
        sanitized.statut = statutResult.sanitizedValue;
      }
    }

    // Validate date_paiement (ISO date)
    if (data.date_paiement) {
      const dateResult = this.validateDate(data.date_paiement);
      if (!dateResult.isValid) {
        errors.push(dateResult.error || 'Invalid payment date');
      } else {
        sanitized.date_paiement = dateResult.sanitizedValue;
      }
    }

    return {
      isValid: errors.length === 0,
      sanitizedValue: sanitized,
      error: errors.join('; ')
    };
  }

  /**
   * Validate UUID format
   */
  private static validateUUID(value: string, fieldName: string): ValidationResult {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!value || typeof value !== 'string') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    if (value.length > this.MAX_LENGTHS[fieldName as keyof typeof this.MAX_LENGTHS]) {
      return { isValid: false, error: `${fieldName} is too long` };
    }

    if (!uuidRegex.test(value)) {
      return { isValid: false, error: `Invalid ${fieldName} format` };
    }

    return { isValid: true, sanitizedValue: value.toLowerCase() };
  }

  /**
   * Validate numeric values
   */
  private static validateNumeric(
    value: any, 
    fieldName: string, 
    constraints: { min: number; max: number; decimals: number }
  ): ValidationResult {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      return { isValid: false, error: `${fieldName} must be a number` };
    }

    if (numValue < constraints.min || numValue > constraints.max) {
      return { 
        isValid: false, 
        error: `${fieldName} must be between ${constraints.min} and ${constraints.max}` 
      };
    }

    // Round to specified decimal places
    const sanitizedValue = Math.round(numValue * Math.pow(10, constraints.decimals)) / Math.pow(10, constraints.decimals);

    return { isValid: true, sanitizedValue };
  }

  /**
   * Validate enum values
   */
  private static validateEnum(value: string, fieldName: string, allowedValues: string[]): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    if (value.length > this.MAX_LENGTHS[fieldName as keyof typeof this.MAX_LENGTHS]) {
      return { isValid: false, error: `${fieldName} is too long` };
    }

    if (!allowedValues.includes(value)) {
      return { 
        isValid: false, 
        error: `${fieldName} must be one of: ${allowedValues.join(', ')}` 
      };
    }

    return { isValid: true, sanitizedValue: value };
  }

  /**
   * Validate text fields
   */
  private static validateText(value: string, fieldName: string, maxLength: number): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: false, error: `${fieldName} is required` };
    }

    // Remove potentially dangerous characters
    const sanitized = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
      .replace(/javascript:/gi, '') // Remove javascript protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim()
      .substring(0, maxLength);

    if (sanitized.length === 0) {
      return { isValid: false, error: `${fieldName} cannot be empty` };
    }

    return { isValid: true, sanitizedValue: sanitized };
  }

  /**
   * Validate date fields
   */
  private static validateDate(value: string): ValidationResult {
    if (!value || typeof value !== 'string') {
      return { isValid: false, error: 'Date is required' };
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(value)) {
      return { isValid: false, error: 'Invalid date format (YYYY-MM-DD)' };
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return { isValid: false, error: 'Invalid date' };
    }

    // Don't allow future dates for payment dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date > today) {
      return { isValid: false, error: 'Payment date cannot be in the future' };
    }

    return { isValid: true, sanitizedValue: value };
  }

  /**
   * Sanitize HTML content (if any)
   */
  static sanitizeHTML(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .trim();
  }
}

/**
 * Validate transaction data before database operations
 */
export const validateTransactionInput = (data: any): ValidationResult => {
  return InputValidator.validateTransactionData(data);
};
