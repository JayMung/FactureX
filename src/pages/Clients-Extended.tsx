"use client";

import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Filter,
  Eye,
  Edit,
  Trash2,
  Phone,
  MapPin,
  DollarSign,
  Upload,
  Download,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { useSorting } from '../hooks/useSorting';
import { useExtendedBulkOperations } from '../hooks/useExtendedBulkOperations';
import { useExtendedSelection } from '../hooks/useExtendedSelection';
import { supabaseExtendedService } from '../services/supabase-extended';
import Pagination from '../components/ui/pagination-custom';
import { Skeleton } from '@/components/ui/skeleton';
import SortableHeader from '../components/ui/sortable-header';
import AdvancedBulkActions from '../components/ui/advanced-bulk-actions';
import DuplicateDetector from '../components/duplicates/duplicate-detector';
import ImportReport from '../components/import/import-report';
import ClientForm from '../components/forms/ClientForm';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ClientsImporter from '../components/import/ClientsImporter';
import type { Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const ClientsExtended = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isDuplicateDetectorOpen, setIsDuplicateDetectorOpen] = useState(false);
  const [importReport, setImportReport] = useState<any>(null);
  const [showImportReport, setShowImportReport] = useState(false);
  const [allClientIds, setAllClientIds] = useState<string[]>([]);
  
  // États pour les modales de confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleAddClient = () => {
    setSelectedClient(undefined);
    setIsFormOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generateReadableId = (index: number) => {
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `CL${paddedNumber}`;
  };

  const exportClients = () => {
    if (selection.selectedItemIds.size > 0) {
      const selectedIdsArray = Array.from(selection.selectedItemIds);
      exportSelectedClients(selectedIdsArray);
    } else {
      // Exporter tout
      exportSelectedClients(allClientIds);
    }
  };

  const stats = selection.getSelectionStats();

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur de chargement des clients</p>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion des Clients</h2>
            <p className="text-gray-500">Gérez les informations de vos clients</p>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDuplicateDetectorOpen(true)}
              className="border-orange-200 text-orange-700 hover:bg-orange-50"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Doublons
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setIsImporterOpen(true)}
              className="border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Upload className="mr-2 h-4 w-4" />
              Importer
            </Button>
            <Button 
              variant="outline" 
              onClick={exportClients}
              disabled={sortedData.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddClient}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Client
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Clients</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {pagination?.count || 0}
                  </p>
                </div>
                <div className="text-emerald-600">
                  <Users className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Payé</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(
                      sortedData.reduce((sum, client) => sum + (client.total_paye || 0), 0)
                    )}
                  </p>
                </div>
                <div className="text-blue-600">
                  <DollarSign className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Villes</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(sortedData.map(c => c.ville)).size}
                  </p>
                </div>
                <div className="text-purple-600">
                  <MapPin className="h-8 w-8" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sélectionnés</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stats.selectedCount}
                  </p>
                </div>
                <div className="text-orange-600">
                  <span className="text-2xl font-bold">✓</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions groupées avancées */}
        <AdvancedBulkActions
          selectedCount={stats.selectedCount}
          selectedPages={stats.selectedPageCount}
          totalPages={stats.totalPages}
          currentPageFullySelected={stats.currentPageFullySelected}
          currentPagePartiallySelected={stats.currentPagePartiallySelected}
          isAllSelected={selection.isAllSelected}
          isProcessing={isProcessing || isDeleting}
          onClearSelection={selection.clearAllSelections}
          onSelectCurrentPage={selection.toggleCurrentPageSelection}
          onSelectAllPages={handleSelectAllPages}
          onDeleteSelected={() => setBulkDeleteDialogOpen(true)}
          onExportSelected={() => exportSelectedClients(Array.from(selection.selectedItemIds))}
          onEmailSelected={() => emailSelectedClients(Array.from(selection.selectedItemIds))}
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Rechercher par nom ou téléphone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10"
            />
          </div>
          <Select value={cityFilter} onValueChange={(value) => {
            setCityFilter(value);
            setCurrentPage(1);
          }}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Toutes les villes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les villes</SelectItem>
              {Array.from(new Set(sortedData.map(c => c.ville))).map((city: string) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Plus de filtres
          </Button>
        </div>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Liste des Clients</span>
              {stats.selectedCount > 0 && (
                <span className="text-sm text-gray-500">
                  {stats.selectedCount} sur {pagination?.count || 0} sélectionné(s)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700 w-12">
                      <input
                        type="checkbox"
                        checked={stats.currentPageFullySelected}
                        ref={(el) => {
                          if (el) el.indeterminate = stats.currentPagePartiallySelected;
                        }}
                        onChange={(e) => selection.toggleCurrentPageSelection()}
                        className="rounded border-gray-300"
                      />
                    </th>
                    <SortableHeader
                      title="ID"
                      sortKey="id"
                      currentSort={sortConfig}
                      onSort={handleSort}
                      className="w-20"
                    />
                    <SortableHeader
                      title="Nom"
                      sortKey="nom"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      title="Téléphone"
                      sortKey="telephone"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      title="Ville"
                      sortKey="ville"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      title="Total Payé"
                      sortKey="total_paye"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      title="Date"
                      sortKey="created_at"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : sortedData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        Aucun client trouvé
                      </td>
                    </tr>
                  ) : (
                    sortedData.map((client, index) => (
                      <tr 
                        key={client.id} 
                        className={cn(
                          "border-b hover:bg-gray-50",
                          selection.isItemSelected(client.id) && "bg-blue-50"
                        )}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selection.isItemSelected(client.id)}
                            onChange={(e) => selection.toggleItemSelection(client.id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium">
                          {generateReadableId(index)}
                        </td>
                        <td className="py-3 px-4 font-medium">{client.nom}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <span>{client.telephone}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span>{client.ville}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-medium text-emerald-600">
                          {formatCurrency(client.total_paye || 0)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(client.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditClient(client)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-600"
                              onClick={() => handleDeleteClient(client)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <ClientForm
          client={selectedClient}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
        />

        <ClientsImporter
          isOpen={isImporterOpen}
          onClose={() => setIsImporterOpen(false)}
          onSuccess={handleImportSuccess}
        />

        <DuplicateDetector
          clients={sortedData}
          onMergeDuplicates={async () => {}}
          onDeleteDuplicates={async () => {}}
          isOpen={isDuplicateDetectorOpen}
          onClose={() => setIsDuplicateDetectorOpen(false)}
        />

        <ImportReport
          isOpen={showImportReport}
          onClose={() => setShowImportReport(false)}
          results={importReport}
        />

        {/* Delete Confirmation Dialogs */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer le client"
          description={`Êtes-vous sûr de vouloir supprimer le client "${clientToDelete?.nom}" ? Cette action est irréversible et supprimera également toutes ses transactions associées.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          onConfirm={confirmDeleteClient}
          isConfirming={isDeleting}
          type="delete"
        />

        <ConfirmDialog
          open={bulkDeleteDialogOpen}
          onOpenChange={setBulkDeleteDialogOpen}
          title="Supprimer les clients sélectionnés"
          description={`Êtes-vous sûr de vouloir supprimer les ${stats.selectedCount} clients sélectionnés ? Cette action est irréversible et supprimera également toutes leurs transactions associées.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          onConfirm={handleBulkDelete}
          isConfirming={isDeleting}
          type="delete"
        />
      </div>
    </Layout>
  );
};

export default ClientsExtended;