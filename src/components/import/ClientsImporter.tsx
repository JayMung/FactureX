"use client";

import React from 'react';
import CSVImporter from './CSVImporter';
import { supabaseService } from '@/services/supabase';
import { showSuccess } from '@/utils/toast';

interface ClientsImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ClientsImporter: React.FC<ClientsImporterProps> = ({ isOpen, onClose, onSuccess }) => {
  const requiredColumns = ['nom', 'telephone', 'ville'];
  const acceptedColumns = [
    'nom',
    'telephone', 
    'telephone1',
    'phone',
    'mobile',
    'ville',
    'city',
    'total_paye',
    'totalPaid',
    'balance',
    'solde',
    'notes',
    'observations',
    'created_at',
    'created'
  ];

  const sampleData = [
    ['nom', 'telephone', 'ville', 'total_paye', 'notes'],
    ['Jean Mukendi', '+243 123 456 789', 'Kinshasa', '270', 'Client fidèle'],
    ['Marie Kalonji', '+243 987 654 321', 'Lubumbashi', '150', 'Paiements réguliers'],
    ['Pierre Tshibangu', '+243 555 123 456', 'Goma', '0', 'Nouveau client']
  ];

  const handleImport = async (data: any[]) => {
    const results = { success: 0, errors: [] as string[] };

    for (const row of data) {
      try {
        const clientData = {
          nom: row.nom || row.name || '',
          telephone: row.telephone || row.telephone1 || row.phone || row.mobile || '',
          ville: row.ville || row.city || '',
          total_paye: parseFloat(row.total_paye || row.totalPaid || row.balance || row.solde || '0') || 0
        };

        // Validation
        if (!clientData.nom.trim()) {
          results.errors.push(`Nom du client manquant`);
          continue;
        }

        if (!clientData.telephone.trim()) {
          results.errors.push(`Téléphone manquant pour ${clientData.nom}`);
          continue;
        }

        if (!clientData.ville.trim()) {
          results.errors.push(`Ville manquante pour ${clientData.nom}`);
          continue;
        }

        // Check if client already exists
        const existingClients = await supabaseService.getClients(1, 1000, {
          search: clientData.telephone
        });

        if (!existingClients.error && existingClients.data?.data.some(c => 
          c.telephone === clientData.telephone || c.nom.toLowerCase() === clientData.nom.toLowerCase()
        )) {
          results.errors.push(`Le client "${clientData.nom}" existe déjà`);
          continue;
        }

        // Create client
        const response = await supabaseService.createClient(clientData);
        
        if (response.error) {
          results.errors.push(`Erreur pour ${clientData.nom}: ${response.error}`);
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
    showSuccess('Importation des clients terminée');
  };

  return (
    <CSVImporter
      title="Importer des Clients"
      description="Importez vos clients depuis un fichier CSV. Assurez-vous d'avoir les colonnes nom, téléphone et ville."
      onImport={handleImport}
      isOpen={isOpen}
      onClose={handleSuccess}
      acceptedColumns={acceptedColumns}
      requiredColumns={requiredColumns}
      sampleData={sampleData}
    />
  );
};

export default ClientsImporter;