"use client";

import React from 'react';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useClientsPage } from '../hooks/useClientsPage';
import ClientsStats from '../components/clients/ClientsStats';
import ClientsHeader from '../components/clients/ClientsHeader';
import ClientsFilters from '../components/clients/ClientsFilters';
import ClientsTable from '../components/clients/ClientsTable';
import AdvancedBulkActions from '../components/ui/advanced-bulk-actions';
import Pagination from '../components/ui/pagination-custom';
import ClientForm from '../components/forms/ClientForm';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import ClientsImporter from '../components/import/ClientsImporter';
import DuplicateDetector from '../components/duplicates/duplicate-detector';
import ImportReport from '../components/import/import-report';

const ClientsExtended: React.FC = () => {
  const {
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
    
    // Données
    clients,
    pagination,
    isLoading,
    error,
    sortConfig,
    stats,
    cities,
    totalPaid,
    
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
    handleEditClient,
    handleAddClient,
    handleViewClient,
    handleExportClients,
    handleSelectAllPages,
    
    // Gestionnaires de modales
    setIsFormOpen,
    setIsImporterOpen,
    setIsDuplicateDetectorOpen,
    setDeleteDialogOpen,
    setBulkDeleteDialogOpen,
    setShowImportReport,
    
    // Utilitaires
    refetch
  } = useClientsPage();

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
        <ClientsHeader
          onDuplicateDetection={() => setIsDuplicateDetectorOpen(true)}
          onImport={() => setIsImporterOpen(true)}
          onExport={handleExportClients}
          onAddClient={handleAddClient}
          isExportDisabled={clients.length === 0}
        />

        {/* Stats Cards */}
        <ClientsStats
          totalClients={pagination?.count || 0}
          totalPaid={totalPaid}
          totalCities={cities.length}
          selectedCount={stats.selectedCount}
        />

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
          onExportSelected={() => handleExportClients()}
          onEmailSelected={() => selection.selectedItemIds.size > 0 && 
            console.log('Email selected clients:', Array.from(selection.selectedItemIds))}
        />

        {/* Filters */}
        <ClientsFilters
          searchTerm={selection.selectedItemIds.size > 0 ? '' : ''}
          onSearchChange={handleSearchChange}
          cityFilter={cities.length > 0 ? cityFilter : 'all'}
          onCityFilterChange={handleCityFilterChange}
          cities={cities}
        />

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
            <ClientsTable
              clients={clients}
              isLoading={isLoading}
              sortConfig={sortConfig}
              onSort={handleSort}
              selectedIds={selection.selectedItemIds}
              onToggleSelection={selection.toggleItemSelection}
              onTogglePageSelection={selection.toggleCurrentPageSelection}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
              onViewClient={handleViewClient}
              isPageFullySelected={stats.currentPageFullySelected}
              isPagePartiallySelected={stats.currentPagePartiallySelected}
            />

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
          clients={clients}
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