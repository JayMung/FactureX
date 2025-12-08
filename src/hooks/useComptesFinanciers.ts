import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganization } from './useOrganization';
import type { CompteFinancier, CreateCompteFinancierData, UpdateCompteFinancierData } from '@/types';

export const useComptesFinanciers = () => {
  const [comptes, setComptes] = useState<CompteFinancier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { organizationId } = useOrganization();

  // Fetch all financial accounts
  const fetchComptes = async () => {
    if (!organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('comptes_financiers')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setComptes(data || []);
    } catch (error: any) {
      console.error('Error fetching comptes:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a new financial account
  const createCompte = async (data: CreateCompteFinancierData): Promise<CompteFinancier> => {
    if (!organizationId) throw new Error('Organization ID is required');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Debug JWT contents
      const { data: { session } } = await supabase.auth.getSession();
      console.log('JWT token payload:', session?.access_token ? JSON.parse(atob(session.access_token.split('.')[1])) : 'No token');
      console.log('User metadata:', user.user_metadata);
      console.log('User app metadata:', user.app_metadata);
      console.log('Organization ID from hook:', organizationId);
      console.log('Creating compte with data:', {
        ...data,
        organization_id: organizationId,
        created_by: user.id,
      });

      const { data: newCompte, error } = await supabase
        .from('comptes_financiers')
        .insert({
          ...data,
          organization_id: organizationId,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        throw error;
      }
      if (!newCompte) throw new Error('Failed to create compte');

      // Refresh the list
      await fetchComptes();
      return newCompte;
    } catch (error: any) {
      console.error('Error creating compte:', error);
      throw error;
    }
  };

  // Update an existing financial account
  const updateCompte = async (id: string, data: UpdateCompteFinancierData): Promise<CompteFinancier> => {
    try {
      const { data: updatedCompte, error } = await supabase
        .from('comptes_financiers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!updatedCompte) throw new Error('Failed to update compte');

      // Update local state
      setComptes(prev => prev.map(compte => 
        compte.id === id ? updatedCompte : compte
      ));

      return updatedCompte;
    } catch (error: any) {
      console.error('Error updating compte:', error);
      throw error;
    }
  };

  // Delete a financial account
  const deleteCompte = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('comptes_financiers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setComptes(prev => prev.filter(compte => compte.id !== id));
    } catch (error: any) {
      console.error('Error deleting compte:', error);
      throw error;
    }
  };

  // Get accounts by type
  const getComptesByType = (type: 'mobile_money' | 'banque' | 'cash') => {
    return comptes.filter(compte => compte.type_compte === type && compte.is_active);
  };

  // Get accounts by currency
  const getComptesByDevise = (devise: 'USD' | 'CDF') => {
    return comptes.filter(compte => compte.devise === devise && compte.is_active);
  };

  // Get total balance by currency
  const getTotalBalance = (devise: 'USD' | 'CDF') => {
    return comptes
      .filter(compte => compte.devise === devise && compte.is_active)
      .reduce((total, compte) => total + parseFloat(compte.solde_actuel.toString()), 0);
  };

  // Get active accounts only
  const getActiveComptes = () => {
    return comptes.filter(compte => compte.is_active);
  };

  // Fetch on mount and when organization changes
  useEffect(() => {
    if (organizationId) {
      fetchComptes();
    }
  }, [organizationId]);

  return {
    comptes,
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
