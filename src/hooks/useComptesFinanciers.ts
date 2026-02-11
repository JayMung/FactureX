import { useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import { useSupabaseQuery } from './useSupabaseQuery';
import { useSupabaseCrud } from './useSupabaseCrud';
import type { CompteFinancier, CreateCompteFinancierData, UpdateCompteFinancierData } from '@/types';

export const useComptesFinanciers = () => {
  const { organizationId } = useOrganization();

  // READ — React Query via useSupabaseQuery
  const { data: comptes, isLoading: loading, error, refetch: fetchComptes } = useSupabaseQuery<CompteFinancier>({
    table: 'comptes_financiers',
    queryKey: 'comptes',
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
    filters: { organization_id: organizationId },
    applyFilters: (query, f: any) => {
      if (f.organization_id) query = query.eq('organization_id', f.organization_id);
      return query;
    },
    enabled: !!organizationId,
  });

  // WRITE — React Query mutations via useSupabaseCrud
  const crud = useSupabaseCrud<CompteFinancier>({
    table: 'comptes_financiers',
    queryKey: 'comptes',
    entityLabel: 'Compte',
    relatedQueryKeys: ['dashboardStats', 'mouvements'],
    beforeCreate: async (data) => {
      if (!organizationId) throw new Error('Organization ID is required');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      return { ...data, organization_id: organizationId, created_by: user.id };
    },
  });

  // Wrapper to match original createCompte(data) signature
  const createCompte = useCallback(async (data: CreateCompteFinancierData): Promise<CompteFinancier> => {
    return crud.createAsync(data as Partial<CompteFinancier>);
  }, [crud.createAsync]);

  // Wrapper to match original updateCompte(id, data) signature
  const updateCompte = useCallback(async (id: string, data: UpdateCompteFinancierData): Promise<CompteFinancier> => {
    return crud.updateAsync({ id, data: data as Partial<CompteFinancier> });
  }, [crud.updateAsync]);

  // Wrapper to match original deleteCompte(id) signature
  const deleteCompte = useCallback(async (id: string): Promise<void> => {
    await crud.removeAsync(id);
  }, [crud.removeAsync]);

  // Utility methods — memoized for performance
  const comptesArray = comptes as CompteFinancier[];

  const getComptesByType = useCallback((type: 'mobile_money' | 'banque' | 'cash') => {
    return comptesArray.filter(compte => compte.type_compte === type && compte.is_active);
  }, [comptesArray]);

  const getComptesByDevise = useCallback((devise: 'USD' | 'CDF' | 'CNY') => {
    return comptesArray.filter(compte => compte.devise === devise && compte.is_active);
  }, [comptesArray]);

  const getTotalBalance = useCallback((devise: 'USD' | 'CDF' | 'CNY') => {
    return comptesArray
      .filter(compte => compte.devise === devise && compte.is_active)
      .reduce((total, compte) => total + parseFloat(compte.solde_actuel.toString()), 0);
  }, [comptesArray]);

  const getActiveComptes = useCallback(() => {
    return comptesArray.filter(compte => compte.is_active);
  }, [comptesArray]);

  return {
    comptes: comptesArray,
    loading,
    error,
    fetchComptes,
    createCompte,
    updateCompte,
    deleteCompte,
    getComptesByType,
    getComptesByDevise,
    getTotalBalance,
    getActiveComptes,
  };
};
