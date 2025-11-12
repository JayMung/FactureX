import { useCallback } from 'react';
import { toast } from 'sonner';
import { FinancialValidationHandler } from '@/lib/financial-validation-handler';

export const useFinancialValidation = () => {
  const handleValidationError = (error: any) => {
    FinancialValidationHandler.showErrorToast(error);
  };

  const getFieldError = (error: any, fieldName: string): string | null => {
    const validationError = FinancialValidationHandler.parsePostgresError(error);
    return validationError?.field === fieldName ? validationError.message : null;
  };

  // Wrapper pour les mutations avec gestion des erreurs
  const validateAndExecute = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: any) => void;
      successMessage?: string;
    }
  ): Promise<T | null> => {
    try {
      const result = await operation();
      
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      
      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      if (FinancialValidationHandler.isFinancialValidationError(error)) {
        handleValidationError(error);
      } else {
        // Erreur non liée à la validation
        toast.error('Une erreur technique est survenue');
        console.error('Technical error:', error);
      }
      
      options?.onError?.(error);
      return null;
    }
  }, [handleValidationError]);

  return {
    handleValidationError,
    getFieldError,
    isValidationError: FinancialValidationHandler.isFinancialValidationError,
    validateAndExecute
  };
};
