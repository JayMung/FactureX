import { useState } from 'react';
import { supabaseService } from '@/services/supabase';
import type { Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { exportToCsv, exportToText } from '@/utils/csv-export';

export const useBulkOperations = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const deleteMultipleClients = async (clientIds: string[]): Promise<{ success: number; errors: string[] }> => {
    setIsProcessing(true);
    const results = { success: 0, errors: [] as string[] };

    try {
      for (const clientId of clientIds) {
        try {
          const response = await supabaseService.deleteClient(clientId);
          if (response.error) {
            results.errors.push(`Erreur pour ${clientId}: ${response.error}`);
          } else {
            results.success++;
          }
        } catch (error: any) {
          results.errors.push(`Erreur inattendue pour ${clientId}: ${error.message}`);
        }
      }

      if (results.success > 0) {
        showSuccess(`${results.success} client(s) supprimé(s) avec succès`);
      }
      
      if (results.errors.length > 0) {
        showError(`${results.errors.length} erreur(s) lors de la suppression`);
      }

    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsProcessing(false);
    }

    return results;
  };

  const exportSelectedClients = (clients: Client[]) => {
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
  };

  const emailSelectedClients = (clients: Client[]) => {
    const content = clients
      .filter(client => client.telephone)
      .map(client => `${client.nom} (${client.telephone})`)
      .join('\n');

    exportToText(content, 'clients-contact');
    showSuccess(`Informations de contact de ${clients.length} client(s) téléchargées`);
  };

  const mergeDuplicateClients = async (duplicateGroups: any[]): Promise<{ success: number; errors: string[] }> => {
    setIsProcessing(true);
    const results = { success: 0, errors: [] as string[] };

    try {
      for (const group of duplicateGroups) {
        try {
          // Garder le premier client (le plus récent ou le plus complet)
          const keepClient = group.clients[0];
          const duplicateClients = group.clients.slice(1);

          // Fusionner les données
          let mergedData = { ...keepClient };
          
          // Additionner les montants payés
          const totalPaid = group.clients.reduce((sum: number, client: Client) => 
            sum + (client.total_paye || 0), 0
          );
          mergedData.total_paye = totalPaid;

          // Mettre à jour le client conservé
          const updateResponse = await supabaseService.updateClient(keepClient.id, mergedData);
          
          if (updateResponse.error) {
            results.errors.push(`Erreur fusion pour ${keepClient.nom}: ${updateResponse.error}`);
            continue;
          }

          // Supprimer les doublons
          for (const duplicate of duplicateClients) {
            const deleteResponse = await supabaseService.deleteClient(duplicate.id);
            if (deleteResponse.error) {
              results.errors.push(`Erreur suppression doublon ${duplicate.nom}: ${deleteResponse.error}`);
            }
          }

          results.success++;
        } catch (error: any) {
          results.errors.push(`Erreur inattendue lors de la fusion: ${error.message}`);
        }
      }

      if (results.success > 0) {
        showSuccess(`${results.success} groupe(s) de doublons fusionné(s) avec succès`);
      }
      
      if (results.errors.length > 0) {
        showError(`${results.errors.length} erreur(s) lors de la fusion`);
      }

    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsProcessing(false);
    }

    return results;
  };

  return {
    isProcessing,
    deleteMultipleClients,
    exportSelectedClients,
    emailSelectedClients,
    mergeDuplicateClients
  };
};