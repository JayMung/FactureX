"use client";

import React from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useClientsPage } from '@/hooks/useClientsPage';

const Clients: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 1023px)');
  
  const {
    isLoading,
    clients,
    currentPage,
    searchTerm,
    cityFilter,
    isFormOpen,
    selectedClient,
    isImporterOpen,
    isDuplicateDetectorOpen,
    importReport,
    potentialDuplicates,
    searchTermDuplicate,
    setSearchTermDuplicate,
    selectedDuplicateField,
    setSelectedDuplicateField,
    duplicateFields,
    filteredClients,
    paginatedClients,
    totalPages,
    itemsPerPage,
    startIndex,
    setCurrentPage,
    setItemsPerPage,
    setFilterOptions,
    handleCreateClient,
    handleImportClients,
    handleDuplicateDetection,
    handleViewClient,
    handleEditClient,
    handleDeleteClient,
    handleUpdateClient,
    handleOpenForm,
    handleCloseForm,
    handleSaveClient,
    handleSelectClient,
    handleClearSelection,
    handleImportReport,
    handleClearImportReport,
    handleClearDuplicateDetection,
    refetch
  } = useClientsPage();

  const handleSearchChange = (value: string) => {
    setFilterOptions({ searchTerm: value });
  };

  const handleCityChange = (value: string) => {
    setFilterOptions({ cityFilter: value });
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <div className="hidden lg:block">
        <Sidebar currentPath="/clients" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header with dynamic title */}
        <Header 
          title="Gestion des Clients"
          description="Gérez les informations de vos clients"
        />

        {/* Content Area */}
        <div className="flex-1 p-6">
          {isLoading ? (
            <div>Chargement...</div>
          ) : (
            <div>
              <h2 className="text-lg font-semibold mb-4">Liste des clients</h2>
              <div className="bg-white rounded-lg shadow">
                {/* Table content will go here */}
                <div className="p-4 text-gray-500">
                  Tableau des clients - {clients.length} client(s)
                </div>
                <div className="p-4">
                  <p>Page: {currentPage} / {totalPages}</p>
                  <p>Recherche: {searchTerm}</p>
                  <p>Filtre ville: {cityFilter}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;