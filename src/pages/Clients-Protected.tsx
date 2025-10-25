"use client";

import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Download,
  Users,
  DollarSign,
  MapPin,
  CheckSquare
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SortableHeader from '../components/ui/sortable-header';
import BulkActions from '../components/ui/bulk-actions';
import ClientForm from '../components/forms/ClientForm';
import ClientHistoryModal from '../components/clients/ClientHistoryModal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import { useClients } from '../hooks/useClients';
import { useSorting } from '../hooks/useSorting';
import { useBulkOperations } from '../hooks/useBulkOperations';
import Pagination from '../components/ui/pagination-custom';
import type { Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const ClientsProtected: React.FC = () => {
  usePageSetup({
    title: 'Gestion des Clients',
    subtitle: 'Gérez les informations de vos clients'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  
  // États pour les modales
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [clientForHistory, setClientForHistory] = useState<Client | null>(null);
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
    emailSelectedClients,
  } = useBulkOperations();

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
    if (selectedClients.length === 0) return;
    
    setIsDeleting(true);
    try {
      const results = await deleteMultipleClients(selectedClients);
      setBulkDeleteDialogOpen(false);
      setSelectedClients([]);
      
      setTimeout(() => {
        refetch();
      }, 100);
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClientSelection = (clientId: string, checked: boolean) => {
    setSelectedClients(prev => 
      checked 
        ? [...prev, clientId]
        : prev.filter(id => id !== clientId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedClients(checked ? sortedData.map((client: Client) => client.id) : []);
  };

  const handleFormSuccess = () => {
    setTimeout(() => {
      refetch();
    }, 100);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setIsFormOpen(true);
  };

  const handleAddClient = () => {
    setSelectedClient(undefined);
    setIsFormOpen(true);
  };

  const handleViewClientHistory = (client: Client) => {
    console.log('👁️ Opening history for:', client.nom);
    setClientForHistory(client);
    setHistoryModalOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const generateReadableId = (index: number) => {
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `CL${paddedNumber}`;
  };

  const exportClients = () => {
    const dataToExport = selectedClients.length > 0 
      ? sortedData.filter((client: Client) => selectedClients.includes(client.id))
      : sortedData;
      
    const csv = [
      ['nom', 'telephone', 'ville', 'total_paye', 'created_at'],
      ...dataToExport.map((client: Client) => [
        client.nom,
        client.telephone,
        client.ville,
        client.total_paye?.toString() || '0',
        client.created_at
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    showSuccess(`${dataToExport.length} client(s) exporté(s) avec succès`);
  };

  const isAllSelected = sortedData.length > 0 && selectedClients.length === sortedData.length;
  const isPartiallySelected = selectedClients.length > 0 && selectedClients.length < sortedData.length;

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
    <ProtectedRouteEnhanced requiredModule="clients" requiredPermission="read">
      <Layout>
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Action Buttons */}
          <div className="flex items-center justify-end">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={exportClients}
                disabled={sortedData.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              
              <PermissionGuard module="clients" permission="create">
                <Button className="bg-green-500 hover:bg-green-600" onClick={handleAddClient}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Client
                </Button>
              </PermissionGuard>
            </div>
          </div>

          {/* Stats Cards - Design System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Total Clients Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Clients</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {pagination?.count || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500 flex-shrink-0">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Payé Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Payé</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {formatCurrency(
                        clients.reduce((sum, client: Client) => sum + (client.total_paye || 0), 0)
                      )}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500 flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Villes Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Villes</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {new Set(sortedData.map((c: Client) => c.ville)).size}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500 flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sélectionnés Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sélectionnés</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {selectedClients.length}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-500 flex-shrink-0">
                    <CheckSquare className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bulk Actions */}
          <BulkActions
            selectedCount={selectedClients.length}
            onClearSelection={() => setSelectedClients([])}
            onDeleteSelected={() => setBulkDeleteDialogOpen(true)}
            onExportSelected={() => exportSelectedClients(sortedData.filter((c: Client) => selectedClients.includes(c.id)))}
            onEmailSelected={() => emailSelectedClients(sortedData.filter((c: Client) => selectedClients.includes(c.id)))}
            isDeleting={isDeleting}
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
                {Array.from(new Set(sortedData.map((c: Client) => c.ville))).map((city: string) => (
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
                {selectedClients.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {selectedClients.length} sur {sortedData.length} sélectionné(s)
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
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isPartiallySelected;
                          }}
                          onChange={(e) => handleSelectAll(e.target.checked)}
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
                    {isLoading && clients.length === 0 ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : sortedData.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Users className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 mb-2">Aucun client</p>
                            <p className="text-sm text-gray-500 mb-4">Commencez par ajouter votre premier client</p>
                            <PermissionGuard module="clients" permission="create">
                              <Button onClick={handleAddClient} className="bg-green-500 hover:bg-green-600">
                                <Plus className="mr-2 h-4 w-4" />
                                Nouveau Client
                              </Button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((client: Client, index: number) => (
                        <tr 
                          key={client.id} 
                          className={cn(
                            "border-b hover:bg-gray-50",
                            selectedClients.includes(client.id) && "bg-blue-50"
                          )}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedClients.includes(client.id)}
                              onChange={(e) => handleClientSelection(client.id, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {generateReadableId(index)}
                          </td>
                          <td className="py-3 px-4 font-medium">{client.nom}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-400">📞</span>
                              <span>{client.telephone}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-400">📍</span>
                              <span>{client.ville}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-medium text-green-500">
                            {formatCurrency(client.total_paye || 0)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(client.created_at).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewClientHistory(client)}
                                title="Voir l'historique"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <PermissionGuard module="clients" permission="update">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditClient(client)}
                                  className="hover:bg-green-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                              
                              <PermissionGuard module="clients" permission="delete">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteClient(client)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
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

          <ClientHistoryModal
            client={clientForHistory}
            open={historyModalOpen}
            onOpenChange={setHistoryModalOpen}
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
            description={`Êtes-vous sûr de vouloir supprimer les ${selectedClients.length} clients sélectionnés ? Cette action est irréversible et supprimera également toutes leurs transactions associées.`}
            confirmText="Supprimer"
            cancelText="Annuler"
            onConfirm={handleBulkDelete}
            isConfirming={isDeleting}
            type="delete"
          />
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default ClientsProtected;