import React, { useState, useMemo, useEffect } from 'react';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import Layout from '@/components/layout/Layout';
import { useTransactions } from '@/hooks/useTransactions';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { useGlobalBalance } from '@/hooks/useMouvementsComptes';
import { useOperationsFinancieres } from '@/hooks/useOperationsFinancieres';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingDown,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Search,
  Trash2,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Pagination from '@/components/ui/pagination-custom';
import { showSuccess, showError } from '@/utils/toast';
import { UnifiedDataTable, TableColumn } from '@/components/ui/unified-data-table';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { PeriodFilterTabs } from '@/components/ui/period-filter-tabs';
import { getDateRange, PeriodFilter } from '@/utils/dateUtils';

const OperationsFinancieres: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'depense' | 'revenue'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [operationType, setOperationType] = useState<'depense' | 'revenue'>('depense');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [operationToDelete, setOperationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (periodFilter !== 'all') {
      const { current } = getDateRange(periodFilter);
      if (current.start && current.end) {
        setDateFrom(format(current.start, 'yyyy-MM-dd'));
        setDateTo(format(current.end, 'yyyy-MM-dd'));
      }
    } else {
      setDateFrom(undefined);
      setDateTo(undefined);
    }
    setCurrentPage(1);
  }, [periodFilter]);

  const { comptes } = useComptesFinanciers();
  const memoFilters = useMemo(() => ({
    typeTransaction: typeFilter === 'all' ? ['depense', 'revenue'] : [typeFilter],
    search: searchTerm || undefined,
    dateFrom,
    dateTo,
  }), [typeFilter, searchTerm, dateFrom, dateTo]);

  const { 
    transactions, 
    pagination, 
    loading, 
    createTransaction,
    deleteTransaction,
    refetch 
  } = useTransactions(currentPage, memoFilters);
  
  // Récupérer le solde global de tous les comptes
  const { balance: globalBalance, isLoading: balanceLoading } = useGlobalBalance();
  
  // Récupérer les statistiques globales de TOUTES les opérations financières
  const { stats: globalStats, loading: statsLoading, refetch: refetchStats } = useOperationsFinancieres();

  const [formData, setFormData] = useState({
    type_transaction: 'depense' as 'depense' | 'revenue',
    montant: '' as string | number,
    devise: 'USD' as 'USD' | 'CDF',
    compte_source_id: '',
    compte_destination_id: '',
    motif: '',
    date_paiement: format(new Date(), 'yyyy-MM-dd')
  });

  // Filter only depense and revenue from the hook-returned transactions (server-filtered)
  const searchedOperations = transactions.filter(t =>
    t.type_transaction === 'depense' || t.type_transaction === 'revenue'
  );

  const typeFilterTabs = [
    { id: 'all', label: 'Tous' },
    { id: 'depense', label: 'Dépenses', icon: <ArrowDownCircle className="h-3.5 w-3.5" /> },
    { id: 'revenue', label: 'Revenus', icon: <ArrowUpCircle className="h-3.5 w-3.5" /> },
  ];

  const columns: TableColumn<typeof searchedOperations[0]>[] = [
    {
      key: 'date_paiement',
      title: 'Date',
      render: (val) => format(new Date(val), 'dd/MM/yyyy', { locale: fr }),
    },
    {
      key: 'type_transaction',
      title: 'Type',
      render: (val) => getTypeBadge(val),
    },
    {
      key: 'motif',
      title: 'Description',
      render: (val) => val || '-',
    },
    {
      key: 'compte',
      title: 'Compte',
      render: (_val, item) =>
        item.type_transaction === 'depense'
          ? item.compte_source?.nom || '-'
          : item.compte_destination?.nom || '-',
    },
    {
      key: 'montant',
      title: 'Montant',
      align: 'right',
      render: (val, item) => (
        <span className={item.type_transaction === 'depense' ? 'text-red-600 font-bold' : 'text-green-600 font-bold'}>
          {item.type_transaction === 'depense' ? '-' : '+'}{formatCurrency(val, item.devise)}
        </span>
      ),
    },
  ];

  const handleOpenDialog = (type: 'depense' | 'revenue') => {
    setOperationType(type);
    setFormData({
      type_transaction: type,
      montant: '',
      devise: 'USD',
      compte_source_id: type === 'depense' ? '' : '',
      compte_destination_id: type === 'revenue' ? '' : '',
      motif: '',
      date_paiement: format(new Date(), 'yyyy-MM-dd')
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setOperationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!operationToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(operationToDelete);
      showSuccess('Opération supprimée avec succès');
      refetch();
      refetchStats();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showError(error.message || 'Erreur lors de la suppression de l\'opération');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setOperationToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const montant = typeof formData.montant === 'string' ? parseFloat(formData.montant) : formData.montant;
    
    if (!montant || isNaN(montant) || montant <= 0) {
      showError('Veuillez entrer un montant valide');
      return;
    }

    if (!formData.motif || formData.motif.trim() === '') {
      showError('Veuillez entrer une description');
      return;
    }

    try {
      const data: any = {
        type_transaction: formData.type_transaction,
        montant: montant,
        devise: formData.devise,
        motif: formData.motif.trim(),
        date_paiement: formData.date_paiement,
        statut: 'En attente'
      };

      if (formData.type_transaction === 'depense') {
        if (!formData.compte_source_id) {
          showError('Veuillez sélectionner un compte source');
          return;
        }
        data.compte_source_id = formData.compte_source_id;
      } else {
        if (!formData.compte_destination_id) {
          showError('Veuillez sélectionner un compte destination');
          return;
        }
        data.compte_destination_id = formData.compte_destination_id;
      }

      await createTransaction(data);
      setIsCreateDialogOpen(false);
      refetch();
      refetchStats(); // Rafraîchir aussi les statistiques globales
      showSuccess(`${formData.type_transaction === 'depense' ? 'Dépense' : 'Revenu'} créé(e) avec succès`);
    } catch (error: any) {
      console.error('Error creating operation:', error);
      showError(error.message || 'Erreur lors de la création');
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Montant', 'Compte'];
    const rows = searchedOperations.map(op => [
      format(new Date(op.date_paiement as string), 'dd/MM/yyyy'),
      op.type_transaction === 'depense' ? 'Dépense' : 'Revenu',
      op.motif || '',
      op.montant.toString(),
      op.type_transaction === 'depense' 
        ? (op.compte_source?.nom || '')
        : (op.compte_destination?.nom || '')
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `operations-financieres-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Export réussi');
  };

  const getTypeBadge = (type: string) => {
    if (type === 'depense') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <ArrowDownCircle className="h-3 w-3 mr-1" />
          Dépense
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <ArrowUpCircle className="h-3 w-3 mr-1" />
        Revenu
      </Badge>
    );
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 p-2 sm:p-4 md:p-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Opérations Financières</h1>
          <p className="text-sm sm:text-base text-gray-600">Gestion des dépenses et revenus internes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dépenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-xl sm:text-2xl font-bold text-gray-400">Chargement...</div>
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-red-600">
                    {formatCurrency(globalStats.totalDepenses, 'USD')}
                  </div>
                  <p className="text-xs text-muted-foreground">{globalStats.nombreDepenses} opération(s)</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenus</CardTitle>
              <TrendingUp className="h-4 w-4" style={{ color: '#21ac74' }} />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-xl sm:text-2xl font-bold text-gray-400">Chargement...</div>
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold" style={{ color: '#21ac74' }}>
                    {formatCurrency(globalStats.totalRevenus, 'USD')}
                  </div>
                  <p className="text-xs text-muted-foreground">{globalStats.nombreRevenus} opération(s)</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde Global</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <div className="text-xl sm:text-2xl font-bold text-gray-400">Chargement...</div>
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {formatCurrency(globalBalance.soldeNet, 'USD')}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tous comptes confondus ({globalBalance.nombreComptes} comptes)
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Opérations</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-xl sm:text-2xl font-bold text-gray-400">...</div>
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold">{globalStats.nombreOperations}</div>
                  <p className="text-xs text-muted-foreground">Sur toutes les pages</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters row */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <FilterTabs
              tabs={typeFilterTabs}
              activeTab={typeFilter}
              onTabChange={(id) => { setTypeFilter(id as 'all' | 'depense' | 'revenue'); setCurrentPage(1); }}
              variant="pills"
            />
            <PeriodFilterTabs
              period={periodFilter}
              onPeriodChange={(p) => setPeriodFilter(p)}
              showAllOption
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={exportToCSV} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
              <Button onClick={() => handleOpenDialog('depense')} variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50">
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Dépense
              </Button>
              <Button onClick={() => handleOpenDialog('revenue')} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Revenu
              </Button>
            </div>
          </div>
        </div>

        {/* UnifiedDataTable */}
        <UnifiedDataTable
          data={searchedOperations}
          columns={columns}
          loading={loading}
          emptyMessage="Aucune opération trouvée"
          emptySubMessage="Modifiez vos filtres ou créez une nouvelle opération"
          cardConfig={{
            titleKey: 'motif',
            titleRender: (item) => <span className="font-medium">{item.motif || '-'}</span>,
            subtitleKey: 'type_transaction',
            subtitleRender: (item) =>
              item.type_transaction === 'depense'
                ? item.compte_source?.nom || '-'
                : item.compte_destination?.nom || '-',
            badgeRender: (item) => getTypeBadge(item.type_transaction),
          }}
          actionsColumn={{
            header: 'Actions',
            render: (item) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          }}
        />

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        )}

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {operationType === 'depense' ? 'Nouvelle Dépense' : 'Nouveau Revenu'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="montant">Montant *</Label>
                  <Input
                    id="montant"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={formData.montant}
                    onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="devise">Devise *</Label>
                  <Select
                    value={formData.devise}
                    onValueChange={(value: 'USD' | 'CDF') => setFormData({ ...formData, devise: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="CDF">CDF (FC)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="compte">
                  {operationType === 'depense' ? 'Compte source *' : 'Compte destination *'}
                </Label>
                <Select
                  value={operationType === 'depense' ? formData.compte_source_id : formData.compte_destination_id}
                  onValueChange={(value) => {
                    if (operationType === 'depense') {
                      setFormData({ ...formData, compte_source_id: value });
                    } else {
                      setFormData({ ...formData, compte_destination_id: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un compte" />
                  </SelectTrigger>
                  <SelectContent>
                    {comptes.map(compte => (
                      <SelectItem key={compte.id} value={compte.id}>
                        {compte.nom} - {formatCurrency(compte.solde_actuel, compte.devise)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date_paiement}
                  onChange={(e) => setFormData({ ...formData, date_paiement: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="motif">Description *</Label>
                <Textarea
                  id="motif"
                  value={formData.motif}
                  onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                  placeholder="Détails de l'opération..."
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="w-full sm:w-auto">
                  Annuler
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Créer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer l'opération"
          description="Êtes-vous sûr de vouloir supprimer cette opération ? Cette action est irréversible."
          confirmText="Supprimer"
          cancelText="Annuler"
          onConfirm={confirmDelete}
          isConfirming={isDeleting}
          type="delete"
        />
      </div>
    </Layout>
  );
};

export default OperationsFinancieres;
