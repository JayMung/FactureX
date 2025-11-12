import React, { useState } from 'react';
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
  Plus,
  TrendingDown,
  TrendingUp,
  ArrowDownCircle,
  ArrowUpCircle,
  Download,
  Search,
  Trash2,
  Edit,
  MoreVertical
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Pagination from '@/components/ui/pagination-custom';
import { showSuccess, showError } from '@/utils/toast';

const OperationsFinancieres: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'depense' | 'revenue'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [operationType, setOperationType] = useState<'depense' | 'revenue'>('depense');

  const { comptes } = useComptesFinanciers();
  const { 
    transactions, 
    pagination, 
    loading, 
    createTransaction,
    deleteTransaction,
    refetch 
  } = useTransactions(currentPage);
  
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

  // Filter only depense and revenue transactions
  const operationsFinancieres = transactions.filter(t => 
    t.type_transaction === 'depense' || t.type_transaction === 'revenue'
  );

  // Apply type filter
  const filteredOperations = operationsFinancieres.filter(op => {
    if (typeFilter === 'all') return true;
    return op.type_transaction === typeFilter;
  });

  // Apply search filter
  const searchedOperations = filteredOperations.filter(op => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      op.motif?.toLowerCase().includes(search) ||
      op.montant.toString().includes(search) ||
      op.id.toLowerCase().includes(search)
    );
  });

  // Les statistiques globales viennent maintenant du hook useOperationsFinancieres
  // qui récupère TOUTES les opérations sans pagination

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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette opération ? Cette action est irréversible.')) {
      return;
    }

    try {
      await deleteTransaction(id);
      showSuccess('Opération supprimée avec succès');
      refetch();
      refetchStats();
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showError(error.message || 'Erreur lors de la suppression de l\'opération');
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
      format(new Date(op.date_paiement), 'dd/MM/yyyy'),
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
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="text-xl sm:text-2xl font-bold text-gray-400">Chargement...</div>
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="depense">Dépenses</SelectItem>
                <SelectItem value="revenue">Revenus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={exportToCSV} variant="outline" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={() => handleOpenDialog('depense')} variant="outline" className="w-full sm:w-auto text-red-600 border-red-600 hover:bg-red-50">
              <ArrowDownCircle className="h-4 w-4 mr-2" />
              Nouvelle Dépense
            </Button>
            <Button onClick={() => handleOpenDialog('revenue')} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
              <ArrowUpCircle className="h-4 w-4 mr-2" />
              Nouveau Revenu
            </Button>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                </div>
              ) : searchedOperations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Aucune opération trouvée
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {searchedOperations.map((operation) => (
                    <div key={operation.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          {getTypeBadge(operation.type_transaction)}
                          <span className="text-sm text-gray-500">
                            {format(new Date(operation.date_paiement), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{operation.motif || '-'}</p>
                          <p className="text-xs text-gray-500">
                            {operation.type_transaction === 'depense' 
                              ? operation.compte_source?.nom 
                              : operation.compte_destination?.nom}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className={`text-lg font-bold ${
                            operation.type_transaction === 'depense' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {operation.type_transaction === 'depense' ? '-' : '+'}
                            {formatCurrency(operation.montant, operation.devise)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(operation.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Compte</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Montant</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : searchedOperations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        Aucune opération trouvée
                      </td>
                    </tr>
                  ) : (
                    searchedOperations.map((operation) => (
                      <tr key={operation.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(operation.date_paiement), 'dd/MM/yyyy', { locale: fr })}
                        </td>
                        <td className="px-4 py-3">
                          {getTypeBadge(operation.type_transaction)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {operation.motif || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {operation.type_transaction === 'depense' 
                            ? operation.compte_source?.nom 
                            : operation.compte_destination?.nom}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-bold ${
                          operation.type_transaction === 'depense' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {operation.type_transaction === 'depense' ? '-' : '+'}
                          {formatCurrency(operation.montant, operation.devise)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(operation.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </Layout>
  );
};

export default OperationsFinancieres;
