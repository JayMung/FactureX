import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabase';
import { supabase } from '@/integrations/supabase/client';
import { activityLogger } from '@/services/activityLogger';
import { fieldLevelSecurityService } from '@/lib/security/field-level-security';
import type { Client, ClientFilters, CreateClientData, ApiResponse } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

export const useClients = (page: number = 1, filters: ClientFilters = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['clients', page, filters],
    queryFn: () => supabaseService.getClients(page, 10, filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateClientData) => supabaseService.createClient(data),
    onSuccess: (response: ApiResponse<Client>) => {
      if (response.data) {
        showSuccess(response.message || 'Client créé avec succès');
        // Logger l'activité
        activityLogger.logActivityWithChanges(
          'Création Client',
          'clients',
          response.data.id,
          {
            before: null,
            after: response.data
          }
        );
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      // Message spécifique pour les doublons
      if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
        showError('Un client avec ce numéro de téléphone existe déjà');
      } else {
        showError(error.message || 'Erreur lors de la création du client');
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) => supabaseService.updateClient(id, data),
    onSuccess: (response: ApiResponse<Client>, variables: { id: string; data: Partial<Client> }) => {
      if (response.data) {
        showSuccess(response.message || 'Client mis à jour avec succès');
        // Logger l'activité
        activityLogger.logActivityWithChanges(
          'Modification Client',
          'clients',
          variables.id,
          {
            before: variables.data,
            after: response.data
          }
        );
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la mise à jour du client');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseService.deleteClient(id),
    onSuccess: (response: ApiResponse<void>, id: string) => {
      if (!response.error) {
        showSuccess(response.message || 'Client supprimé avec succès');
        // Logger l'activité
        activityLogger.logActivity(
          'Suppression Client',
          'clients',
          id
        );
        queryClient.invalidateQueries({ queryKey: ['clients'] });
        queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la suppression du client');
    }
  });

  return {
    clients: data?.data?.data || [],
    pagination: data?.data ? {
      count: data.data.count,
      page: data.data.page,
      pageSize: data.data.pageSize,
      totalPages: data.data.totalPages
    } : null,
    isLoading,
    error: error?.message || data?.error,
    refetch,
    createClient: createMutation.mutate,
    updateClient: updateMutation.mutate,
    deleteClient: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};

export const useClient = (id: string) => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => supabaseService.getClientById(id),
    enabled: !!id
  });

  return {
    client: data?.data,
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};

// Hook pour récupérer TOUS les clients (sans pagination) - utilisé dans les combobox
export const useAllClients = () => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: async () => {
      // SECURITY: Use field-level security for combobox data
      const secureSelect = await fieldLevelSecurityService.buildSecureSelect('clients');
      
      const { data, error } = await supabase
        .from('clients')
        .select(secureSelect)
        .order('nom');
      
      if (error) throw error;
      
      // SECURITY: Filter response data
      const filteredData = await fieldLevelSecurityService.filterResponseData('clients', data || []);
      return filteredData;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    clients: data || [],
    isLoading,
    error: error?.message,
    refetch
  };
};