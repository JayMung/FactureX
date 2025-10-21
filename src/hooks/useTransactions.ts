import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabase';
import type { Transaction, TransactionFilters, CreateTransactionData, UpdateTransactionData, ApiResponse } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

export const useTransactions = (page: number = 1, filters: TransactionFilters = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transactions', page, filters],
    queryFn: () => supabaseService.getTransactions(page, 10, filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes - remplace cacheTime
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionData) => supabaseService.createTransaction(data),
    onSuccess: (response: ApiResponse<Transaction>) => {
      if (response.data) {
        showSuccess(response.message || 'Transaction créée avec succès');
        // Invalider toutes les requêtes de transactions
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        // Forcer le rechargement immédiat
        refetch();
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la création de la transaction');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionData }) => 
      supabaseService.updateTransaction(id, data),
    onSuccess: (response: ApiResponse<Transaction>) => {
      if (response.data) {
        showSuccess(response.message || 'Transaction mise à jour avec succès');
        // Invalider toutes les requêtes de transactions
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        // Forcer le rechargement immédiat
        refetch();
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la mise à jour de la transaction');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseService.deleteTransaction(id),
    onSuccess: (response: ApiResponse<void>) => {
      if (!response.error) {
        showSuccess(response.message || 'Transaction supprimée avec succès');
        // Invalider toutes les requêtes de transactions
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        // Forcer le rechargement immédiat
        refetch();
      } else {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la suppression de la transaction');
    }
  });

  return {
    transactions: data?.data?.data || [],
    pagination: data?.data ? {
      count: data.data.count,
      page: data.data.page,
      pageSize: data.data.pageSize,
      totalPages: data.data.totalPages
    } : null,
    isLoading,
    error: error?.message || data?.error,
    refetch,
    createTransaction: createMutation.mutate,
    updateTransaction: updateMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};

export const useTransaction = (id: string) => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['transaction', id],
    queryFn: () => supabaseService.getTransactionById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 3, // 3 minutes
  });

  return {
    transaction: data?.data,
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};