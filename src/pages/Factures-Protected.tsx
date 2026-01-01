"use client";

import React, { useState } from 'react';

import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  ChevronDown,
  XCircle,
  TrendingUp,
  Send,
  Calendar
} from 'lucide-react';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, subDays } from 'date-fns';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import PermissionGuard from '../components/auth/PermissionGuard';
import { UnifiedDataTable } from '@/components/ui/unified-data-table';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { ColumnSelector, type ColumnConfig } from '@/components/ui/column-selector';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermissions } from '../hooks/usePermissions';
import { useFactures } from '../hooks/useFactures';
import Pagination from '../components/ui/pagination-custom';
import FactureDetailsModal from '../components/modals/FactureDetailsModal';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import type { Facture } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';
import {
  sanitizeUserContent,
  validateContentSecurity,
  sanitizeCSV
} from '@/lib/security/content-sanitization';

const FacturesProtected: React.FC = () => {
  usePageSetup({
    title: 'Gestion des Factures',
    subtitle: 'Gérez vos factures et devis'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statutFilter, setStatutFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | undefined>(undefined);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [factureToView, setFactureToView] = useState<Facture | null>(null);
  const [selectedFactures, setSelectedFactures] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [factureToDelete, setFactureToDelete] = useState<string | null>(null);
  const navigate = useNavigate();
  const { checkPermission, isAdmin } = usePermissions();
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'auto'>('auto');
  const [columnsConfig, setColumnsConfig] = useState<ColumnConfig[]>([
    { key: 'mode_livraison', label: 'Mode', visible: true },
    { key: 'facture_number', label: 'N° Facture', visible: true, required: true },
    { key: 'clients', label: 'Client', visible: true, required: true }, // Key matches data field
    { key: 'date_emission', label: 'Date', visible: true },
    { key: 'total_general', label: 'Montant', visible: true },
    { key: 'statut', label: 'Statut', visible: true },
    { key: 'actions', label: 'Actions', visible: true, required: true }
  ]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return {
          dateFrom: startOfDay(now).toISOString(),
          dateTo: endOfDay(now).toISOString()
        };
      case 'week':
        return {
          dateFrom: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
          dateTo: endOfWeek(now, { weekStartsOn: 1 }).toISOString()
        };
      case 'month':
        return {
          dateFrom: startOfMonth(now).toISOString(),
          dateTo: endOfMonth(now).toISOString()
        };
      case 'year':
        return {
          dateFrom: startOfYear(now).toISOString(),
          dateTo: endOfYear(now).toISOString()
        };
      default:
        return { dateFrom: undefined, dateTo: undefined };
    }
  };

  const { dateFrom, dateTo } = getDateRange();

  const {
    factures,
    pagination,
    isLoading,
    error,
    globalTotals,
    deleteFacture,
    updateFacture,
    getFactureWithItems,
    convertToFacture,
    refetch
  } = useFactures(
    currentPage,
    {
      type: typeFilter === 'all' ? undefined : (typeFilter as 'devis' | 'facture'),
      statut: statutFilter === 'all' ? undefined : statutFilter,
      search: searchTerm || undefined,
      dateFrom,
      dateTo
    },
    { pageSize, sort: sortConfig }
  );

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedData = factures;

  const formatCurrency = (amount: number, devise: string) => {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return devise === 'USD' ? `$${formatted}` : `${formatted} FC`;
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: any; className: string; label: string }> = {
      brouillon: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800', label: 'Brouillon' },
      en_attente: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      validee: { variant: 'default' as const, className: 'bg-green-500 text-white', label: 'Validée' },
      payee: { variant: 'default' as const, className: 'bg-blue-500 text-white', label: 'Payée' },
      annulee: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800', label: 'Annulée' }
    };

    const config = variants[statut] || variants.brouillon;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleStatutChange = async (facture: Facture, newStatut: string) => {
    try {
      await updateFacture(facture.id, {
        statut: newStatut as any,
        // Ajouter la date de validation si le statut devient "validée" ou "payee"
        ...(newStatut === 'validee' || newStatut === 'payee' ? {
          date_validation: new Date().toISOString()
        } : {})
      });

      showSuccess(`Statut de la facture mis à jour: ${getStatutBadge(newStatut).props.children}`);
      refetch();
    } catch (error: any) {
      console.error('Error updating statut:', error);
      showError(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleConvertToFacture = async (facture: Facture) => {
    if (facture.type !== 'devis') return;

    try {
      await convertToFacture(facture.id);
      refetch();
    } catch (error) {
      console.error('Error converting:', error);
    }
  };

  const handleDelete = (id: string) => {
    setFactureToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!factureToDelete) return;

    try {
      await deleteFacture(factureToDelete);
      refetch();
      showSuccess('Facture supprimée avec succès');
    } catch (error) {
      console.error('Error deleting:', error);
      showError('Erreur lors de la suppression');
    } finally {
      setDeleteDialogOpen(false);
      setFactureToDelete(null);
    }
  };

  const handleViewDetails = (facture: Facture) => {
    navigate(`/factures/view/${facture.id}`);
  };

  const handleEdit = (facture: Facture) => {
    navigate(`/factures/edit/${facture.id}`);
  };

  const handleDuplicate = async (facture: Facture) => {
    try {
      // Récupérer la facture complète avec les items
      const factureComplete = await getFactureWithItems(facture.id);

      if (!factureComplete) {
        showError('Impossible de récupérer la facture');
        return;
      }

      // Stocker les données dans sessionStorage pour les utiliser dans le formulaire
      sessionStorage.setItem('duplicateFacture', JSON.stringify({
        ...factureComplete,
        facture_number: null, // Nouveau numéro sera généré
        statut: 'brouillon',
        date_emission: new Date().toISOString().split('T')[0]
      }));

      // Rediriger vers le formulaire de création
      navigate('/factures/new');
      showSuccess('Facture dupliquée! Modifiez et enregistrez.');
    } catch (error) {
      console.error('Error duplicating facture:', error);
      showError('Erreur lors de la duplication');
    }
  };

  const handleAddNew = () => {
    navigate('/factures/new');
  };

  // Fonctions de sélection multiple
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFactures(new Set(factures.map(f => f.id)));
    } else {
      setSelectedFactures(new Set());
    }
  };

  const handleSelectFacture = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedFactures);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedFactures(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedFactures.size === 0) return;

    try {
      const promises = Array.from(selectedFactures).map(id => deleteFacture(id));
      await Promise.all(promises);
      showSuccess(`${selectedFactures.size} facture(s) supprimée(s)`);
      setSelectedFactures(new Set());
    } catch (error: any) {
      showError('Erreur lors de la suppression');
    }
  };

  const handleBulkStatusChange = async (newStatut: string) => {
    if (selectedFactures.size === 0) return;

    try {
      const promises = Array.from(selectedFactures).map(id =>
        updateFacture(id, { statut: newStatut as any })
      );
      await Promise.all(promises);
      showSuccess(`${selectedFactures.size} facture(s) mise(s) à jour`);
      setSelectedFactures(new Set());
    } catch (error: any) {
      showError('Erreur lors de la mise à jour');
    }
  };

  // Calculer les totaux des factures sélectionnées
  const calculateSelectedTotals = () => {
    const selectedFacts = factures.filter(f => selectedFactures.has(f.id));

    const totalUSD = selectedFacts
      .filter(f => f.devise === 'USD')
      .reduce((sum, f) => sum + f.total_general, 0);

    const totalCDF = selectedFacts
      .filter(f => f.devise === 'CDF')
      .reduce((sum, f) => sum + f.total_general, 0);

    const totalFrais = selectedFacts
      .reduce((sum, f) => sum + (f.frais || 0), 0);

    return { totalUSD, totalCDF, totalFrais };
  };

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Erreur de chargement des factures</p>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRouteEnhanced requiredModule="factures" requiredPermission="read">
      <Layout>
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Bulk Actions Bar */}
          {selectedFactures.size > 0 && (() => {
            const selectedTotals = calculateSelectedTotals();
            return (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-4">
                    {/* Première ligne: Sélection et actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge {...({ variant: "default" } as any)} className="bg-blue-600">
                          {selectedFactures.size} sélectionnée(s)
                        </Badge>
                        <Button
                          {...({ variant: "outline" } as any)}
                          size="sm"
                          onClick={() => setSelectedFactures(new Set())}
                        >
                          Désélectionner tout
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button {...({ variant: "outline" } as any)} size="sm">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Changer le statut
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('brouillon')}>
                              Brouillon
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('en_attente')}>
                              En attente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('validee')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Validée
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('payee')}>
                              Payée
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('annulee')}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Annulée
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <PermissionGuard module="factures" permission="delete">
                          <Button
                            {...({ variant: "destructive" } as any)}
                            size="sm"
                            onClick={handleBulkDelete}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>

                    {/* Deuxième ligne: Résumé des montants (admin uniquement) */}
                    {isAdmin && (
                      <div className="flex items-center justify-center space-x-6 text-sm border-t border-blue-200 pt-3">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-gray-700">Total USD:</span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(selectedTotals.totalUSD, 'USD')}
                          </span>
                        </div>
                        {selectedTotals.totalCDF > 0 && (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-700">Total CDF:</span>
                            <span className="font-bold text-blue-600">
                              {formatCurrency(selectedTotals.totalCDF, 'CDF')}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <TrendingUp className="h-4 w-4 text-orange-600" />
                          <span className="font-medium text-gray-700">Frais:</span>
                          <span className="font-bold text-orange-600">
                            {formatCurrency(selectedTotals.totalFrais, 'USD')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Stats Cards - Modern Gradient Design */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {/* Total USD (admin uniquement) */}
            {isAdmin && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-emerald-100">USD</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white">
                      {formatCurrency(globalTotals.totalUSD, 'USD')}
                    </p>
                    <p className="mt-0.5 text-xs md:text-sm text-emerald-100">Total USD</p>
                  </div>
                </div>
              </div>
            )}

            {/* Total CDF (admin uniquement) */}
            {isAdmin && (
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-blue-100">CDF</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white">
                      {formatCurrency(globalTotals.totalCDF, 'CDF')}
                    </p>
                    <p className="mt-0.5 text-xs md:text-sm text-blue-100">Total CDF</p>
                  </div>
                </div>
              </div>
            )}

            {/* Total Factures */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 md:p-5 shadow-lg">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-white/20 p-2">
                    <FileText className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-purple-100">Total</span>
                </div>
                <div className="mt-3">
                  <p className="text-lg md:text-2xl font-bold text-white">
                    {globalTotals.totalCount || 0}
                  </p>
                  <p className="mt-0.5 text-xs md:text-sm text-purple-100">Factures</p>
                </div>
              </div>
            </div>

            {/* Frais */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-4 md:p-5 shadow-lg">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className="rounded-lg bg-white/20 p-2">
                    <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-white" />
                  </div>
                  <span className="text-[10px] md:text-xs font-medium text-orange-100">Frais</span>
                </div>
                <div className="mt-3">
                  <p className="text-lg md:text-2xl font-bold text-white">
                    {formatCurrency(globalTotals.totalFrais, 'USD')}
                  </p>
                  <p className="mt-0.5 text-xs md:text-sm text-orange-100">Total Frais</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="mb-6">
            <FilterTabs
              tabs={[
                { id: 'all', label: 'Tous', count: globalTotals.totalCount || 0 }, // You might want to filter counts properly if available
                { id: 'brouillon', label: 'Brouillon' },
                { id: 'en_attente', label: 'En attente' },
                { id: 'validee', label: 'Validée' },
                { id: 'payee', label: 'Payée' },
                { id: 'annulee', label: 'Annulée' }
              ]}
              activeTab={statutFilter}
              onTabChange={(id) => {
                setStatutFilter(id);
                setCurrentPage(1);
              }}
              variant="pills"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro ou client..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>

            <Select value={dateFilter} onValueChange={(value) => {
              setDateFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-40">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <SelectValue placeholder="Période" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute la période</SelectItem>
                <SelectItem value="today">Aujourd'hui</SelectItem>
                <SelectItem value="week">Cette semaine</SelectItem>
                <SelectItem value="month">Ce mois</SelectItem>
                <SelectItem value="year">Cette année</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="devis">Devis</SelectItem>
                <SelectItem value="facture">Facture</SelectItem>
              </SelectContent>
            </Select>
            {/* Status Select removed in favor of FilterTabs */}
          </div>

          {/* Factures Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle>Liste des Factures et Devis</CardTitle>
                <div className="flex items-center gap-2">
                  <ColumnSelector
                    columns={columnsConfig}
                    onColumnsChange={setColumnsConfig}
                  />
                  <ExportDropdown
                    onExport={(format) => {
                      console.log('Exporting as', format);
                      // TODO: Implement actual export logic based on format
                    }}
                    disabled={factures.length === 0}
                    selectedCount={selectedFactures.size}
                  />
                  <PermissionGuard module="factures" permission="create">
                    <Button className="bg-green-500 hover:bg-green-600" onClick={handleAddNew}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvelle Facture/Devis
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedDataTable
                data={sortedData}
                loading={isLoading && factures.length === 0}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                emptyMessage="Aucune facture trouvée"
                emptySubMessage="Commencez par créer votre première facture ou ajustez vos filtres."
                onSort={handleSort}
                sortKey={sortConfig?.key}
                sortDirection={sortConfig?.direction}
                bulkSelect={{
                  selected: Array.from(selectedFactures),
                  onSelectAll: handleSelectAll,
                  onSelectItem: handleSelectFacture,
                  getId: (item) => item.id
                }}
                columns={[
                  {
                    key: 'mode_livraison',
                    title: 'Mode',
                    sortable: true,
                    render: (value: any) => (
                      <Badge {...({ variant: (value === 'aerien' ? 'default' : 'secondary') } as any)}>
                        {value === 'aerien' ? '✈️ Aérien' : '🚢 Maritime'}
                      </Badge>
                    )
                  },
                  {
                    key: 'facture_number',
                    title: 'N° Facture',
                    sortable: true,
                    render: (value: any, facture: Facture) => (
                      <span
                        className="font-medium text-green-600 hover:text-green-700 cursor-pointer hover:underline transition-colors"
                        onClick={() => handleViewDetails(facture)}
                        title="Cliquer pour voir les détails"
                      >
                        {value}
                      </span>
                    )
                  },
                  {
                    key: 'clients',
                    title: 'Client',
                    sortable: true,
                    render: (value: any) => (value?.nom || 'N/A')
                  },
                  {
                    key: 'date_emission',
                    title: 'Date',
                    sortable: true,
                    render: (value: any) => (
                      <span className="text-sm">
                        {new Date(value).toLocaleDateString('fr-FR')}
                      </span>
                    )
                  },
                  ...(isAdmin ? [{
                    key: 'total_general',
                    title: 'Montant',
                    sortable: true,
                    align: 'right' as const,
                    render: (value: any, facture: Facture) => (
                      <span className="font-medium text-green-500">
                        {formatCurrency(value, facture.devise)}
                      </span>
                    )
                  }] : []),
                  {
                    key: 'statut',
                    title: 'Statut',
                    sortable: true,
                    render: (value: any, facture: Facture) => (
                      checkPermission('factures', 'update') ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              {...({ variant: "outline" } as any)}
                              size="sm"
                              className="h-8 flex items-center gap-2 hover:bg-gray-50 bg-transparent border-gray-200"
                            >
                              {getStatutBadge(value)}
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem
                              onClick={() => handleStatutChange(facture, 'brouillon')}
                              className={cn(
                                "cursor-pointer",
                                value === 'brouillon' && 'bg-gray-50'
                              )}
                            >
                              <FileText className="mr-2 h-4 w-4" />
                              Brouillon
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatutChange(facture, 'envoyee')}
                              className={cn(
                                "cursor-pointer",
                                value === 'envoyee' && 'bg-gray-50'
                              )}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Envoyée
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatutChange(facture, 'payee')}
                              className={cn(
                                "cursor-pointer",
                                value === 'payee' && 'bg-gray-50'
                              )}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Payée
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatutChange(facture, 'annulee')}
                              className={cn(
                                "cursor-pointer",
                                value === 'annulee' && 'bg-gray-50'
                              )}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Annulée
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        getStatutBadge(value)
                      )
                    )
                  },
                  {
                    key: 'actions',
                    title: 'Actions',
                    align: 'right' as const,
                    render: (value: any, facture: Facture) => (
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          {...({ variant: "ghost" } as any)}
                          size="sm"
                          onClick={() => handleViewDetails(facture)}
                          title="Voir les détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <PermissionGuard module="factures" permission="create">
                          <Button
                            {...({ variant: "ghost" } as any)}
                            size="sm"
                            onClick={() => handleDuplicate(facture)}
                            title="Dupliquer"
                            className="text-blue-600 hover:bg-blue-50"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>

                        <PermissionGuard module="factures" permission="update">
                          <Button
                            {...({ variant: "ghost" } as any)}
                            size="sm"
                            onClick={() => handleEdit(facture)}
                            title="Modifier"
                            className="hover:bg-green-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>

                        <PermissionGuard module="factures" permission="delete">
                          <Button
                            {...({ variant: "ghost" } as any)}
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(facture.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </PermissionGuard>
                      </div>
                    )
                  }
                ].filter(col => columnsConfig.find(c => c.key === col.key)?.visible)}
                cardConfig={{
                  titleKey: 'facture_number',
                  titleRender: (item) => (
                    <span
                      onClick={() => handleViewDetails(item)}
                      className="font-bold text-lg text-green-600 cursor-pointer"
                    >
                      {item.facture_number}
                    </span>
                  ),
                  subtitleKey: 'clients',
                  subtitleRender: (item) => <span className="text-gray-600">{item.clients?.nom || 'N/A'}</span>,
                  badgeKey: 'statut',
                  badgeRender: (item) => getStatutBadge(item.statut),
                  infoFields: [
                    { key: 'date_emission', label: 'Date', render: (val) => new Date(val).toLocaleDateString('fr-FR') },
                    { key: 'total_general', label: 'Montant', render: (val, item) => formatCurrency(val, item.devise) },
                    { key: 'mode_livraison', label: 'Mode', render: (val) => val === 'aerien' ? '✈️ Aérien' : '🚢 Maritime' }
                  ]
                }}
              />

              {/* Pagination avec sélecteur de taille */}
              {pagination && (
                <div className="mt-6 space-y-4">
                  {/* Informations et sélecteur de taille - Stack sur mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Afficher</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(value) => {
                            const nextSize = parseInt(value, 10);
                            if (!Number.isNaN(nextSize)) {
                              setPageSize(nextSize);
                              setCurrentPage(1);
                            }
                          }}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="10" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                            <SelectItem value="1000">Tout afficher</SelectItem>
                          </SelectContent>
                        </Select>

                        <span className="text-sm text-gray-600">par page</span>
                      </div>
                      <span className="text-sm text-gray-500 sm:ml-4">
                        {pagination.count} facture{pagination.count > 1 ? 's' : ''} au total
                      </span>
                    </div>
                  </div>

                  {/* Pagination - Centrée et responsive */}
                  {pagination.totalPages > 1 && (
                    <div className="flex justify-center">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={setCurrentPage}
                        className="w-full max-w-full overflow-x-auto"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal de détails */}
          {factureToView && (
            <FactureDetailsModal
              facture={factureToView}
              isOpen={detailsModalOpen}
              onClose={() => {
                setDetailsModalOpen(false);
                setFactureToView(null);
              }}
            />
          )}

          {/* Boîte de dialogue de confirmation de suppression */}
          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Supprimer la facture"
            description="Êtes-vous sûr de vouloir supprimer cette facture? Cette action est irréversible."
            confirmText="Supprimer"
            cancelText="Annuler"
            onConfirm={handleConfirmDelete}
          />
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default FacturesProtected;