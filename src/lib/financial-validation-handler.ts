// Gestionnaire d'erreurs de validation financière
// Intercepte les erreurs SQL VALIDATION_ERROR et les traduit en messages utilisateur

import { toast } from 'sonner';

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export class FinancialValidationHandler {
  // Messages d'erreur pré-définis pour les validations SQL
  private static readonly ERROR_MESSAGES: Record<string, ValidationError> = {
    'VALIDATION_ERROR: Montants de transaction invalides': {
      code: 'INVALID_TRANSACTION_AMOUNTS',
      message: 'Les montants de la transaction sont invalides',
      field: 'montant',
      suggestion: 'Vérifiez que le montant est positif et que les frais ne dépassent pas le montant'
    },
    'VALIDATION_ERROR: Montant de paiement invalide': {
      code: 'INVALID_PAYMENT_AMOUNT',
      message: 'Le montant du paiement est invalide',
      field: 'montant_paye',
      suggestion: 'Le montant doit être positif et ne pas dépasser 999,999,999.99 $'
    },
    'VALIDATION_ERROR: Solde actuel de compte invalide': {
      code: 'INVALID_ACCOUNT_BALANCE',
      message: 'Le solde du compte est invalide',
      field: 'solde_actuel',
      suggestion: 'Le solde doit être positif et ne pas dépasser 100,000,000 $'
    },
    'VALIDATION_ERROR: Montant de mouvement invalide': {
      code: 'INVALID_MOVEMENT_AMOUNT',
      message: 'Le montant du mouvement est invalide',
      field: 'montant',
      suggestion: 'Le montant doit être positif'
    },
    'VALIDATION_ERROR: Montant de facture invalide': {
      code: 'INVALID_INVOICE_AMOUNT',
      message: 'Le montant de la facture est invalide',
      field: 'total_general',
      suggestion: 'Le montant doit être positif et ne pas dépasser 999,999,999.99 $'
    }
  };

  // Analyse une erreur PostgreSQL et retourne un message utilisateur
  static parsePostgresError(error: any): ValidationError | null {
    if (!error?.message) return null;

    const errorMessage = error.message;
    
    // Chercher les erreurs de validation avec notre préfixe
    for (const [key, value] of Object.entries(this.ERROR_MESSAGES)) {
      if (errorMessage.includes(key)) {
        return value;
      }
    }

    // Erreurs de contrainte CHECK génériques
    if (errorMessage.includes('violates check constraint')) {
      return {
        code: 'CHECK_CONSTRAINT_VIOLATION',
        message: 'Une règle de validation a été violée',
        suggestion: 'Vérifiez les valeurs saisies et réessayez'
      };
    }

    // Erreurs de contrainte NOT NULL
    if (errorMessage.includes('null value in column')) {
      const match = errorMessage.match(/column "([^"]+)" of relation "([^"]+)"/);
      if (match) {
        return {
          code: 'NOT_NULL_VIOLATION',
          message: `Le champ ${match[1]} est requis`,
          field: match[1],
          suggestion: 'Veuillez remplir tous les champs obligatoires'
        };
      }
    }

    return null;
  }

  // Affiche un toast d'erreur approprié
  static showErrorToast(error: any): void {
    const validationError = this.parsePostgresError(error);
    
    if (validationError) {
      toast.error(validationError.message, {
        description: validationError.suggestion
      });
    } else {
      // Erreur générique
      toast.error('Une erreur est survenue', {
        description: 'Veuillez réessayer ou contacter le support'
      });
    }
  }

  // Retourne un message d'erreur formaté pour les formulaires
  static getFormErrorMessage(error: any, fieldName?: string): string {
    const validationError = this.parsePostgresError(error);
    
    if (validationError && (!fieldName || validationError.field === fieldName)) {
      return validationError.message;
    }
    
    return 'Erreur de validation';
  }

  // Vérifie si une erreur est une erreur de validation financière
  static isFinancialValidationError(error: any): boolean {
    return this.parsePostgresError(error) !== null;
  }
}

// Hook React pour gérer les erreurs de validation dans les composants
export const useFinancialValidation = () => {
  const handleValidationError = (error: any) => {
    FinancialValidationHandler.showErrorToast(error);
  };

  const getFieldError = (error: any, fieldName: string): string | null => {
    const validationError = FinancialValidationHandler.parsePostgresError(error);
    return validationError?.field === fieldName ? validationError.message : null;
  };

  return {
    handleValidationError,
    getFieldError,
    isValidationError: FinancialValidationHandler.isFinancialValidationError
  };
};
