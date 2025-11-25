import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { activityLogger } from '@/services/activityLogger';
import { getFriendlyErrorMessage } from '@/utils/errorHandler';
import { validateTransactionInput } from '@/lib/security/input-validation';
import { detectAttackPatterns } from '@/lib/security/validation';
import { logSecurityEvent } from '@/lib/security/error-handling';
import type { Transaction, UpdateTransactionData, CreateTransactionData, TransactionFilters } from '@/types';

export const useTransactions = (
  page: number = 1, 
  filters: TransactionFilters = {},
  sortColumn: string = 'date_paiement',
  sortDirection: 'asc' | 'desc' = 'desc'
) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingTotals, setIsLoadingTotals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0
  });
  const [globalTotals, setGlobalTotals] = useState({
    totalUSD: 0,
    totalCDF: 0,
    totalCNY: 0,
    totalFrais: 0,
    totalBenefice: 0,
    totalDepenses: 0,
    totalCount: 0
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          client:clients(*),
          compte_source:comptes_financiers!transactions_compte_source_id_fkey(id, nom, type_compte, devise),
          compte_destination:comptes_financiers!transactions_compte_destination_id_fkey(id, nom, type_compte, devise)
        `, { count: 'exact' });

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
      
      // Filtrer uniquement les transactions commerciales (Commande, Transfert, Paiement Colis)
      if (filters.motifCommercial) {
        query = query.in('motif', ['Commande', 'Transfert', 'Paiement Colis']);
      }
      
      // Filtrer par type de transaction (pour les onglets)
      if (filters.typeTransaction && filters.typeTransaction.length > 0) {
        query = query.in('type_transaction', filters.typeTransaction);
      }
      
      // Exclure certains motifs (pour les opérations internes)
      if (filters.excludeMotifs && filters.excludeMotifs.length > 0) {
        query = query.not('motif', 'in', `(${filters.excludeMotifs.join(',')})`);
      }
      
      // Appliquer le tri AVANT la pagination
      const ascending = sortDirection === 'asc';
      query = query.order(sortColumn, { ascending });

      // Appliquer la pagination APRÈS le tri (sauf si recherche active)
      if (!filters.search) {
        query = query.range((page - 1) * pagination.pageSize, page * pagination.pageSize - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Filtrage côté client pour la recherche
      let filteredData = data || [];
      let filteredCount = count || 0;
      
      if (filters.search && filteredData.length > 0) {
        const searchLower = filters.search.toLowerCase().trim();
        filteredData = filteredData.filter((transaction: any) => {
          const matchId = transaction.id?.toLowerCase().includes(searchLower);
          const matchClientNom = transaction.client?.nom?.toLowerCase().includes(searchLower);
          const matchClientTelephone = transaction.client?.telephone?.toLowerCase().includes(searchLower);
          const matchModePaiement = transaction.mode_paiement?.toLowerCase().includes(searchLower);
          return matchId || matchClientNom || matchClientTelephone || matchModePaiement;
        });
        filteredCount = filteredData.length;
        
        // Appliquer la pagination côté client si recherche active
        const from = (page - 1) * pagination.pageSize;
        const to = from + pagination.pageSize;
        filteredData = filteredData.slice(from, to);
      }

      setTransactions(filteredData);
      setPagination(prev => ({
        ...prev,
        count: filteredCount,
        page,
        totalPages: Math.ceil(filteredCount / prev.pageSize)
      }));
    } catch (err: any) {
      const friendlyMessage = getFriendlyErrorMessage(err, 'Erreur de chargement des transactions');
      setError(friendlyMessage);
      // Ne pas afficher de toast pour éviter de polluer l'UI
      // L'erreur est loggée dans la console et stockée dans le state
    } finally {
      setLoading(false);
    }
  }, [page, filters.status, filters.currency, filters.modePaiement, filters.search, filters.motifCommercial, JSON.stringify(filters.typeTransaction), JSON.stringify(filters.excludeMotifs), pagination.pageSize, refreshTrigger]);

  // Fonction pour calculer les totaux globaux (toutes pages confondues)
  const fetchGlobalTotals = useCallback(async () => {
    try {
      setIsLoadingTotals(true);
      let query = supabase
        .from('transactions')
        .select('montant, devise, montant_cny, frais, benefice, motif, type_transaction');

      // Appliquer les mêmes filtres que fetchTransactions
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
      
      // Filtrer uniquement les transactions commerciales (Commande et Transfert)
      if (filters.motifCommercial) {
        query = query.in('motif', ['Commande', 'Transfert', 'Paiement Colis']);
      }
      
      // Filtrer par type de transaction
      if (filters.typeTransaction && filters.typeTransaction.length > 0) {
        query = query.in('type_transaction', filters.typeTransaction);
      }
      
      // Exclure certains motifs
      if (filters.excludeMotifs && filters.excludeMotifs.length > 0) {
        query = query.not('motif', 'in', `(${filters.excludeMotifs.join(',')})`);
      }
      
      // Appliquer la recherche textuelle pour les totaux
      if (filters.search) {
        query = query.or(`id.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Calculer les totaux globaux
      const totals = (data || []).reduce((acc, transaction: any) => {
        // Total USD/CDF ne compte QUE les transactions commerciales (Commande, Transfert)
        // PAS les dépenses/revenus internes
        if (transaction.motif === 'Commande' || transaction.motif === 'Transfert' || transaction.motif === 'Paiement Colis') {
          if (transaction.devise === 'USD') {
            acc.totalUSD += transaction.montant || 0;
          } else if (transaction.devise === 'CDF') {
            acc.totalCDF += transaction.montant || 0;
          }
          acc.totalCNY += transaction.montant_cny || 0;
          acc.totalFrais += transaction.frais || 0;
          acc.totalBenefice += transaction.benefice || 0;
        }
        
        // Calculer les dépenses séparément (toutes devises)
        if (transaction.type_transaction === 'depense') {
          acc.totalDepenses += transaction.montant || 0;
        }
        
        return acc;
      }, {
        totalUSD: 0,
        totalCDF: 0,
        totalCNY: 0,
        totalFrais: 0,
        totalBenefice: 0,
        totalDepenses: 0
      });

      setGlobalTotals({
        ...totals,
        totalCount: data?.length || 0
      });
    } catch (err: any) {
      console.error('Error fetching global totals:', err);
      // En cas d'erreur, mettre à zéro
      setGlobalTotals({
        totalUSD: 0,
        totalCDF: 0,
        totalCNY: 0,
        totalFrais: 0,
        totalBenefice: 0,
        totalDepenses: 0,
        totalCount: 0
      });
    } finally {
      setIsLoadingTotals(false);
    }
  }, [filters.status, filters.currency, filters.modePaiement, filters.clientId, filters.dateFrom, filters.dateTo, filters.minAmount, filters.maxAmount, filters.motifCommercial, JSON.stringify(filters.typeTransaction), JSON.stringify(filters.excludeMotifs), filters.search]);

  useEffect(() => {
    fetchTransactions();
    // Charger les totaux de manière asynchrone (non bloquant)
    setTimeout(() => fetchGlobalTotals(), 0);
  }, [page, filters.status, filters.currency, filters.modePaiement, filters.clientId, filters.dateFrom, filters.dateTo, filters.minAmount, filters.maxAmount, filters.search, filters.motifCommercial, JSON.stringify(filters.typeTransaction), JSON.stringify(filters.excludeMotifs), sortColumn, sortDirection, refreshTrigger]);

  const createTransaction = async (transactionData: CreateTransactionData) => {
    setIsCreating(true);
    setError(null);

    try {
      // Log input data for debugging
      console.log('🔍 Creating transaction with data:', transactionData);
      
      // SECURITY: Validate and sanitize input data
      const validation = validateTransactionInput(transactionData);
      console.log('✅ Validation result:', validation);
      
      if (!validation.isValid) {
        const errorMsg = `Validation error: ${validation.error}`;
        console.error('❌ Validation failed:', errorMsg);
        setError(errorMsg);
        showError(errorMsg);
        
        // Log security event
        logSecurityEvent(
          'INVALID_TRANSACTION_INPUT',
          errorMsg,
          'medium',
          { inputData: transactionData }
        );
        
        throw new Error(errorMsg);
      }

      // SECURITY: Check for attack patterns
      const suspiciousFields = ['mode_paiement'];
      for (const field of suspiciousFields) {
        if (transactionData[field as keyof CreateTransactionData]) {
          const attackCheck = detectAttackPatterns(transactionData[field as keyof CreateTransactionData] as string);
          if (attackCheck.isAttack) {
            const errorMsg = `Suspicious input detected in ${field}`;
            setError(errorMsg);
            showError(errorMsg);
            
            // Log security event
            logSecurityEvent(
              'SUSPICIOUS_INPUT_DETECTED',
              errorMsg,
              'high',
              { 
                field, 
                inputData: transactionData[field as keyof CreateTransactionData],
                attackType: attackCheck.attackType 
              }
            );
            
            throw new Error(errorMsg);
          }
        }
      }

      // Use sanitized data
      const sanitizedData = validation.sanitizedValue;

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

      const tauxUSD = sanitizedData.devise === 'USD' ? 1 : rates.usdToCdf;
      
      // Pour les dépenses et revenus (opérations financières), utiliser des frais fixes de 0%
      let fraisUSD = 0;
      let benefice = 0;
      
      if (sanitizedData.type_transaction === 'revenue') {
        // Pour les revenus (Commande, Transfert), calculer les frais selon le motif
        const fraisRate = fees[sanitizedData.motif.toLowerCase() as keyof typeof fees] || 0;
        fraisUSD = sanitizedData.montant * (fraisRate / 100);
        const commissionPartenaire = sanitizedData.montant * (fees.partenaire / 100);
        benefice = fraisUSD - commissionPartenaire;
      } else if (sanitizedData.type_transaction === 'depense') {
        // Pour les dépenses, pas de frais ni de bénéfice (c'est une sortie d'argent)
        fraisUSD = 0;
        benefice = 0;
      }
      
      const montantNet = sanitizedData.montant - fraisUSD; // Montant après déduction des frais
      const montantCNY = sanitizedData.devise === 'USD' 
        ? montantNet * rates.usdToCny 
        : (montantNet / tauxUSD) * rates.usdToCny;

      const fullTransactionData = {
        ...sanitizedData,
        taux_usd_cny: rates.usdToCny,
        taux_usd_cdf: rates.usdToCdf,
        montant_cny: montantCNY,
        frais: fraisUSD,
        benefice: benefice,
        date_paiement: sanitizedData.date_paiement || new Date().toISOString(),
        statut: sanitizedData.statut || 'En attente'
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

      showSuccess('Transaction créée avec succès');
      
      // Forcer le refresh immédiatement
      setRefreshTrigger(prev => prev + 1);
      // Appel direct pour refresh immédiat
      setTimeout(() => {
        fetchTransactions();
        fetchGlobalTotals(); // Rafraîchir les totaux globaux
      }, 100);
      
      return data;
    } catch (err: any) {
      console.error('❌ Error creating operation:', err);
      console.error('Error details:', {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        stack: err?.stack
      });
      const friendlyMessage = getFriendlyErrorMessage(err, 'Erreur de création');
      setError(friendlyMessage);
      showError(friendlyMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateTransaction = async (id: string, transactionData: UpdateTransactionData) => {
    setIsUpdating(true);
    setError(null);

    try {
      let updatedData = { ...transactionData };
      
      console.log(' updateTransaction called with:', { id, transactionData });
      
      if (transactionData.montant !== undefined || transactionData.devise || transactionData.motif) {
        const { data: currentTransaction } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', id)
          .single();

        if (currentTransaction) {
          const { data: settings } = await supabase
            .from('settings')
            .select('cle, valeur, categorie')
            .in('categorie', ['taux_change', 'frais'])
            .in('cle', ['usdToCny', 'usdToCdf', 'transfert', 'commande', 'partenaire']);
          
          const rates: Record<string, number> = { usdToCny: 7.25, usdToCdf: 2850 };
          const fees: Record<string, number> = { transfert: 5, commande: 10, partenaire: 3 };

          settings?.forEach((setting: any) => {
            if (setting.categorie === 'taux_change') {
              rates[setting.cle] = parseFloat(setting.valeur);
            } else if (setting.categorie === 'frais') {
              fees[setting.cle] = parseFloat(setting.valeur);
            }
          });

          const montant = transactionData.montant ?? currentTransaction.montant;
          const devise = transactionData.devise ?? currentTransaction.devise;
          const motif = transactionData.motif ?? currentTransaction.motif;

          const tauxUSD = devise === 'USD' ? 1 : rates.usdToCdf;
          const fraisRate = fees[motif?.toLowerCase() as keyof typeof fees] || 0;
          const fraisUSD = montant * (fraisRate / 100);
          const montantNet = montant - fraisUSD;
          const montantCNY = devise === 'USD' 
            ? montantNet * rates.usdToCny 
            : (montantNet / tauxUSD) * rates.usdToCny;
          const commissionPartenaire = montant * (fees.partenaire / 100);
          const benefice = fraisUSD - commissionPartenaire;

          updatedData = {
            ...updatedData,
            montant: montant,
            devise: devise,
            taux_usd_cny: rates.usdToCny,
            taux_usd_cdf: rates.usdToCdf,
            montant_cny: montantCNY,
            frais: fraisUSD,
            benefice: benefice
          };
        }
      }

      // Exclure les champs de compte pour éviter les erreurs RLS
      const { compte_source_id, compte_destination_id, ...safeData } = updatedData as any;
      
      const { data, error } = await supabase
        .from('transactions')
        .update(safeData)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      await activityLogger.logActivityWithChanges(
        'Modification Transaction',
        'transactions',
        id,
        { before: transactions.find(t => t.id === id), after: data }
      );

      showSuccess('Transaction mise à jour avec succès');
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => { fetchTransactions(); fetchGlobalTotals(); }, 100);
      
      return data;
    } catch (err: any) {
      console.error('❌ Error updating:', err);
      setError(err.message || 'Erreur');
      showError(err.message || 'Erreur');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error, count } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) throw error;
      if (count === 0) return { error: 'Non trouvée' };

      await activityLogger.logActivity('Suppression Transaction', 'transactions', id);
      showSuccess('Transaction supprimée');
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => { fetchTransactions(); fetchGlobalTotals(); }, 100);
      
      return { message: 'Supprimée' };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  return {
    transactions,
    loading,
    isCreating,
    isUpdating,
    error,
    pagination,
    globalTotals,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions
  };
};