import { useState, useEffect } from 'react';
import { useClients } from './useClients';
import { useSorting } from './useSorting';
import { useExtendedSelection } from './useExtendedSelection';
import { useExtendedBulkOperations } from './useExtendedBulkOperations';
import { supabaseExtendedService } from '@/services/supabase-extended';
import type { Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

interface UseClientsPageOptions {
  initialPage?: number;
  initialSearchTerm?: string;
  initialCityFilter?: string;
}

export const useClientsPage = (options: UseClientsPageOptions = {}) => {
  const {
    initialPage = 1,
    initialSearchTerm = '',
    initialCityFilter = 'all'
  } = options;

  // États de base
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [cityFilter, setCityFilter] = useState(initialCityFilter);
  
  // États des modales
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isDuplicateDetectorOpen, setIsDuplicateDetectorOpen] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);
  const [showImportReport, setShowImportReport] = useState(false);
  const [allClientIds, setAllClientIds] = useState<string[]>([]);
  
  // États pour les modals View/Edit
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // États des dialogues de confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Hooks de données
  const {
    clients,
    pagination,
    isLoading,
    error,
    createClient,
    updateClient,
    deleteClient,
    refetch
  } = useClients(currentPage, {
    search: searchTerm || undefined,
    ville: cityFilter === 'all' ? undefined : cityFilter
  });

  const { sortedData, sortConfig, handleSort } = useSorting(clients);
  
  const { 
    isProcessing,
    deleteMultipleClients,
    exportSelectedClients,
    emailSelectedClients
  } = useExtendedBulkOperations();

  // Hook de sélection étendue
  const selection = useExtendedSelection({
    totalItems: pagination?.count || 0,
    pageSize: pagination?.pageSize || 10,
    currentPage,
    allItems: sortedData,
    getItemId: (client: Client) => client.id
  });

  // Charger tous les IDs des clients pour la sélection multi-pages
  useEffect(() => {
    const loadAllClientIds = async () => {
      try {
        const response = await supabaseExtendedService.getAllClientIds();
        if (response.data) {
          setAllClientIds(response.data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des IDs des clients:', error);
      }
    };

    if (pagination?.count && pagination.count > (pagination?.pageSize || 10)) {
      loadAllClientIds();
    }
  }, [pagination?.count, pagination?.pageSize]);

  // Implémentation de la sélection de toutes les pages
  const handleSelectAllPages = async () => {
    if (selection.isAllSelected) {
      selection.clearAllSelections();
    } else {
      try {
        const response = await supabaseExtendedService.getAllClientIds();
        if (response.data) {
          // Sélectionner tous les IDs
          response.data.forEach(id => {
            selection.selectedItemIds.add(id);
          });
          
          // Marquer toutes les pages comme sélectionnées
          const totalPages = Math.ceil((pagination?.count || 0) / (pagination?.pageSize || 10));
          for (let i = 1; i <= totalPages; i++) {
            selection.selectedPages.add(i);
          }
          
          // Forcer la mise à jour de l'état
          selection.selectAllPages();
          
          showSuccess(`${response.data.length} clients sélectionnés sur toutes les pages`);
        }
      } catch (error: any) {
        showError('Erreur lors de la sélection de tous les clients');
      }
    }
  };

  // Gestionnaires d'événements
  const handleDeleteClient = (client: Client) => {
    setClientToDelete(client);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteClient(clientToDelete.id);
      setDeleteDialogOpen(false);
      setClientToDelete(null);
      
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selection.selectedItemIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const selectedIdsArray = Array.from(selection.selectedItemIds);
      const results = await deleteMultipleClients(selectedIdsArray);
      
      setBulkDeleteDialogOpen(false);
      selection.clearAllSelections();
      
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Gestionnaires pour View/Edit
  const handleViewClient = (client: Client) => {
    setViewingClient(client);
    setIsViewModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsEditModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setViewingClient(null);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingClient(null);
  };

  const handleSaveEdit = () => {
    setTimeout(() => {
      refetch();
    }, 100);
  };

  const handleFormSuccess = () => {
    setTimeout(() => {
      refetch();
    }, 100);
  };

  const handleImportSuccess = (results: any) => {
    setImportReport(results);
    setShowImportReport(true);
    
    setTimeout(() => {
      refetch();
    }, 500);
  };

  const handleAddClient = () => {
    setSelectedClient(undefined);
    setIsFormOpen(true);
  };

  const handleExportClients = () => {
    if (selection.selectedItemIds.size > 0) {
      const selectedIdsArray = Array.from(selection.selectedItemIds);
      exportSelectedClients(selectedIdsArray);
    } else {
      // Exporter tout
      exportSelectedClients(allClientIds);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCityFilterChange = (value: string) => {
    setCityFilter(value);
    setCurrentPage(1);
  };

  // Données dérivées
  const stats = selection.getSelectionStats();
  const cities = Array.from(new Set(sortedData.map(c => c.ville)));
  const totalPaid = sortedData.reduce((sum, client) => sum + (client.total_paye || 0), 0);

  return {
    // États
    currentPage,
    searchTerm,
    cityFilter,
    isFormOpen,
    selectedClient,
    isImporterOpen,
    isDuplicateDetectorOpen,
    importReport,
    showImportReport,
    deleteDialogOpen,
    bulkDeleteDialogOpen,
    clientToDelete,
    isDeleting,
    
    // États pour View/Edit
    viewingClient,
    editingClient,
    isViewModalOpen,
    isEditModalOpen,
    
    // Données
    clients: sortedData,
    pagination,
    isLoading,
    error,
    sortConfig,
    stats,
    cities,
    totalPaid,
    allClientIds,
    
    // États de sélection
    selection,
    
    // États de traitement
    isProcessing,
    
    // Gestionnaires d'événements
    setCurrentPage,
    handleSearchChange,
    handleCityFilterChange,
    handleSort,
    handleDeleteClient,
    confirmDeleteClient,
    handleBulkDelete,
    handleFormSuccess,
    handleImportSuccess,
    handleViewClient,
    handleEditClient,
    handleAddClient,
    handleExportClients,
    handleSelectAllPages,
    handleCloseViewModal,
    handleCloseEditModal,
    handleSaveEdit,
    
    // Gestionnaires de modales
    setIsFormOpen,
    setIsImporterOpen,
    setIsDuplicateDetectorOpen,
    setDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    setShowImportReport,
    
    // Utilitaires
    refetch
  };
};