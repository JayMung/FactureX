import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabase';
import type { PaymentMethod } from '@/types';

export const usePaymentMethods = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPaymentMethods = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await supabaseService.getPaymentMethods();
      
      if (response.error) {
        setError(response.error);
      } else {
        setPaymentMethods(response.data || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePaymentMethod = async (id: string, isActive: boolean) => {
    try {
      const response = await supabaseService.togglePaymentMethod(id, isActive);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Mettre à jour l'état local
      setPaymentMethods(prev => 
        prev.map(method => 
          method.id === id ? { ...method, is_active: isActive } : method
        )
      );
      
      // Auto-refresh pour synchroniser les données
      await fetchPaymentMethods();
      
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const createPaymentMethod = async (methodData: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await supabaseService.createPaymentMethod(methodData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Mettre à jour l'état local
      if (response.data) {
        setPaymentMethods(prev => [...prev, response.data!]);
      }
      
      // Auto-refresh pour synchroniser les données
      await fetchPaymentMethods();
      
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const updatePaymentMethod = async (id: string, methodData: Partial<PaymentMethod>) => {
    try {
      const response = await supabaseService.updatePaymentMethod(id, methodData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Mettre à jour l'état local
      if (response.data) {
        setPaymentMethods(prev => 
          prev.map(method => 
            method.id === id ? response.data! : method
          )
        );
      }
      
      // Auto-refresh pour synchroniser les données
      await fetchPaymentMethods();
      
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  const deletePaymentMethod = async (id: string) => {
    try {
      const response = await supabaseService.deletePaymentMethod(id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Mettre à jour l'état local
      setPaymentMethods(prev => prev.filter(method => method.id !== id));
      
      // Auto-refresh pour synchroniser les données
      await fetchPaymentMethods();
      
      return response;
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  return {
    paymentMethods,
    isLoading,
    error,
    refetch: fetchPaymentMethods,
    togglePaymentMethod,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod
  };
};