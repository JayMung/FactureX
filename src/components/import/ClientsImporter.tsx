"use client";

import React from 'react';
import CSVImporter from './CSVImporter';
import { supabaseService } from '@/services/supabase';
import { showSuccess } from '@/utils/toast';

interface ClientsImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (results: any) => void;
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
    const results = { 
      total: data.length, 
      success: 0, 
      errors: [] as string[], 
      warnings: [] as string[],
      successfulItems: [] as any[]
    };

    const existingPhones = new Set<string>();
    const existingNames = new Set<string>();

    // Pré-charger les clients existants pour détecter les doublons
    try {
      const existingClientsResponse = await supabaseService.getClients(1, 10000, {});
      if (!existingClientsResponse.error && existingClientsResponse.data?.data) {
        existingClientsResponse.data.data.forEach(client => {
          existingPhones.add(client.telephone);
          existingNames.add(client.nom.toLowerCase());
        });
      }
    } catch (error) {
      console.warn('Erreur lors du chargement des clients existants:', error);
    }

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 2; // +2 car ligne 1 = en-têtes

      try {
        const clientData = {
          nom: row.nom || row.name || '',
          telephone: row.telephone || row.telephone1 || row.phone || row.mobile || '',
          ville: row.ville || row.city || '',
          total_paye: parseFloat(row.total_paye || row.totalPaid || row.balance || row.solde || '0') || 0
        };

        // Validation
        if (!clientData.nom.trim()) {
          results.errors.push(`Ligne ${rowNumber}: Nom du client manquant`);
          continue;
        }

        if (!clientData.telephone.trim()) {
          results.errors.push(`Ligne ${rowNumber}: Téléphone manquant pour ${clientData.nom}`);
          continue;
        }

        if (!clientData.ville.trim()) {
          results.errors.push(`Ligne ${rowNumber}: Ville manquante pour ${clientData.nom}`);
          continue;
        }

        // Détection des doublons
        if (existingPhones.has(clientData.telephone)) {
          results.warnings.push(`Ligne ${rowNumber}: Le téléphone ${clientData.telephone} existe déjà pour ${clientData.nom}`);
        }

        if (existingNames.has(clientData.nom.toLowerCase())) {
          results.warnings.push(`Ligne ${rowNumber}: Le nom "${clientData.nom}" existe déjà`);
        }

        // Créer le client
        const response = await supabaseService.createClient(clientData);
        
        if (response.error) {
          results.errors.push(`Ligne ${rowNumber}: Erreur pour ${clientData.nom} - ${response.error}`);
        } else {
          results.success++;
          results.successfulItems.push({
            ...clientData,
            id: response.data?.id,
            row: rowNumber
          });

          // Ajouter aux ensembles pour détecter les doublons dans le même import
          existingPhones.add(clientData.telephone);
          existingNames.add(clientData.nom.toLowerCase());
        }
      } catch (error: any) {
        results.errors.push(`Ligne ${rowNumber}: Erreur inattendue - ${error.message}`);
      }
    }

    return results;
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <CSVImporter
      title="Importer des Clients"
      description="Importez vos clients depuis un fichier CSV. L'assistant détectera automatiquement les doublons et vous fournira un rapport détaillé."
      onImport={handleImport}
      isOpen={isOpen}
      onClose={handleClose}
      acceptedColumns={acceptedColumns}
      requiredColumns={requiredColumns}
      sampleData={sampleData}
    />
  );
};

export default ClientsImporter;