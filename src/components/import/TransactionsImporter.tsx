"use client";

import React from 'react';
import CSVImporter from './CSVImporter';
import { supabaseService } from '@/services/supabase';
import { showSuccess } from '@/utils/toast';

interface TransactionsImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const TransactionsImporter: React.FC<TransactionsImporterProps> = ({ isOpen, onClose, onSuccess }) => {
  const requiredColumns = ['client_id', 'montant', 'devise', 'motif', 'mode_paiement'];
  const acceptedColumns = [
    'client_id',
    'client',
    'clientName',
    'clientName',
    'montant',
    'amount',
    'devise',
    'currency',
    'motif',
    'reason',
    'mode_paiement',
    'paymentMethod',
    'payment_mode',
    'statut',
    'status',
    'date_paiement',
    'date',
    'payment_date',
    'frais',
    'fees',
    'benefice',
    'profit',
    'taux_usd_cny',
    'taux_usd_cdf',
    'montant_cny',
    'cny_amount',
    'notes',
    'observations'
  ];

  const sampleData = [
    ['clientName', 'montant', 'devise', 'motif', 'mode_paiement', 'date_paiement', 'statut'],
    ['Jean Mukendi', '100', 'USD', 'Commande', 'Airtel Money', '2024-01-15', 'Servi'],
    ['Marie Kalonji', '50000', 'CDF', 'Transfert', 'Orange Money', '2024-01-16', 'En attente'],
    ['Pierre Tshibangu', '200', 'USD', 'Commande', 'Wave', '2024-01-17', 'Servi']
  ];

  const handleImport = async (data: any[]) => {
    const results = { success: 0, errors: [] as string[] };

    // Get all clients for name matching
    const clientsResponse = await supabaseService.getClients(1, 1000, {});
    const clientsMap = new Map();
    
    if (!clientsResponse.error && clientsResponse.data?.data) {
      clientsResponse.data.data.forEach(client => {
        clientsMap.set(client.nom.toLowerCase(), client.id);
      });
    }

    for (const row of data) {
      try {
        let clientId = row.client_id;
        
        // If client_id is not provided, try to match by name
        if (!clientId && row.clientName) {
          clientId = clientsMap.get(row.clientName.toLowerCase());
        }

        if (!clientId) {
          results.errors.push(`Client non trouvé: ${row.clientName || row.client_id || 'ID manquant'}`);
          continue;
        }

        const transactionData = {
          type_transaction: 'revenue' as 'revenue' | 'depense' | 'transfert',
          client_id: clientId,
          montant: parseFloat(row.montant || row.amount || '0'),
          devise: row.devise || row.currency || 'USD',
          motif: row.motif || row.reason || 'Commande',
          mode_paiement: row.mode_paiement || row.paymentMethod || row.payment_mode || 'Cash',
          date_paiement: row.date_paiement || row.date || row.payment_date || new Date().toISOString().split('T')[0],
          statut: row.statut || row.status || 'Servi'
        };

        // Validation
        if (!transactionData.montant || transactionData.montant <= 0) {
          results.errors.push(`Montant invalide pour ${row.clientName || clientId}`);
          continue;
        }

        if (!['USD', 'CDF'].includes(transactionData.devise)) {
          results.errors.push(`Devise invalide pour ${row.clientName || clientId}: ${transactionData.devise}`);
          continue;
        }

        // Create transaction
        const response = await supabaseService.createTransaction(transactionData);
        
        if (response.error) {
          results.errors.push(`Erreur pour ${row.clientName || clientId}: ${response.error}`);
        } else {
          results.success++;
        }
      } catch (error: any) {
        results.errors.push(`Erreur inattendue: ${error.message}`);
      }
    }

    return results;
  };

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
    showSuccess('Importation des transactions terminée');
  };

  return (
    <CSVImporter
      title="Importer des Transactions"
      description="Importez vos transactions depuis un fichier CSV. Vous pouvez mapper les noms de clients ou utiliser les IDs directement."
      onImport={handleImport}
      isOpen={isOpen}
      onClose={handleSuccess}
      acceptedColumns={acceptedColumns}
      requiredColumns={requiredColumns}
      sampleData={sampleData}
    />
  );
};

export default TransactionsImporter;