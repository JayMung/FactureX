import { useState } from 'react';
import { supabaseExtendedService } from '@/services/supabase-extended';
import type { Client, Transaction } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { exportToCsv, exportToText } from '@/utils/csv-export';

export const useExtendedBulkOperations = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationProgress, setOperationProgress] = useState(0);

  const deleteMultipleClients = async (clientIds: string[]): Promise<{ success: number; errors: string[] }> => {
    setIsProcessing(true);
    setOperationProgress(0);

    try {
      const results = await supabaseExtendedService.deleteMultipleClients(clientIds);
      
      if (results.data) {
        if (results.data.success > 0) {
          showSuccess(`${results.data.success} client(s) supprimé(s) avec succès`);
        }
        
        if (results.data.errors.length > 0) {
          showError(`${results.data.errors.length} erreur(s) lors de la suppression`);
          results.data.errors.forEach(error => console.error('Erreur suppression:', error));
        }
      } else if (results.error) {
        showError(results.error);
      }

      return results.data || { success: 0, errors: [] };
    } catch (error: any) {
      showError(error.message);
      return { success: 0, errors: [error.message] };
    } finally {
      setIsProcessing(false);
      setOperationProgress(0);
    }
  };

  const deleteMultipleTransactions = async (transactionIds: string[]): Promise<{ success: number; errors: string[] }> => {
    setIsProcessing(true);
    setOperationProgress(0);

    try {
      const results = await supabaseExtendedService.deleteMultipleTransactions(transactionIds);
      
      if (results.data) {
        if (results.data.success > 0) {
          showSuccess(`${results.data.success} transaction(s) supprimée(s) avec succès`);
        }
        
        if (results.data.errors.length > 0) {
          showError(`${results.data.errors.length} erreur(s) lors de la suppression`);
          results.data.errors.forEach(error => console.error('Erreur suppression:', error));
        }
      } else if (results.error) {
        showError(results.error);
      }

      return results.data || { success: 0, errors: [] };
    } catch (error: any) {
      showError(error.message);
      return { success: 0, errors: [error.message] };
    } finally {
      setIsProcessing(false);
      setOperationProgress(0);
    }
  };

  const exportSelectedClients = async (clientIds: string[]) => {
    try {
      const results = await supabaseExtendedService.exportMultipleClients(clientIds);
      
      if (results.error) {
        showError(results.error);
        return;
      }

      const clients = results.data || [];
      
      if (clients.length === 0) {
        showError('Aucun client à exporter');
        return;
      }

      exportToCsv(
        ['Nom', 'Téléphone', 'Ville', 'Total Payé', 'Date Création'],
        clients.map(client => [
          client.nom,
          client.telephone,
          client.ville,
          client.total_paye?.toString() || '0',
          client.created_at,
        ]),
        { filename: 'clients-selection' }
      );
      showSuccess(`${clients.length} client(s) exporté(s) avec succès`);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const exportSelectedTransactions = async (transactionIds: string[]) => {
    try {
      const results = await supabaseExtendedService.exportMultipleTransactions(transactionIds);
      
      if (results.error) {
        showError(results.error);
        return;
      }

      const transactions = results.data || [];
      
      if (transactions.length === 0) {
        showError('Aucune transaction à exporter');
        return;
      }

      exportToCsv(
        ['Client', 'Montant', 'Devise', 'Motif', 'Mode Paiement', 'Statut', 'Date', 'Frais', 'Bénéfice'],
        transactions.map(transaction => [
          transaction.client?.nom || '',
          transaction.montant.toString(),
          transaction.devise,
          transaction.motif,
          transaction.mode_paiement,
          transaction.statut,
          transaction.created_at,
          transaction.frais.toString(),
          transaction.benefice.toString(),
        ]),
        { filename: 'transactions-selection' }
      );
      showSuccess(`${transactions.length} transaction(s) exportée(s) avec succès`);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const emailSelectedClients = async (clientIds: string[]) => {
    try {
      const results = await supabaseExtendedService.exportMultipleClients(clientIds);
      
      if (results.error) {
        showError(results.error);
        return;
      }

      const clients = results.data || [];
      
      if (clients.length === 0) {
        showError('Aucun client à contacter');
        return;
      }

      const content = clients
        .filter(client => client.telephone)
        .map(client => `${client.nom} (${client.telephone})`)
        .join('\n');

      exportToText(content, 'clients-contact');
      showSuccess(`Informations de contact de ${clients.length} client(s) téléchargées`);
    } catch (error: any) {
      showError(error.message);
    }
  };

  return {
    isProcessing,
    operationProgress,
    deleteMultipleClients,
    deleteMultipleTransactions,
    exportSelectedClients,
    exportSelectedTransactions,
    emailSelectedClients
  };
};