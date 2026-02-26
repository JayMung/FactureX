"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
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
  Phone,
  ArrowRightLeft,
  MoreHorizontal
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import StatCard from '../components/dashboard/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import SortableHeader from '../components/ui/sortable-header';
import BulkActions from '../components/ui/bulk-actions';
import ClientForm from '../components/forms/ClientForm';
import ClientHistoryModal from '../components/clients/ClientHistoryModal';
import MergeClientsDialog from '../components/clients/MergeClientsDialog';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import { usePermissions } from '../hooks/usePermissions';
import { useSensitiveDataValue, maskCurrency } from '../hooks/useSensitiveData';
import { UnifiedDataTable, type TableColumn } from '@/components/ui/unified-data-table';
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
import { supabase } from '@/integrations/supabase/client';

const ClientsProtected: React.FC = () => {
  interface ClientIntelligence {
    lastActivityAt: string | null;
    isOverdue: boolean;
    isInactive90d: boolean;
    profitabilityScore: number;
  }

  usePageSetup({
    title: 'Gestion des Clients',
    subtitle: 'Gérez les informations de vos clients'
  });

  const [searchTerm, setSearchTerm] = useState('');
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
    { key: 'created_at', label: 'Date', visible: true },
    { key: 'last_activity', label: 'Dernière activité', visible: true },
    { key: 'client_status', label: 'Statut client', visible: true },
    { key: 'profitability_score', label: 'Rentabilité', visible: true }
  ]);

  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [clientForHistory, setClientForHistory] = useState<Client | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const openClientId = (location.state as any)?.openClientId;
    if (!openClientId) return;
    navigate('/clients', { replace: true, state: {} });
    supabase
      .from('clients')
      .select('*')
      .eq('id', openClientId)
      .single()
      .then(({ data }) => {
        if (data) {
          setClientForHistory(data as Client);
          setHistoryModalOpen(true);
        }
      });
  }, [location.state]);

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);
  const [intelligenceByClient, setIntelligenceByClient] = useState<Record<string, ClientIntelligence>>({});
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
    search: searchTerm || undefined
  });

  const safeClients = useMemo<Client[]>(() => (clients as Client[] | undefined) ?? [], [clients]);

  const { sortedData, sortConfig, handleSort } = useSorting(safeClients);
  const {
    isProcessing,
    deleteMultipleClients,
    exportSelectedClients,
    emailSelectedClients,
  } = useBulkOperations();

  useEffect(() => {
    const loadClientIntelligence = async () => {
      if (!safeClients.length) {
        setIntelligenceByClient({});
        return;
      }

      const clientIds = safeClients.map((c) => c.id);
      const [txResult, factureResult] = await Promise.all([
        supabase
          .from('transactions')
          .select('client_id, created_at, montant, benefice, statut')
          .in('client_id', clientIds)
          .neq('statut', 'Annulé'),
        supabase
          .from('factures')
          .select('client_id, statut, date_emission')
          .in('client_id', clientIds)
      ]);

      if (txResult.error || factureResult.error) return;

      const txByClient = new Map<string, { lastAt: string | null; revenue: number; profit: number }>();
      const now = Date.now();

      (txResult.data || []).forEach((tx) => {
        const prev = txByClient.get(tx.client_id) || { lastAt: null, revenue: 0, profit: 0 };
        const nextLast = !prev.lastAt || new Date(tx.created_at) > new Date(prev.lastAt) ? tx.created_at : prev.lastAt;
        txByClient.set(tx.client_id, {
          lastAt: nextLast,
          revenue: prev.revenue + Number(tx.montant || 0),
          profit: prev.profit + Number(tx.benefice || 0)
        });
      });

      const overdueSet = new Set<string>();
      const factureLastByClient = new Map<string, string>();

      (factureResult.data || []).forEach((f) => {
        const last = factureLastByClient.get(f.client_id);
        if (!last || new Date(f.date_emission) > new Date(last)) {
          factureLastByClient.set(f.client_id, f.date_emission);
        }
        const ageDays = Math.floor((now - new Date(f.date_emission).getTime()) / (1000 * 60 * 60 * 24));
        if (f.statut === 'en_attente' && ageDays > 30) overdueSet.add(f.client_id);
      });

      const next: Record<string, ClientIntelligence> = {};
      safeClients.forEach((client) => {
        const txData = txByClient.get(client.id);
        const factureLast = factureLastByClient.get(client.id) || null;
        const baseLast = txData?.lastAt || factureLast || client.created_at;
        const age = Math.floor((now - new Date(baseLast).getTime()) / (1000 * 60 * 60 * 24));
        const margin = txData && txData.revenue > 0 ? (txData.profit / txData.revenue) * 100 : 0;
        const score = Math.max(0, Math.min(100, Math.round(margin * 2)));

        next[client.id] = {
          lastActivityAt: baseLast,
          isOverdue: overdueSet.has(client.id),
          isInactive90d: age > 90,
          profitabilityScore: score,
        };
      });

      setIntelligenceByClient(next);
    };

    loadClientIntelligence();
  }, [safeClients]);

  const displayedClients = useMemo(() => {
    return sortedData;
  }, [sortedData]);

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de la suppression';
      showError(message);
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
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Erreur lors de la suppression');
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
    setSelectedClients(checked ? displayedClients.map((client: Client) => client.id) : []);
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

  const isHidden = useSensitiveDataValue();

  const formatCurrency = (amount: number) => {
    const formatted = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return isHidden ? maskCurrency(formatted, true) : formatted;
  };

  const generateReadableId = (clientId: string, index: number) => {
    // Retourner un simple code à 4 caractères
    return String(index + 1).padStart(4, '0');
  };

  const exportClients = async () => {
    try {
      let dataToExport: Client[] = [];

      if (selectedClients.length > 0) {
        dataToExport = displayedClients.filter((client: Client) => selectedClients.includes(client.id));
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (!userId) {
          showError('Utilisateur non connecté');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', userId)
          .single();

        if (profileError || !profile?.organization_id) {
          throw profileError || new Error('Organisation utilisateur introuvable');
        }

        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('get_clients_with_totals', {
            p_organization_id: profile.organization_id,
            p_page: 1,
            p_page_size: 100000,
            p_search: searchTerm || null,
            p_ville: null
          });

        if (rpcError) throw rpcError;

        const rpcData = rpcResult as { data?: Client[] } | null;
        dataToExport = rpcData?.data || [];
      }

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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'export des clients';
      showError(message);
    }
  };

  const isAllSelected = displayedClients.length > 0 && selectedClients.length === displayedClients.length;
  const isPartiallySelected = selectedClients.length > 0 && selectedClients.length < displayedClients.length;

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
          {/* Stats Cards - FreshCart style */}
          <div className="grid-responsive-4">
            <KpiCard title="Clients" value={globalTotals.totalCount || 0} icon={Users} iconColor="#21ac74" iconBg="#dcfce7" />

            {isAdmin ? (
              <KpiCard title="Total Payé" value={formatCurrency(globalTotals.totalPaye)} icon={DollarSign} iconColor="#3b82f6" iconBg="#dbeafe" />
            ) : (
              <KpiCard title="Pays" value={new Set(sortedData.map((c: Client) => c.pays)).size} icon={MapPin} iconColor="#3b82f6" iconBg="#dbeafe" />
            )}

            <KpiCard title="Villes" value={new Set(sortedData.map((c: Client) => c.ville)).size} icon={MapPin} iconColor="#8b5cf6" iconBg="#ede9fe" />

            <KpiCard title="Sélectionnés" value={selectedClients.length} icon={CheckSquare} iconColor="#f59e0b" iconBg="#fef3c7" />
          </div>

          {/* Bulk Actions */}
          <BulkActions
            selectedCount={selectedClients.length}
            onClearSelection={() => setSelectedClients([])}
            onDeleteSelected={() => setBulkDeleteDialogOpen(true)}
            onExportSelected={() => exportSelectedClients(displayedClients.filter((c: Client) => selectedClients.includes(c.id)))}
            onEmailSelected={() => emailSelectedClients(displayedClients.filter((c: Client) => selectedClients.includes(c.id)))}
            isDeleting={isDeleting}
          >
            {selectedClients.length === 2 && isAdmin && (
              <Button
                onClick={() => setIsMergeDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Fusionner les 2 fiches
              </Button>
            )}
          </BulkActions>

          {/* Toolbar and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 min-w-[280px] max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Rechercher par nom ou téléphone..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 input-base"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ColumnSelector
                  columns={columnsConfig}
                  onColumnsChange={setColumnsConfig}
                />

                <ExportDropdown
                  onExport={(format) => {
                    if (format === 'csv') exportClients();
                  }}
                  disabled={sortedData.length === 0}
                  selectedCount={selectedClients.length}
                />

                <PermissionGuard module="clients" permission="create">
                  <Button className="btn-primary" onClick={handleAddClient}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Client
                  </Button>
                </PermissionGuard>
              </div>
            </div>
          </div>

          {/* Clients Table */}
          <Card className="card-base">
            <CardHeader className="pb-0 border-b-0">
              <div className="flex items-center gap-4">
                <CardTitle className="section-title">Liste des Clients</CardTitle>
                {selectedClients.length > 0 && (
                  <span className="small-text">
                    {selectedClients.length} sur {displayedClients.length} sélectionné(s)
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <UnifiedDataTable<Client>
                data={displayedClients}

                loading={isLoading && safeClients.length === 0}
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
                  header: 'Actions',
                  render: (client: Client, index: number) => (
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 p-0"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => handleViewClientHistory(client)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4 text-blue-600" />
                            Voir l'historique
                          </DropdownMenuItem>

                          <PermissionGuard module="clients" permission="update">
                            <DropdownMenuItem
                              onClick={() => handleEditClient(client)}
                              className="cursor-pointer"
                            >
                              <Edit className="mr-2 h-4 w-4 text-green-600" />
                              Modifier
                            </DropdownMenuItem>
                          </PermissionGuard>

                          <PermissionGuard module="clients" permission="delete">
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClient(client)}
                                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </DropdownMenuItem>
                            </>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )
                }}
                columns={[
                  {
                    key: 'id',
                    title: 'ID',
                    sortable: true,
                    className: 'min-w-[120px] hidden lg:table-cell', // Hide ID by default on small screens
                    render: (value: unknown, client: Client, index: number) => (
                      <span className="small-text font-medium">
                        {generateReadableId(client.id, index)}
                      </span>
                    )
                  },
                  {
                    key: 'nom',
                    title: 'Nom',
                    sortable: true,
                    render: (value: unknown, client: Client) => (
                      <button
                        onClick={() => handleViewClientHistory(client)}
                        className="text-left hover:text-primary hover:underline transition-colors cursor-pointer label-base"
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
                    render: (value: unknown) => (
                      <div className="flex items-center space-x-1 whitespace-nowrap">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-mono">{sanitizePhoneNumber(value as string || '')}</span>
                      </div>
                    )
                  },
                  {
                    key: 'ville',
                    title: 'Ville',
                    sortable: true,
                    render: (value: unknown) => (
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="body-text">{sanitizeCityName(value as string || '')}</span>
                      </div>
                    )
                  },
                  ...(isAdmin ? [{
                    key: 'total_paye',
                    title: 'Total Payé',
                    sortable: true,
                    align: 'right' as const,
                    render: (value: unknown) => (
                      <span className={cn("font-medium text-mono", Number(value as number) === 0 ? "text-muted-foreground" : "text-foreground")}>
                        {formatCurrency(value as number || 0)}
                      </span>
                    )
                  }] : []),
                  {
                    key: 'created_at',
                    title: 'Date',
                    sortable: true,
                    render: (value: unknown) => (
                      <span className="small-text whitespace-nowrap">
                        {new Date(value as string | number | Date).toLocaleDateString('fr-FR')}
                      </span>
                    )
                  },
                  {
                    key: 'last_activity',
                    title: 'Dernière activité',
                    sortable: false,
                    render: (_value: unknown, client: Client) => {
                      const last = intelligenceByClient[client.id]?.lastActivityAt || client.created_at;
                      return <span className="small-text whitespace-nowrap">{new Date(last).toLocaleDateString('fr-FR')}</span>;
                    }
                  },
                  {
                    key: 'client_status',
                    title: 'Statut client',
                    sortable: false,
                    render: (_value: unknown, client: Client) => {
                      const intel = intelligenceByClient[client.id];
                      if (intel?.isOverdue) return <Badge className="badge-warning">En retard</Badge>;
                      if (intel?.isInactive90d) return <Badge className="badge-neutral">Inactif 90j</Badge>;
                      return <Badge className="badge-success">Actif</Badge>;
                    }
                  },
                  {
                    key: 'profitability_score',
                    title: 'Rentabilité',
                    sortable: false,
                    align: 'right' as const,
                    render: (_value: unknown, client: Client) => {
                      const score = intelligenceByClient[client.id]?.profitabilityScore ?? 0;
                      const tone = score >= 60 ? 'text-status-success' : score >= 30 ? 'text-status-warning' : 'text-status-error';
                      return <span className={cn('text-mono font-medium', tone)}>{score}%</span>;
                    }
                  }
                ].filter(col => columnsConfig.find(c => c.key === col.key)?.visible)}
              />

              {pagination && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-4">
                  <div className="flex items-center space-x-2">
                    <span className="small-text">Afficher</span>
                    <Select value="10" onValueChange={(value) => {
                      console.log('Page size:', value);
                    }}>
                      <SelectTrigger className="w-20 input-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="small-text">par page</span>
                    <span className="small-text ml-4 hidden sm:inline">
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

          <MergeClientsDialog
            open={isMergeDialogOpen}
            onOpenChange={setIsMergeDialogOpen}
            clientsToMerge={selectedClients}
            onSuccess={() => {
              setSelectedClients([]);
              refetch();
            }}
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