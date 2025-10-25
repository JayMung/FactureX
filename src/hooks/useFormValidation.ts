import { useState, useCallback } from 'react';
import type { ValidationResult } from '@/lib/input-validation';

export interface FieldValidators {
  [key: string]: (value: any) => ValidationResult;
}

export interface FormErrors {
  [key: string]: string;
}

export interface UseFormValidationReturn<T> {
  values: T;
  errors: FormErrors;
  touched: Record<string, boolean>;
  isValid: boolean;
  isSubmitting: boolean;
  setValue: (field: keyof T, value: any) => void;
  setValues: (values: Partial<T>) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  clearErrors: () => void;
  validateField: (field: keyof T) => boolean;
  validateAll: () => boolean;
  handleChange: (field: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (field: keyof T) => () => void;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e: React.FormEvent) => Promise<void>;
  reset: () => void;
}

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validators: FieldValidators
): UseFormValidationReturn<T> {
  const [values, setValuesState] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set a single field value
  const setValue = useCallback((field: keyof T, value: any) => {
    setValuesState(prev => ({ ...prev, [field]: value }));
  }, []);

  // Set multiple field values
  const setValues = useCallback((newValues: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...newValues }));
  }, []);

  // Set error for a field
  const setError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field as string]: error }));
  }, []);

  // Clear error for a field
  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Validate a single field
  const validateField = useCallback((field: keyof T): boolean => {
    const validator = validators[field as string];
    if (!validator) return true;

    const result = validator(values[field]);
    
    if (!result.isValid) {
      setError(field, result.error || 'Invalide');
      return false;
    } else {
      clearError(field);
      // Update value with sanitized version if available
      if (result.sanitized !== undefined && result.sanitized !== values[field]) {
        setValue(field, result.sanitized);
      }
      return true;
    }
  }, [values, validators, setError, clearError, setValue]);

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const newErrors: FormErrors = {};

    for (const field in validators) {
      const validator = validators[field];
      const result = validator(values[field as keyof T]);
      
      if (!result.isValid) {
        newErrors[field] = result.error || 'Invalide';
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [values, validators]);

  // Handle input change
  const handleChange = useCallback((field: keyof T) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : e.target.value;
      
      setValue(field, value);
      
      // Validate on change if field has been touched
      if (touched[field as string]) {
        validateField(field);
      }
    };
  }, [setValue, touched, validateField]);

  // Handle input blur
  const handleBlur = useCallback((field: keyof T) => {
    return () => {
      setTouched(prev => ({ ...prev, [field as string]: true }));
      validateField(field);
    };
  }, [validateField]);

  // Handle form submit
  const handleSubmit = useCallback((onSubmit: (values: T) => void | Promise<void>) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      
      // Mark all fields as touched
      const allTouched: Record<string, boolean> = {};
      for (const field in validators) {
        allTouched[field] = true;
      }
      setTouched(allTouched);

      // Validate all fields
      if (!validateAll()) {
        return;
      }

      setIsSubmitting(true);
      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    };
  }, [values, validators, validateAll]);

  // Reset form
  const reset = useCallback(() => {
    setValuesState(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isValid: Object.keys(errors).length === 0,
    isSubmitting,
    setValue,
    setValues,
    setError,
    clearError,
    clearErrors,
    validateField,
    validateAll,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}
