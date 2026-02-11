import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabase';
import { supabase } from '@/integrations/supabase/client';
import { fieldLevelSecurityService } from '@/lib/security/field-level-security';
import type { Fournisseur, FournisseurFilters, CreateFournisseurData, ApiResponse } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { activityLogger } from '@/services/activityLogger';

// ============================================
// 🎣 FOURNISSEURS HOOK (BASÉ SUR PATTERN REFACTORISÉ)
// ============================================

export const useFournisseurs = (page: number = 1, filters: FournisseurFilters = {}) => {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['fournisseurs', page, filters],
    queryFn: () => supabaseService.getFournisseurs(page, 10, filters),
    staleTime: 1000 * 60 * 5,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateFournisseurData) => supabaseService.createFournisseur(data),
    onSuccess: (response: ApiResponse<Fournisseur>) => {
      if (response.data) {
        showSuccess(response.message || 'Fournisseur créé avec succès');
        activityLogger.logActivityWithChanges(
          'Création Fournisseur',
          'fournisseurs',
          response.data.id,
          { before: null, after: response.data }
        );
        queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la création');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Fournisseur> }) => 
      supabaseService.updateFournisseur(id, data),
    onSuccess: (response: ApiResponse<Fournisseur>, variables: { id: string; data: Partial<Fournisseur> }) => {
      if (response.data) {
        showSuccess(response.message || 'Fournisseur mis à jour');
        activityLogger.logActivityWithChanges(
          'Modification Fournisseur',
          'fournisseurs',
          variables.id,
          { before: variables.data, after: response.data }
        );
        queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la mise à jour');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabaseService.deleteFournisseur(id),
    onSuccess: (response: ApiResponse<void>, id: string) => {
      if (!response.error) {
        showSuccess(response.message || 'Fournisseur supprimé');
        activityLogger.logActivity(
          'Suppression Fournisseur',
          'fournisseurs',
          id
        );
        queryClient.invalidateQueries({ queryKey: ['fournisseurs'] });
      } else if (response.error) {
        showError(response.error);
      }
    },
    onError: (error: any) => {
      showError(error.message || 'Erreur lors de la suppression');
    }
  });

  return {
    fournisseurs: data?.data?.data || [],
    pagination: data?.data ? {
      count: data.data.count,
      page: data.data.page,
      pageSize: data.data.pageSize,
      totalPages: data.data.totalPages
    } : null,
    isLoading,
    error: error?.message || data?.error,
    refetch,
    createFournisseur: createMutation.mutate,
    updateFournisseur: updateMutation.mutate,
    deleteFournisseur: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};

export const useFournisseur = (id: string) => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['fournisseur', id],
    queryFn: () => supabaseService.getFournisseurById(id),
    enabled: !!id
  });

  return {
    fournisseur: data?.data,
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};

// Hook pour récupérer TOUS les fournisseurs (sans pagination)
export const useAllFournisseurs = () => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['fournisseurs', 'all'],
    queryFn: async () => {
      const secureSelect = await fieldLevelSecurityService.buildSecureSelect('fournisseurs');
      const { data: queryData, error } = await supabase
        .from('fournisseurs')
        .select(secureSelect)
        .order('nom');
      
      if (error) throw error;
      
      const filteredData = await fieldLevelSecurityService.filterResponseData('fournisseurs', queryData || []);
      return filteredData;
    },
    staleTime: 1000 * 60 * 5,
  });

  return {
    fournisseurs: data || [],
    isLoading,
    error: error?.message,
    refetch
  };
};

// ============================================
// ⚠️ À AJOUTER DANS supabaseService.ts
// ============================================

/*
  async getFournisseurs(page: number, pageSize: number, filters?: FournisseurFilters) {
    // Implémenter pagination + filtres
  }
  
  async getFournisseurById(id: string) {
    // Implémenter get by ID
  }
  
  async createFournisseur(data: CreateFournisseurData) {
    // Implémenter create
  }
  
  async updateFournisseur(id: string, data: Partial<Fournisseur>) {
    // Implémenter update
  }
  
  async deleteFournisseur(id: string) {
    // Implémenter delete
  }
*/
