import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import type { Transaction, UpdateTransactionData, CreateTransactionData, TransactionFilters } from '@/types';

export const useTransactions = (page: number = 1, filters: TransactionFilters = {}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          client:clients(*)
        `, { count: 'exact' })
        .range((page - 1) * pagination.pageSize, page * pagination.pageSize - 1)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status) {
        query = query.eq('statut', filters.status);
      }
      if (filters.currency) {
        query = query.eq('devise', filters.currency);
      }
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters.modePaiement) {
        query = query.eq('mode_paiement', filters.modePaiement);
      }
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }
      if (filters.minAmount) {
        query = query.gte('montant', parseFloat(filters.minAmount));
      }
      if (filters.maxAmount) {
        query = query.lte('montant', parseFloat(filters.maxAmount));
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setTransactions(data || []);
      setPagination(prev => ({
        ...prev,
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / prev.pageSize)
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [page, filters, pagination.pageSize]);

  const createTransaction = async (data: CreateTransactionData) => {
    setIsCreating(true);
    setError(null);

    try {
      // Get exchange rates and fees
      const { data: settings } = await supabase
        .from('settings')
        .select('cle, valeur, categorie')
        .in('categorie', ['taux_change', 'frais']);

      const rates: Record<string, number> = {
        usdToCny: 7.25,
        usdToCdf: 2850
      };

      const fees: Record<string, number> = {
        transfert: 5,
        commande: 10,
        partenaire: 3
      };

      settings?.forEach((setting: any) => {
        if (setting.categorie === 'taux_change') {
          rates[setting.cle] = parseFloat(setting.valeur);
        } else if (setting.categorie === 'frais') {
          fees[setting.cle] = parseFloat(setting.valeur);
        }
      });

      const tauxUSD = data.devise === 'USD' ? 1 : rates.usdToCdf;
      const fraisUSD = data.montant * (fees[data.motif.toLowerCase()] / 100);
      const montantCNY = data.devise === 'USD' 
        ? data.montant * rates.usdToCny 
        : (data.montant / tauxUSD) * rates.usdToCny;
      const benefice = fraisUSD;

      const transactionData = {
        ...data,
        taux_usd_cny: rates.usdToCny,
        taux_usd_cdf: rates.usdToCdf,
        montant_cny: montantCNY,
        frais: fraisUSD,
        benefice: benefice,
        date_paiement: data.date_paiement || new Date().toISOString(),
        statut: data.statut || 'En attente'
      };

      const { data: result, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select(`
          *,
          client:clients(*)
        `)
        .single();

      if (error) throw error;

      // Ajouter la nouvelle transaction à la liste locale
      setTransactions(prev => [result, ...prev]);
      
      // Afficher la notification UNE SEULE FOIS
      showSuccess('Transaction créée avec succès');
      
      return result;
    } catch (err: any) {
      setError(err.message);
      showError(err.message || 'Erreur lors de la création de la transaction');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateTransaction = async (id: string, data: UpdateTransactionData) => {
    setIsUpdating(true);
    setError(null);

    try {
      const { data: result, error } = await supabase
        .from('transactions')
        .update(data)
        .eq('id', id)
        .select(`
          *,
          client:clients(*)
        `)
        .single();

      if (error) throw error;

      setTransactions(prev => 
        prev.map(tx => tx.id === id ? result : tx)
      );
      
      showSuccess('Transaction mise à jour avec succès');
      return result;
    } catch (err: any) {
      setError(err.message);
      showError(err.message || 'Erreur lors de la mise à jour de la transaction');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTransactions(prev => prev.filter(tx => tx.id !== id));
      showSuccess('Transaction supprimée avec succès');
    } catch (err: any) {
      setError(err.message);
      showError(err.message || 'Erreur lors de la suppression de la transaction');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const refetch = useCallback(() => {
    return fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    isCreating,
    isUpdating,
    error,
    pagination,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch
  };
};