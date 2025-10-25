"use client";

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  Transaction, 
  TransactionFilters, 
  CreateTransactionData, 
  UpdateTransactionData,
  ApiResponse,
  PaginatedResponse
} from '@/types';
import { showSuccess, showError } from '@/utils/toast';

export const useTransactions = (page: number = 1, filters: TransactionFilters = {}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Transaction> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('transactions')
        .select(`
          *,
          client:clients(*)
        `, { count: 'exact' })
        .range((page - 1) * 10, page * 10 - 1)
        .order('created_at', { ascending: false });

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
      setPagination({
        data: data || [],
        count: count || 0,
        page,
        pageSize: 10,
        totalPages: Math.ceil((count || 0) / 10)
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async (transactionData: CreateTransactionData): Promise<ApiResponse<Transaction>> => {
    setIsCreating(true);
    try {
      const rates = await getExchangeRates();
      const fees = await getFees();
      
      if (rates.error || fees.error) {
        throw new Error('Impossible de récupérer les taux ou frais');
      }

      const tauxUSD = transactionData.devise === 'USD' ? 1 : rates.data!.usdToCdf;
      const fraisUSD = transactionData.montant * (fees.data![transactionData.motif.toLowerCase() as keyof any] / 100);
      const montantCNY = transactionData.devise === 'USD' 
        ? transactionData.montant * rates.data!.usdToCny 
        : (transactionData.montant / tauxUSD) * rates.data!.usdToCny;
      const benefice = fraisUSD;

      const fullTransactionData = {
        ...transactionData,
        taux_usd_cny: rates.data!.usdToCny,
        taux_usd_cdf: rates.data!.usdToCdf,
        montant_cny: montantCNY,
        frais: fraisUSD,
        benefice: benefice,
        date_paiement: transactionData.date_paiement || new Date().toISOString(),
        statut: transactionData.statut || 'En attente'
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([fullTransactionData])
        .select()
        .single();

      if (error) throw error;

      await logActivity('Création transaction', 'Transaction', data.id);
      showSuccess('Transaction créée avec succès');
      fetchTransactions();

      return { data, message: 'Transaction créée avec succès' };
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de la création de la transaction';
      showError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  };

  const updateTransaction = async (id: string, transactionData: UpdateTransactionData): Promise<ApiResponse<Transaction>> => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logActivity('Modification transaction', 'Transaction', id);
      showSuccess('Transaction mise à jour avec succès');
      fetchTransactions();

      return { data, message: 'Transaction mise à jour avec succès' };
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de la mise à jour de la transaction';
      showError(errorMessage);
      return { error: errorMessage };
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTransaction = async (id: string): Promise<ApiResponse<void>> => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logActivity('Suppression transaction', 'Transaction', id);
      showSuccess('Transaction supprimée avec succès');
      fetchTransactions();

      return { message: 'Transaction supprimée avec succès' };
    } catch (error: any) {
      const errorMessage = error.message || 'Erreur lors de la suppression de la transaction';
      showError(errorMessage);
      return { error: errorMessage };
    }
  };

  const getExchangeRates = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'taux_change')
        .in('cle', ['usdToCny', 'usdToCdf']);

      if (error) throw error;

      const rates = {
        usdToCny: 7.25,
        usdToCdf: 2850
      };

      settings?.forEach(setting => {
        if (setting.cle === 'usdToCny') {
          rates.usdToCny = parseFloat(setting.valeur);
        } else if (setting.cle === 'usdToCdf') {
          rates.usdToCdf = parseFloat(setting.valeur);
        }
      });

      return { data: rates };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const getFees = async () => {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'frais')
        .in('cle', ['transfert', 'commande', 'partenaire']);

      if (error) throw error;

      const fees = {
        transfert: 5,
        commande: 10,
        partenaire: 3
      };

      settings?.forEach(setting => {
        if (setting.cle in fees) {
          fees[setting.cle as keyof typeof fees] = parseFloat(setting.valeur);
        }
      });

      return { data: fees };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const logActivity = async (action: string, entityType: string, entityId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase
        .from('activity_logs')
        .insert([{
          user_id: user.id,
          action,
          cible: entityType,
          cible_id: entityId,
          details: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        }]);
    } catch (error) {
      console.error('Erreur lors de la journalisation de l\'activité:', error);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, filters]);

  return {
    transactions,
    pagination,
    loading,
    isCreating,
    isUpdating,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions
  };
};