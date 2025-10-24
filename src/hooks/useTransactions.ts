import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { activityLogger } from '@/services/activityLogger';
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

      // Appliquer les filtres
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
  }, [page, filters.status, filters.currency, filters.modePaiement, pagination.pageSize]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = async (transactionData: CreateTransactionData) => {
    setIsCreating(true);
    setError(null);

    try {
      // Obtenir les taux et frais
      const { data: settings } = await supabase
        .from('settings')
        .select('cle, valeur, categorie')
        .in('categorie', ['taux_change', 'frais'])
        .in('cle', ['usdToCny', 'usdToCdf', 'transfert', 'commande', 'partenaire']);

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

      const tauxUSD = transactionData.devise === 'USD' ? 1 : rates.usdToCdf;
      const fraisUSD = transactionData.montant * (fees[transactionData.motif.toLowerCase() as keyof typeof fees] / 100);
      const montantCNY = transactionData.devise === 'USD' 
        ? transactionData.montant * rates.usdToCny 
        : (transactionData.montant / tauxUSD) * rates.usdToCny;
      const commissionPartenaire = transactionData.montant * (fees.partenaire / 100);
      const benefice = fraisUSD - commissionPartenaire;

      const fullTransactionData = {
        ...transactionData,
        taux_usd_cny: rates.usdToCny,
        taux_usd_cdf: rates.usdToCdf,
        montant_cny: montantCNY,
        frais: fraisUSD,
        benefice: benefice,
        date_paiement: transactionData.date_paiement || new Date().toISOString(),
        statut: transactionData.statut || 'En attente'
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([fullTransactionData])
        .select(`
          *,
          client:clients(*)
        `)
        .single();

      if (error) throw error;

      // Logger l'activité
      await activityLogger.logActivityWithChanges(
        'Création Transaction',
        'transactions',
        data.id,
        {
          before: null,
          after: fullTransactionData
        }
      );

      // Ajouter la nouvelle transaction à l'état local
      setTransactions(prev => [data!, ...prev]);
      
      showSuccess('Transaction créée avec succès');
      
      // Auto-refresh pour synchroniser les données
      await fetchTransactions();
      
      return data;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la création de la transaction');
      showError(err.message || 'Erreur lors de la création de la transaction');
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateTransaction = async (id: string, transactionData: UpdateTransactionData) => {
    setIsUpdating(true);
    setError(null);

    try {
      // Si montant, devise ou motif changent, recalculer les frais et bénéfices
      let updatedData = { ...transactionData };
      
      if (transactionData.montant || transactionData.devise || transactionData.motif) {
        // Récupérer la transaction actuelle pour avoir toutes les valeurs
        const { data: currentTransaction } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();

        if (currentTransaction) {
          // Récupérer les paramètres
          const { data: settings } = await supabase
            .from('settings')
            .select('cle, valeur, categorie')
            .in('categorie', ['taux_change', 'frais'])
            .in('cle', ['usdToCny', 'usdToCdf', 'transfert', 'commande', 'partenaire']);

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

          // Utiliser les nouvelles valeurs ou les valeurs actuelles
          const montant = transactionData.montant ?? currentTransaction.montant;
          const devise = transactionData.devise ?? currentTransaction.devise;
          const motif = transactionData.motif ?? currentTransaction.motif;

          const tauxUSD = devise === 'USD' ? 1 : rates.usdToCdf;
          const fraisUSD = montant * (fees[motif.toLowerCase() as keyof typeof fees] / 100);
          const montantCNY = devise === 'USD' 
            ? montant * rates.usdToCny 
            : (montant / tauxUSD) * rates.usdToCny;
          const commissionPartenaire = montant * (fees.partenaire / 100);
          const benefice = fraisUSD - commissionPartenaire;

          // Ajouter les champs calculés
          updatedData = {
            ...updatedData,
            taux_usd_cny: rates.usdToCny,
            taux_usd_cdf: rates.usdToCdf,
            montant_cny: montantCNY,
            frais: fraisUSD,
            benefice: benefice
          };
        }
      }

      const { data, error } = await supabase
        .from('transactions')
        .update(updatedData)
        .eq('id', id)
        .select(`
          *,
          client:clients(*)
        `)
        .single();

      if (error) throw error;

      // Logger l'activité
      await activityLogger.logActivityWithChanges(
        'Modification Transaction',
        'transactions',
        id,
        {
          before: transactions.find(t => t.id === id),
          after: data
        }
      );

      // Mettre à jour la transaction dans l'état local
      setTransactions(prev => 
        prev.map(t => t.id === id ? data! : t)
      );
      
      showSuccess('Transaction mise à jour avec succès');
      
      // Auto-refresh pour synchroniser les données
      await fetchTransactions();
      
      return data;
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la mise à jour de la transaction');
      showError(err.message || 'Erreur lors de la mise à jour de la transaction');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      console.log('Tentative de suppression de la transaction:', id);
      
      // Suppression directe sans vérifications complexes
      const { error, count } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        console.error('Erreur Supabase lors de la suppression:', error);
        
        // Si c'est une erreur RLS, essayer avec une approche différente
        if (error.code === 'PGRST301' || error.message.includes('policy')) {
          console.log('Erreur de politique détectée, tentative alternative...');
          
          // Essayer de marquer comme supprimé au lieu de supprimer réellement
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ 
              statut: 'Annulé',
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
            
          if (updateError) {
            throw updateError;
          }
          
          await activityLogger.logActivity(
            'Annulation Transaction (RLS)',
            'transactions',
            id
          );
          
          return { message: 'Transaction annulée avec succès (restriction RLS)' };
        }
        
        throw error;
      }
      
      console.log('Suppression réussie, count:', count);
      
      if (count === 0) {
        return { error: 'Transaction non trouvée ou déjà supprimée' };
      }

      // Logger l'activité
      await activityLogger.logActivity(
        'Suppression Transaction',
        'transactions',
        id
      );

      // Mettre à jour l'état local
      setTransactions(prev => prev.filter(t => t.id !== id));
      
      showSuccess('Transaction supprimée avec succès');
      
      // Auto-refresh pour synchroniser les données
      await fetchTransactions();
      
      return { message: 'Transaction supprimée avec succès' };
    } catch (error: any) {
      console.error('Erreur complète lors de la suppression:', error);
      return { error: error.message || 'Erreur lors de la suppression de la transaction' };
    }
  };

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
    refetch: fetchTransactions
  };
};