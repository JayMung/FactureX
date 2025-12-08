/**
 * Server-side validation utilities
 * Provides robust validation for all form inputs and API data
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  data?: any;
}

// Email validation regex (RFC 5322 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Phone validation for DRC (simplified)
const PHONE_REGEX = /^(\+243|0)?[1-9]\d{8}$/;

// Name validation (letters, spaces, hyphens, apostrophes)
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]{2,50}$/;

// Text validation (prevent XSS)
const TEXT_SANITIZATION_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/**
 * Sanitize text input to prevent XSS
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(TEXT_SANITIZATION_REGEX, '') // Remove script tags
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('L\'email est requis');
    return { isValid: false, errors };
  }
  
  const sanitizedEmail = sanitizeText(email.toLowerCase().trim());
  
  if (!sanitizedEmail) {
    errors.push('L\'email ne peut pas être vide');
  } else if (!EMAIL_REGEX.test(sanitizedEmail)) {
    errors.push('L\'email n\'est pas valide');
  } else if (sanitizedEmail.length > 255) {
    errors.push('L\'email est trop long (maximum 255 caractères)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedEmail
  };
}

/**
 * Validate phone number (DRC format)
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];
  
  if (!phone || typeof phone !== 'string') {
    errors.push('Le numéro de téléphone est requis');
    return { isValid: false, errors };
  }
  
  const sanitizedPhone = sanitizeText(phone.trim());
  
  if (!sanitizedPhone) {
    errors.push('Le numéro de téléphone ne peut pas être vide');
  } else if (!PHONE_REGEX.test(sanitizedPhone)) {
    errors.push('Le numéro de téléphone n\'est pas valide (format: +243XXXXXXXX ou 0XXXXXXXX)');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedPhone
  };
}

/**
 * Validate name (first name, last name, company name)
 */
export function validateName(name: string, fieldName: string = 'Nom'): ValidationResult {
  const errors: string[] = [];
  
  if (!name || typeof name !== 'string') {
    errors.push(`${fieldName} est requis`);
    return { isValid: false, errors };
  }
  
  const sanitizedName = sanitizeText(name.trim());
  
  if (!sanitizedName) {
    errors.push(`${fieldName} ne peut pas être vide`);
  } else if (!NAME_REGEX.test(sanitizedName)) {
    errors.push(`${fieldName} contient des caractères non valides`);
  } else if (sanitizedName.length < 2) {
    errors.push(`${fieldName} doit contenir au moins 2 caractères`);
  } else if (sanitizedName.length > 50) {
    errors.push(`${fieldName} est trop long (maximum 50 caractères)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedName
  };
}

/**
 * Validate city name
 */
export function validateCity(city: string): ValidationResult {
  return validateName(city, 'Ville');
}

/**
 * Validate monetary amount
 */
export function validateAmount(amount: string | number, fieldName: string = 'Montant'): ValidationResult {
  const errors: string[] = [];
  
  let numAmount: number;
  
  if (typeof amount === 'string') {
    const sanitizedAmount = sanitizeText(amount.trim());
    if (!sanitizedAmount) {
      errors.push(`${fieldName} est requis`);
      return { isValid: false, errors };
    }
    
    numAmount = parseFloat(sanitizedAmount);
  } else if (typeof amount === 'number') {
    numAmount = amount;
  } else {
    errors.push(`${fieldName} doit être un nombre`);
    return { isValid: false, errors };
  }
  
  if (isNaN(numAmount)) {
    errors.push(`${fieldName} doit être un nombre valide`);
  } else if (numAmount < 0) {
    errors.push(`${fieldName} ne peut pas être négatif`);
  } else if (numAmount > 999999999.99) {
    errors.push(`${fieldName} est trop élevé`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: numAmount
  };
}

/**
 * Validate facture/transaction form data
 */
export function validateFactureForm(data: any): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // Validate client_id
  if (!data.client_id || typeof data.client_id !== 'string') {
    errors.push('Le client est requis');
  } else {
    sanitizedData.client_id = sanitizeText(data.client_id.trim());
  }
  
  // Validate type
  if (!data.type || !['devis', 'facture'].includes(data.type)) {
    errors.push('Le type de document est invalide');
  } else {
    sanitizedData.type = data.type;
  }
  
  // Validate mode_livraison
  if (!data.mode_livraison || !['aerien', 'maritime'].includes(data.mode_livraison)) {
    errors.push('Le mode de livraison est invalide');
  } else {
    sanitizedData.mode_livraison = data.mode_livraison;
  }
  
  // Validate devise
  if (!data.devise || !['USD', 'CDF'].includes(data.devise)) {
    errors.push('La devise est invalide');
  } else {
    sanitizedData.devise = data.devise;
  }
  
  // Validate date_emission
  if (!data.date_emission) {
    errors.push('La date d\'émission est requise');
  } else {
    const date = new Date(data.date_emission);
    if (isNaN(date.getTime())) {
      errors.push('La date d\'émission est invalide');
    } else if (date > new Date()) {
      errors.push('La date d\'émission ne peut pas être dans le futur');
    } else {
      sanitizedData.date_emission = data.date_emission;
    }
  }
  
  // Validate optional text fields
  if (data.conditions_vente) {
    const conditionsResult = validateText(data.conditions_vente, 'Conditions de vente', 1000);
    if (!conditionsResult.isValid) {
      errors.push(...conditionsResult.errors);
    } else {
      sanitizedData.conditions_vente = conditionsResult.data;
    }
  }
  
  if (data.notes) {
    const notesResult = validateText(data.notes, 'Notes', 1000);
    if (!notesResult.isValid) {
      errors.push(...notesResult.errors);
    } else {
      sanitizedData.notes = notesResult.data;
    }
  }
  
  // Validate items array
  if (!Array.isArray(data.items) || data.items.length === 0) {
    errors.push('Au moins un article est requis');
  } else {
    const validatedItems = data.items.map((item: any, index: number) => {
      const itemErrors: string[] = [];
      const validatedItem: any = {};
      
      // Validate description
      if (!item.description || typeof item.description !== 'string') {
        itemErrors.push(`La description de l'article ${index + 1} est requise`);
      } else {
        const descResult = validateText(item.description, `Description article ${index + 1}`, 500);
        if (!descResult.isValid) {
          itemErrors.push(...descResult.errors);
        } else {
          validatedItem.description = descResult.data;
        }
      }
      
      // Validate quantite
      const qtyResult = validateQuantity(item.quantite, `Quantité article ${index + 1}`);
      if (!qtyResult.isValid) {
        itemErrors.push(...qtyResult.errors);
      } else {
        validatedItem.quantite = qtyResult.data;
      }
      
      // Validate prix_unitaire
      const priceResult = validateAmount(item.prix_unitaire, `Prix unitaire article ${index + 1}`);
      if (!priceResult.isValid) {
        itemErrors.push(...priceResult.errors);
      } else {
        validatedItem.prix_unitaire = priceResult.data;
      }
      
      // Validate poids
      const weightResult = validateAmount(item.poids, `Poids article ${index + 1}`);
      if (!weightResult.isValid) {
        itemErrors.push(...weightResult.errors);
      } else {
        validatedItem.poids = weightResult.data;
      }
      
      if (itemErrors.length > 0) {
        errors.push(...itemErrors);
        return null;
      }
      
      return validatedItem;
    }).filter(item => item !== null);
    
    if (validatedItems.length === data.items.length) {
      sanitizedData.items = validatedItems;
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedData
  };
}

/**
 * Validate client form data
 */
export function validateClientForm(data: any): ValidationResult {
  const errors: string[] = [];
  const sanitizedData: any = {};
  
  // Validate nom
  const nameResult = validateName(data.nom, 'Nom du client');
  if (!nameResult.isValid) {
    errors.push(...nameResult.errors);
  } else {
    sanitizedData.nom = nameResult.data;
  }
  
  // Validate telephone
  const phoneResult = validatePhone(data.telephone);
  if (!phoneResult.isValid) {
    errors.push(...phoneResult.errors);
  } else {
    sanitizedData.telephone = phoneResult.data;
  }
  
  // Validate ville
  const cityResult = validateCity(data.ville);
  if (!cityResult.isValid) {
    errors.push(...cityResult.errors);
  } else {
    sanitizedData.ville = cityResult.data;
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedData
  };
}

/**
 * Validate quantity (positive integer)
 */
export function validateQuantity(quantity: string | number, fieldName: string = 'Quantité'): ValidationResult {
  const errors: string[] = [];
  
  let numQuantity: number;
  
  if (typeof quantity === 'string') {
    const sanitizedQuantity = sanitizeText(quantity.trim());
    if (!sanitizedQuantity) {
      errors.push(`${fieldName} est requise`);
      return { isValid: false, errors };
    }
    
    numQuantity = parseInt(sanitizedQuantity, 10);
  } else if (typeof quantity === 'number') {
    numQuantity = Math.floor(quantity);
  } else {
    errors.push(`${fieldName} doit être un nombre entier`);
    return { isValid: false, errors };
  }
  
  if (isNaN(numQuantity)) {
    errors.push(`${fieldName} doit être un nombre valide`);
  } else if (numQuantity <= 0) {
    errors.push(`${fieldName} doit être supérieure à 0`);
  } else if (numQuantity > 999999) {
    errors.push(`${fieldName} est trop élevée`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: numQuantity
  };
}

/**
 * Validate generic text field
 */
export function validateText(text: string, fieldName: string = 'Texte', maxLength: number = 255): ValidationResult {
  const errors: string[] = [];
  
  if (!text || typeof text !== 'string') {
    errors.push(`${fieldName} est requis`);
    return { isValid: false, errors };
  }
  
  const sanitizedText = sanitizeText(text.trim());
  
  if (!sanitizedText) {
    errors.push(`${fieldName} ne peut pas être vide`);
  } else if (sanitizedText.length > maxLength) {
    errors.push(`${fieldName} est trop long (maximum ${maxLength} caractères)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedText
  };
}

/**
 * Validate UUID
 */
export function validateUUID(uuid: string, fieldName: string = 'ID'): ValidationResult {
  const errors: string[] = [];
  
  if (!uuid || typeof uuid !== 'string') {
    errors.push(`${fieldName} est requis`);
    return { isValid: false, errors };
  }
  
  const sanitizedUUID = sanitizeText(uuid.trim());
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!sanitizedUUID) {
    errors.push(`${fieldName} ne peut pas être vide`);
  } else if (!uuidRegex.test(sanitizedUUID)) {
    errors.push(`${fieldName} n'est pas valide`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: sanitizedUUID
  };
}
