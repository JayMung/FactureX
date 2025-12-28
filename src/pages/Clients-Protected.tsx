"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
  Eye,
  Edit,
  Trash2,
  Users,
  DollarSign,
  MapPin,
  CheckSquare,
  Phone
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SortableHeader from '../components/ui/sortable-header';
import BulkActions from '../components/ui/bulk-actions';
import ClientForm from '../components/forms/ClientForm';
import ClientHistoryModal from '../components/clients/ClientHistoryModal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import { usePermissions } from '../hooks/usePermissions';
import { UnifiedDataTable, type TableColumn } from '@/components/ui/unified-data-table';
import { FilterTabs, type FilterTab } from '@/components/ui/filter-tabs';
import { ColumnSelector, type ColumnConfig } from '@/components/ui/column-selector';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useClients } from '../hooks/useClients';
import { useSorting } from '../hooks/useSorting';
import { useBulkOperations } from '../hooks/useBulkOperations';
import Pagination from '../components/ui/pagination-custom';
import type { Client } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import {
  sanitizeUserContent,
  validateContentSecurity,
  sanitizeClientName,
  sanitizePhoneNumber,
  sanitizeCityName,
  sanitizeCSV
} from '@/lib/security/content-sanitization';

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
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([
    { key: 'id', label: 'ID', visible: true, required: true },
    { key: 'nom', label: 'Nom', visible: true, required: true },
    { key: 'telephone', label: 'Téléphone', visible: true },
    { key: 'ville', label: 'Ville', visible: true },
    { key: 'total_paye', label: 'Total Payé', visible: true },
    { key: 'created_at', label: 'Date', visible: true }
  ]);

  // États pour les modales
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [clientForHistory, setClientForHistory] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isAdmin } = usePermissions();

  const {
    clients,
    pagination,
    isLoading,
    error,
    globalTotals,
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

  const generateReadableId = (clientId: string, index: number) => {
    // Utiliser les derniers caractères de l'ID UUID pour garantir l'unicité
    const shortId = clientId.slice(-6).toUpperCase();
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `CL${paddedNumber}-${shortId}`;
  };

  const exportClients = () => {
    const dataToExport = selectedClients.length > 0
      ? sortedData.filter((client: Client) => selectedClients.includes(client.id))
      : sortedData;

    const csv = [
      ['nom', 'telephone', 'ville', 'total_paye', 'created_at'],
      ...dataToExport.map((client: Client) => [
        sanitizeCSV(client.nom || ''),
        sanitizeCSV(client.telephone || ''),
        sanitizeCSV(client.ville || ''),
        sanitizeCSV(client.total_paye?.toString() || '0'),
        sanitizeCSV(client.created_at || '')
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
          {/* Stats Cards - Modern Gradient Design */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Total Clients Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 md:p-5 shadow-lg">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-white/20 p-2">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] md:text-xs font-medium text-white">
                    Total
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-lg md:text-2xl font-bold text-white">{globalTotals.totalCount || 0}</p>
                  <p className="mt-0.5 text-xs md:text-sm text-emerald-100">Clients</p>
                </div>
              </div>
            </div>

            {/* Carte conditionnelle - Admin voit Total Payé, Opérateurs voit Pays */}
            {isAdmin ? (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-blue-100">USD</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white truncate">{formatCurrency(globalTotals.totalPaye)}</p>
                    <p className="mt-0.5 text-xs md:text-sm text-blue-100">Total Payé</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white">{new Set(sortedData.map((c: Client) => c.pays)).size}</p>
                    <p className="mt-0.5 text-xs md:text-sm text-blue-100">Pays</p>
                  </div>
                </div>
              </div>
            )}

            {/* Villes Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 md:p-5 shadow-lg">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-white/20 p-2">
                    <MapPin className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-lg md:text-2xl font-bold text-white">{new Set(sortedData.map((c: Client) => c.ville)).size}</p>
                  <p className="mt-0.5 text-xs md:text-sm text-purple-100">Villes</p>
                </div>
              </div>
            </div>

            {/* Sélectionnés Card */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 md:p-5 shadow-lg">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-white/20 p-2">
                    <CheckSquare className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  {selectedClients.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] md:text-xs font-medium text-white">
                      Actif
                    </span>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-lg md:text-2xl font-bold text-white">{selectedClients.length}</p>
                  <p className="mt-0.5 text-xs md:text-sm text-orange-100">Sélectionnés</p>
                </div>
              </div>
            </div>
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

          {/* City Filter Tabs */}
          <FilterTabs
            tabs={[
              { id: 'all', label: 'Tous', count: globalTotals.totalCount || 0 },
              { id: 'LUBUMBASHI', label: 'Lubumbashi', count: sortedData.filter((c: Client) => c.ville?.toUpperCase() === 'LUBUMBASHI').length },
              { id: 'KINSHASA', label: 'Kinshasa', count: sortedData.filter((c: Client) => c.ville?.toUpperCase() === 'KINSHASA').length },
              { id: 'LIKASI', label: 'Likasi', count: sortedData.filter((c: Client) => c.ville?.toUpperCase() === 'LIKASI').length },
            ]}
            activeTab={cityFilter}
            onTabChange={(tab) => {
              setCityFilter(tab);
              setCurrentPage(1);
            }}
            variant="pills"
            className="mb-4"
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
          </div>

          {/* Clients Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <CardTitle>Liste des Clients</CardTitle>
                  {selectedClients.length > 0 && (
                    <span className="text-sm text-gray-500">
                      {selectedClients.length} sur {sortedData.length} sélectionné(s)
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  <ExportDropdown
                    onExport={(format) => {
                      if (format === 'csv') exportClients();
                      // Excel and PDF can be implemented later
                    }}
                    disabled={sortedData.length === 0}
                    selectedCount={selectedClients.length}
                  />

                  <ColumnSelector
                    columns={columnsConfig}
                    onColumnsChange={setColumnsConfig}
                  />

                  <PermissionGuard module="clients" permission="create">
                    <Button className="bg-green-500 hover:bg-green-600" onClick={handleAddClient}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau Client
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedDataTable<Client>
                data={sortedData}
                loading={isLoading && clients.length === 0}
                emptyMessage="Aucun client"
                emptySubMessage="Commencez par ajouter votre premier client"
                emptyIcon={<Users className="h-8 w-8 text-gray-400" />}
                onSort={handleSort}
                sortKey={sortConfig?.key}
                sortDirection={sortConfig?.direction}
                viewMode="auto"
                onViewModeChange={setViewMode}
                showViewToggle={true}
                cardConfig={{
                  titleKey: 'nom',
                  titleRender: (client) => sanitizeClientName(client.nom || ''),
                  subtitleKey: 'telephone',
                  subtitleRender: (client) => (
                    <div className="flex items-center gap-1 text-gray-500">
                      <Phone className="h-3 w-3" />
                      {sanitizePhoneNumber(client.telephone || '')}
                    </div>
                  ),
                  badgeRender: (client) => (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <MapPin className="h-3 w-3 mr-1" />
                      {sanitizeCityName(client.ville || '')}
                    </Badge>
                  ),
                  infoFields: isAdmin ? [
                    {
                      key: 'total_paye',
                      label: 'Total Payé',
                      render: (value) => (
                        <span className="font-bold text-emerald-600">{formatCurrency(value || 0)}</span>
                      )
                    },
                    {
                      key: 'created_at',
                      label: 'Date',
                      render: (value) => new Date(value).toLocaleDateString('fr-FR')
                    }
                  ] : [
                    {
                      key: 'created_at',
                      label: 'Date',
                      render: (value) => new Date(value).toLocaleDateString('fr-FR')
                    }
                  ]
                }}
                bulkSelect={{
                  selected: selectedClients,
                  onSelectAll: handleSelectAll,
                  onSelectItem: handleClientSelection,
                  getId: (client: Client) => client.id,
                  isAllSelected: isAllSelected,
                  isPartiallySelected: isPartiallySelected
                }}
                actionsColumn={{
                  render: (client: Client, index: number) => (
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
                  )
                }}
                columns={[
                  {
                    key: 'id',
                    title: 'ID',
                    sortable: true,
                    className: 'min-w-[120px]',
                    render: (value: any, client: Client, index: number) => (
                      <span className="font-medium">
                        {generateReadableId(client.id, index)}
                      </span>
                    )
                  },
                  {
                    key: 'nom',
                    title: 'Nom',
                    sortable: true,
                    render: (value: any, client: Client) => (
                      <button
                        onClick={() => handleViewClientHistory(client)}
                        className="text-left hover:text-green-500 hover:underline transition-colors cursor-pointer font-medium"
                        title={sanitizeClientName(client.nom || '')}
                      >
                        {sanitizeClientName(client.nom || '').split(' ').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </button>
                    )
                  },
                  {
                    key: 'telephone',
                    title: 'Téléphone',
                    sortable: true,
                    render: (value: any) => (
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span>{sanitizePhoneNumber(value || '')}</span>
                      </div>
                    )
                  },
                  {
                    key: 'ville',
                    title: 'Ville',
                    sortable: true,
                    render: (value: any) => (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{sanitizeCityName(value || '')}</span>
                      </div>
                    )
                  },
                  ...(isAdmin ? [{
                    key: 'total_paye',
                    title: 'Total Payé',
                    sortable: true,
                    align: 'right' as const,
                    render: (value: any) => (
                      <span className="font-medium text-green-500">
                        {formatCurrency(value || 0)}
                      </span>
                    )
                  }] : []),
                  {
                    key: 'created_at',
                    title: 'Date',
                    sortable: true,
                    render: (value: any) => (
                      <span className="text-sm text-gray-600">
                        {new Date(value).toLocaleDateString('fr-FR')}
                      </span>
                    )
                  }
                ].filter(col => columnsConfig.find(c => c.key === col.key)?.visible)}
              />

              {/* Pagination avec sélecteur de taille */}
              {pagination && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Afficher</span>
                    <Select value="10" onValueChange={(value) => {
                      // Note: La taille de page est gérée côté serveur
                      // Cette UI est préparée pour une future implémentation
                      console.log('Page size:', value);
                    }}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-gray-600">par page</span>
                    <span className="text-sm text-gray-500 ml-4">
                      {pagination.count} client{pagination.count > 1 ? 's' : ''} au total
                    </span>
                  </div>

                  {pagination.totalPages > 1 && (
                    <Pagination
                      currentPage={currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={setCurrentPage}
                    />
                  )}
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
            description={`Êtes-vous sûr de vouloir supprimer le client "${sanitizeClientName(clientToDelete?.nom || '')}" ? Cette action est irréversible et supprimera également toutes ses transactions associées.`}
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