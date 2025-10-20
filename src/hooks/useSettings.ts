import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabase';
import type { Setting, ExchangeRates, Fees, ApiResponse } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

export const useSettings = (categorie?: string) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['settings', categorie],
    queryFn: () => supabaseService.getSettings(categorie),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const updateMutation = useMutation({
    mutationFn: ({ categorie, settings }: { categorie: string; settings: Record<string, string> }) => 
      supabaseService.updateSetting(categorie, settings),
    onSuccess: (response: ApiResponse<Setting[]>) => {
      if (response.data) {
        showSuccess(response.message || 'Paramètres mis à jour avec succès');
        queryClient.invalidateQueries({ queryKey: ['settings'] });
        queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
        queryClient.invalidateQueries({ queryKey: ['fees'] });
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la mise à jour des paramètres');
    }
  });

  return {
    settings: data?.data || [],
    isLoading,
    error: error?.message || data?.error,
    refetch,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending
  };
};

export const useExchangeRates = () => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: () => supabaseService.getExchangeRates(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    rates: data?.data,
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};

export const useFees = () => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['fees'],
    queryFn: () => supabaseService.getFees(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    fees: data?.data,
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};