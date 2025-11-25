"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Edit,
  Trash2,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  ChevronDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '../hooks/useTransactions';
import { usePermissions } from '../hooks/usePermissions';
import Pagination from '../components/ui/pagination-custom';
import SortableHeader from '../components/ui/sortable-header';
import TransactionFormFinancial from '@/components/forms/TransactionFormFinancial';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import TransactionDetailsModal from '../components/modals/TransactionDetailsModal';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import EnhancedTable from '@/components/ui/enhanced-table';
import type { Transaction } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '../utils/formatCurrency';
import { supabase } from '@/integrations/supabase/client';
import { 
  sanitizeUserContent, 
  validateContentSecurity,
  sanitizeTransactionMotif,
  sanitizePaymentMethod,
  sanitizeCSV
} from '@/lib/security/content-sanitization';

const TransactionsProtected: React.FC = () => {
  usePageSetup({
    title: 'Gestion des Transactions',
    subtitle: 'Enregistrez, suivez et validez chaque transfert'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState('date_paiement');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // États pour les modales de confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [transactionToValidate, setTransactionToValidate] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transactionToView, setTransactionToView] = useState<Transaction | null>(null);
  const { checkPermission } = usePermissions();

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  const memoFilters = useMemo(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    currency: currencyFilter === 'all' ? undefined : currencyFilter,
    search: searchTerm || undefined,
    // Filtrer uniquement les transactions commerciales (Commande et Transfert)
    motifCommercial: true
  }), [statusFilter, currencyFilter, searchTerm]);

  const {
    transactions,
    loading,
    isCreating,
    isUpdating,
    error,
    pagination,
    globalTotals,
    updateTransaction,
    deleteTransaction,
    refetch
  } = useTransactions(currentPage, memoFilters);

  // Les transactions sont déjà filtrées côté serveur (Commande/Transfert uniquement)
  const commercialTransactions = transactions;

  // Fonction de tri côté serveur
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Inverser la direction si on clique sur la même colonne
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, commencer par ordre descendant
      setSortColumn(column);
      setSortDirection('desc');
    }
    // Retourner à la première page lors du tri
    setCurrentPage(1);
  };

  const formatCurrencyValue = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} CDF`;
    } else if (currency === 'CNY') {
      return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return amount.toString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Servi":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "En attente":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "Remboursé":
        return <RotateCcw className="h-4 w-4 text-blue-600" />;
      case "Annulé":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Servi":
        return "bg-green-100 text-green-800";
      case "En attente":
        return "bg-yellow-100 text-yellow-800";
      case "Remboursé":
        return "bg-blue-100 text-blue-800";
      case "Annulé":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <div className="flex items-center space-x-1">
        {getStatusIcon(status)}
        <Badge className={getStatusColor(status)}>
          {status}
        </Badge>
      </div>
    );
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteTransaction(transactionToDelete.id);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      
      // La mise à jour optimiste dans useTransactions gère déjà l'actualisation
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showError(error.message || 'Erreur lors de la suppression de la transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleValidateTransaction = (transaction: Transaction) => {
    setTransactionToValidate(transaction);
    setValidateDialogOpen(true);
  };

  const confirmValidateTransaction = async () => {
    if (!transactionToValidate) return;
    
    setIsValidating(true);
    try {
      await updateTransaction(transactionToValidate.id, {
        statut: 'Servi',
        valide_par: currentUserId || undefined,
        date_validation: new Date().toISOString()
      });
      setValidateDialogOpen(false);
      setTransactionToValidate(null);
      
      // La mutation dans useTransactions gère déjà l'actualisation
    } catch (error: any) {
      console.error('Erreur lors de la validation:', error);
      showError(error.message || 'Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleAddTransaction = () => {
    setSelectedTransaction(undefined);
    setIsFormOpen(true);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setTransactionToView(transaction);
    setDetailsModalOpen(true);
  };

  const handleDuplicateTransaction = (transaction: Transaction) => {
    // Open form with transaction data but without ID (for duplication)
    const duplicateData = {
      ...transaction,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      date_validation: undefined,
      valide_par: undefined,
      statut: 'En attente'
    } as Transaction;
    setSelectedTransaction(duplicateData);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    // Forcer le rafraîchissement de la liste des transactions de cette page
    console.log('📋 Form success - forcing refetch');
    refetch();
    setSelectedTransaction(undefined);
  };

  const handleStatusChange = async (transaction: Transaction, newStatus: string) => {
    try {
      await updateTransaction(transaction.id, {
        statut: newStatus,
        ...(newStatus === 'Servi' ? {
          valide_par: currentUserId || undefined,
          date_validation: new Date().toISOString()
        } : {})
      });
      showSuccess(`Statut mis à jour: ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      showError(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  // Fonctions de sélection multiple
  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;
    
    try {
      setIsDeleting(true);
      const promises = Array.from(selectedTransactions).map(id => deleteTransaction(id));
      await Promise.all(promises);
      showSuccess(`${selectedTransactions.size} transaction(s) supprimée(s)`);
      setSelectedTransactions(new Set());
      setBulkActionOpen(false);
    } catch (error: any) {
      showError('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTransactions.size === 0) return;
    
    try {
      const promises = Array.from(selectedTransactions).map(id => 
        updateTransaction(id, {
          statut: newStatus,
          ...(newStatus === 'Servi' ? {
            valide_par: currentUserId || undefined,
            date_validation: new Date().toISOString()
          } : {})
        })
      );
      await Promise.all(promises);
      showSuccess(`${selectedTransactions.size} transaction(s) mise(s) à jour`);
      setSelectedTransactions(new Set());
      setBulkActionOpen(false);
    } catch (error: any) {
      showError('Erreur lors de la mise à jour');
    }
  };

  // Calculer les totaux des transactions sélectionnées
  const calculateSelectedTotals = () => {
    const selectedTxs = transactions.filter(t => selectedTransactions.has(t.id));
    
    const totalUSD = selectedTxs
      .filter(t => t.devise === 'USD')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const totalCDF = selectedTxs
      .filter(t => t.devise === 'CDF')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const totalCNY = selectedTxs
      .reduce((sum, t) => sum + (t.montant_cny || 0), 0);
    
    const totalFrais = selectedTxs
      .reduce((sum, t) => sum + t.frais, 0);
    
    const totalBenefice = selectedTxs
      .reduce((sum, t) => sum + t.benefice, 0);
    
    return { totalUSD, totalCDF, totalCNY, totalFrais, totalBenefice };
  };

  const { totalUSD, totalFrais, totalBenefice, totalDepenses } = globalTotals;

  const generateReadableId = (transactionId: string, index: number) => {
    // Utiliser les derniers caractères de l'ID UUID pour garantir l'unicité
    const shortId = transactionId.slice(-6).toUpperCase();
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `TX${paddedNumber}-${shortId}`;
  };

  const exportTransactions = () => {
    const csv = [
      ['client', 'montant', 'devise', 'motif', 'mode_paiement', 'statut', 'date_paiement', 'frais', 'benefice'],
      ...transactions.map(transaction => [
        transaction.client?.nom || '',
        transaction.montant.toString(),
        transaction.devise,
        transaction.motif,
        transaction.mode_paiement,
        transaction.statut,
        transaction.created_at,
        transaction.frais.toString(),
        transaction.benefice.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Transactions exportées avec succès');
  };

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur de chargement des transactions</p>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRouteEnhanced requiredModule="transactions" requiredPermission="read">
      <Layout>
        <div className="space-y-4 md:space-y-6 p-2 sm:p-4 md:p-0 animate-in fade-in duration-300">
          {/* Bulk Actions Bar */}
          {selectedTransactions.size > 0 && (() => {
            const selectedTotals = calculateSelectedTotals();
            return (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    {/* Première ligne: Sélection et actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <Badge variant="default" className="bg-blue-600">
                          {selectedTransactions.size} sélectionnée(s)
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransactions(new Set())}
                          className="w-full sm:w-auto"
                        >
                          Désélectionner tout
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Changer le statut
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('En attente')}>En attente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Servi')}>Servi</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Remboursé')}>Remboursé</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Annulé')}>Annulé</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <PermissionGuard module="finances" permission="delete">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="w-full sm:w-auto"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                    
                    {/* Deuxième ligne: Résumé des montants */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm border-t border-blue-200 pt-3">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-700">Montant USD:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrencyValue(selectedTotals.totalUSD, 'USD')}
                        </span>
                      </div>
                      {selectedTotals.totalCDF > 0 && (
                        <div className="flex items-center gap-2 sm:gap-4">
                          <Wallet className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-700">Montant CDF:</span>
                          <span className="font-bold text-blue-600">
                            {formatCurrencyValue(selectedTotals.totalCDF, 'CDF')}
                          </span>
                        </div>
                      )}
                      {selectedTotals.totalCNY > 0 && (
                        <div className="flex items-center gap-2 sm:gap-4">
                          <span className="font-medium text-gray-700">CNY:</span>
                          <span className="font-bold text-purple-600">
                            {formatCurrencyValue(selectedTotals.totalCNY, 'CNY')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 sm:gap-4">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-gray-700">Bénéfice:</span>
                        <span className="font-bold text-orange-600">
                          {formatCurrencyValue(selectedTotals.totalBenefice, 'USD')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Receipt className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-700">Frais:</span>
                        <span className="font-bold text-gray-600">
                          {formatCurrencyValue(selectedTotals.totalFrais, 'USD')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Stats Cards - Design System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
            {/* Total USD Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total USD</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {formatCurrencyValue(totalUSD, 'USD')}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500 flex-shrink-0">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Frais Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Frais</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {formatCurrencyValue(totalFrais, 'USD')}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-500 flex-shrink-0">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bénéfice Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bénéfice total</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {formatCurrencyValue(totalBenefice, 'USD')}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500 flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Total Dépenses Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Dépenses</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {formatCurrencyValue(totalDepenses, 'USD')}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-red-500 flex-shrink-0">
                    <TrendingDown className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Count Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {globalTotals.totalCount || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Toutes pages confondues</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-500 flex-shrink-0">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par client, ID ou mode de paiement..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Servi">Servi</SelectItem>
                <SelectItem value="En attente">En attente</SelectItem>
                <SelectItem value="Remboursé">Remboursé</SelectItem>
                <SelectItem value="Annulé">Annulé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={currencyFilter} onValueChange={(value) => {
              setCurrencyFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Devise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes devises</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="CDF">CDF</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="w-full sm:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Plus de filtres</span>
              <span className="sm:hidden">Filtres</span>
            </Button>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <CardTitle>Liste des Transactions</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={exportTransactions}
                    disabled={transactions.length === 0}
                    className="w-full sm:w-auto"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exporter
                  </Button>
                  
                  <PermissionGuard module="finances" permission="create">
                    <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-auto" onClick={handleAddTransaction}>
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Nouvelle Transaction</span>
                      <span className="sm:hidden">Nouvelle</span>
                    </Button>
                  </PermissionGuard>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <EnhancedTable
                data={commercialTransactions}
                loading={loading}
                emptyMessage="Aucune transaction"
                emptySubMessage="Commencez par créer votre première transaction"
                onSort={handleSort}
                sortKey={sortColumn}
                sortDirection={sortDirection}
                bulkSelect={{
                  selected: Array.from(selectedTransactions),
                  onSelectAll: handleSelectAll,
                  onSelectItem: (id, checked) => handleSelectTransaction(id),
                  getId: (transaction: Transaction) => transaction.id,
                  isAllSelected: selectedTransactions.size === transactions.length && transactions.length > 0,
                  isPartiallySelected: selectedTransactions.size > 0 && selectedTransactions.size < transactions.length
                }}
                actionsColumn={{
                  header: 'Actions',
                  render: (transaction: Transaction) => (
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewTransaction(transaction)}
                        className="hover:bg-blue-50"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      
                      <PermissionGuard module="finances" permission="update">
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTransaction(transaction)}
                          className="hover:bg-green-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </PermissionGuard>
                      
                      <PermissionGuard module="finances" permission="delete">
                        <Button 
                          variant="ghost"
                          size="icon" 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteTransaction(transaction)}
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
                    render: (value: any, transaction: Transaction, index: number) => (
                      <button
                        onClick={() => handleViewTransaction(transaction)}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                      >
                        {generateReadableId(transaction.id, index)}
                      </button>
                    )
                  },
                  {
                    key: 'client',
                    title: 'Client',
                    sortable: true,
                    render: (value: any) => (
                      <span>{sanitizeUserContent(value?.nom || 'Client inconnu', 'client-name')}</span>
                    )
                  },
                  {
                    key: 'date_paiement',
                    title: 'Date',
                    sortable: true,
                    render: (value: any) => (
                      <span className="text-sm text-gray-600">
                        {new Date(value).toLocaleDateString('fr-FR')}
                      </span>
                    )
                  },
                  {
                    key: 'montant',
                    title: 'Montant',
                    sortable: true,
                    render: (value: any, transaction: Transaction) => (
                      <span className="font-medium">
                        {formatCurrencyValue(value, transaction.devise)}
                      </span>
                    )
                  },
                  {
                    key: 'motif',
                    title: 'Motif',
                    sortable: true,
                    render: (value: any) => (
                      <Badge variant={(value === 'Commande' ? 'default' : 'secondary') as any}>
                        {sanitizeTransactionMotif(value || '')}
                      </Badge>
                    )
                  },
                  {
                    key: 'statut',
                    title: 'Statut',
                    sortable: true,
                    render: (value: any, transaction: Transaction) => (
                      checkPermission('finances', 'update') ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button 
                              variant="outline"
                              size="sm"
                              className="h-8 flex items-center gap-2 hover:bg-gray-50"
                            >
                              {getStatusBadge(value)}
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(transaction, 'En attente')}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 text-yellow-600 mr-2" />
                                En attente
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(transaction, 'Servi')}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center">
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                Servi
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(transaction, 'Remboursé')}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center">
                                <RotateCcw className="h-4 w-4 text-blue-600 mr-2" />
                                Remboursé
                              </div>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleStatusChange(transaction, 'Annulé')}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center">
                                <XCircle className="h-4 w-4 text-red-600 mr-2" />
                                Annulé
                              </div>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        getStatusBadge(value)
                      )
                    )
                  },
                  {
                    key: 'frais',
                    title: 'Frais',
                    sortable: true,
                    render: (value: any) => (
                      <span className="text-sm">
                        {formatCurrencyValue(value, 'USD')}
                      </span>
                    )
                  },
                  {
                    key: 'benefice',
                    title: 'Bénéfice',
                    sortable: true,
                    render: (value: any) => (
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrencyValue(value, 'USD')}
                      </span>
                    )
                  },
                  {
                    key: 'montant_cny',
                    title: 'CNY',
                    sortable: true,
                    render: (value: any) => (
                      <span className="text-sm font-medium text-blue-600">
                        {value ? formatCurrencyValue(value, 'CNY') : '-'}
                      </span>
                    )
                  },
                  {
                    key: 'mode_paiement',
                    title: 'Compte',
                    sortable: true,
                    render: (value: any) => (
                      <span className="text-sm font-medium">
                        {sanitizePaymentMethod(value || '-')}
                      </span>
                    )
                  }
                ]}
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
                          <SelectTrigger className="w-20 h-8">
                            <SelectValue placeholder="10" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="25">25</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                          </SelectContent>
                        </Select>
                        <span className="text-sm text-gray-600">par page</span>
                      </div>
                      <span className="text-sm text-gray-500 sm:ml-4">
                        {pagination.count} transaction{pagination.count > 1 ? 's' : ''} au total
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

          {/* Transaction Form Modal */}
          <TransactionFormFinancial
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={handleFormSuccess}
            transaction={selectedTransaction}
          />

          {/* Delete Confirmation Dialogs */}
          <ConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Supprimer la transaction"
            description={`Êtes-vous sûr de vouloir supprimer la transaction de ${formatCurrencyValue(transactionToDelete?.montant || 0, transactionToDelete?.devise || 'USD')} ? Cette action est irréversible.`}
            confirmText="Supprimer"
            cancelText="Annuler"
            onConfirm={confirmDeleteTransaction}
            isConfirming={isDeleting}
            type="delete"
          />

          <ConfirmDialog
            open={validateDialogOpen}
            onOpenChange={setValidateDialogOpen}
            title="Valider la transaction"
            description={`Êtes-vous sûr de vouloir valider la transaction de ${formatCurrencyValue(transactionToValidate?.montant || 0, transactionToValidate?.devise || 'USD')} ? Le statut passera à "Servi".`}
            confirmText="Valider"
            cancelText="Annuler"
            onConfirm={confirmValidateTransaction}
            isConfirming={isValidating}
            type="warning"
          />

          {/* Transaction Details Modal */}
          <TransactionDetailsModal
            transaction={transactionToView}
            isOpen={detailsModalOpen}
            onClose={() => {
              setDetailsModalOpen(false);
              setTransactionToView(null);
            }}
            onUpdate={updateTransaction}
            onDuplicate={handleDuplicateTransaction}
          />
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default TransactionsProtected;