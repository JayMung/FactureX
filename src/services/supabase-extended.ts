import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from './supabase';
import type { Client, Transaction, ApiResponse } from '@/types';

export class SupabaseExtendedService {
  // Obtenir tous les IDs des clients (pour la sélection multi-pages)
  async getAllClientIds(): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ids = data?.map(client => client.id) || [];
      return { data: ids };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Obtenir tous les IDs des transactions (pour la sélection multi-pages)
  async getAllTransactionIds(): Promise<ApiResponse<string[]>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ids = data?.map(transaction => transaction.id) || [];
      return { data: ids };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Supprimer plusieurs clients en lot
  async deleteMultipleClients(clientIds: string[]): Promise<ApiResponse<{ success: number; errors: string[] }>> {
    const results = { success: 0, errors: [] as string[] };

    try {
      // Traiter par lots pour éviter les timeouts
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < clientIds.length; i += batchSize) {
        batches.push(clientIds.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        try {
          // Supprimer d'abord les transactions associées
          const { error: txError } = await supabase
            .from('transactions')
            .delete()
            .in('client_id', batch);

          if (txError) {
            console.warn('Erreur lors de la suppression des transactions:', txError);
          }

          // Supprimer les clients
          const { error } = await supabase
            .from('clients')
            .delete()
            .in('id', batch);

          if (error) {
            results.errors.push(`Erreur batch: ${error.message}`);
          } else {
            results.success += batch.length;
          }

          // Petite pause pour éviter de surcharger le serveur
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          results.errors.push(`Erreur inattendue: ${error.message}`);
        }
      }

      // Journaliser l'activité
      await supabaseService.logActivity(
        `Suppression multiple clients: ${results.success} succès, ${results.errors.length} erreurs`,
        'Client'
      );

      return { data: results };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Supprimer plusieurs transactions en lot
  async deleteMultipleTransactions(transactionIds: string[]): Promise<ApiResponse<{ success: number; errors: string[] }>> {
    const results = { success: 0, errors: [] as string[] };

    try {
      // Traiter par lots pour éviter les timeouts
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < transactionIds.length; i += batchSize) {
        batches.push(transactionIds.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        try {
          const { error } = await supabase
            .from('transactions')
            .delete()
            .in('id', batch);

          if (error) {
            results.errors.push(`Erreur batch: ${error.message}`);
          } else {
            results.success += batch.length;
          }

          // Petite pause pour éviter de surcharger le serveur
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          results.errors.push(`Erreur inattendue: ${error.message}`);
        }
      }

      // Journaliser l'activité
      await supabaseService.logActivity(
        `Suppression multiple transactions: ${results.success} succès, ${results.errors.length} erreurs`,
        'Transaction'
      );

      return { data: results };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Exporter plusieurs clients
  async exportMultipleClients(clientIds: string[]): Promise<ApiResponse<Client[]>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .in('id', clientIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Journaliser l'activité
      await supabaseService.logActivity(
        `Export multiple clients: ${data?.length || 0} clients`,
        'Client'
      );

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Exporter plusieurs transactions
  async exportMultipleTransactions(transactionIds: string[]): Promise<ApiResponse<any[]>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          client:clients(*)
        `)
        .in('id', transactionIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Journaliser l'activité
      await supabaseService.logActivity(
        `Export multiple transactions: ${data?.length || 0} transactions`,
        'Transaction'
      );

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}

export const supabaseExtendedService = new SupabaseExtendedService();