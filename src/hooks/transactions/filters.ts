// Fonctions de filtrage pour les transactions
import { COMMERCIAL_MOTIFS } from './constants';
import type { TransactionFilters } from '@/types';

/**
 * Applique les filtres de base à une requête Supabase
 */
export function applyBaseFilters(query: any, filters: TransactionFilters) {
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
  
  return query;
}

/**
 * Applique les filtres de motif commercial
 */
export function applyCommercialFilters(query: any, filters: TransactionFilters) {
  // Filtrer uniquement les transactions commerciales
  if (filters.motifCommercial) {
    query = query.in('motif', COMMERCIAL_MOTIFS);
  }
  
  // Filtrer par type de transaction
  if (filters.typeTransaction && filters.typeTransaction.length > 0) {
    query = query.in('type_transaction', filters.typeTransaction);
  }
  
  // Exclure certains motifs
  if (filters.excludeMotifs && filters.excludeMotifs.length > 0) {
    query = query.not('motif', 'in', `(${filters.excludeMotifs.join(',')})`);
  }
  
  // Filtrer les swaps internes
  if (filters.isSwap === true) {
    query = query.is('client_id', null);
  }
  
  // Exclure les swaps
  if (filters.isSwap === false) {
    query = query.not('client_id', 'is', null);
  }
  
  return query;
}

/**
 * Filtre côté client pour la recherche textuelle
 */
export function filterBySearch(transactions: any[], searchTerm: string) {
  if (!searchTerm) return transactions;
  
  const searchLower = searchTerm.toLowerCase().trim();
  return transactions.filter((transaction: any) => {
    const matchId = transaction.id?.toLowerCase().includes(searchLower);
    const matchClientNom = transaction.client?.nom?.toLowerCase().includes(searchLower);
    const matchClientTelephone = transaction.client?.telephone?.toLowerCase().includes(searchLower);
    const matchModePaiement = transaction.mode_paiement?.toLowerCase().includes(searchLower);
    return matchId || matchClientNom || matchClientTelephone || matchModePaiement;
  });
}
