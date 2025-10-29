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
  Receipt,
  Wallet,
  ChevronDown
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '../hooks/useTransactions';
import { usePermissions } from '../hooks/usePermissions';
import { useSorting } from '../hooks/useSorting';
import Pagination from '../components/ui/pagination-custom';
import SortableHeader from '../components/ui/sortable-header';
import TransactionForm from '../components/forms/TransactionForm';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import TransactionDetailsModal from '../components/modals/TransactionDetailsModal';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import type { Transaction } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '../utils/formatCurrency';
import { supabase } from '@/integrations/supabase/client';

const TransactionsProtected: React.FC = () => {
  usePageSetup({
    title: 'Gestion des Transactions',
    subtitle: 'Enregistrez, suivez et validez chaque transfert'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  
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
    modePaiement: searchTerm || undefined
  }), [statusFilter, currencyFilter, searchTerm]);

  const {
    transactions,
    pagination,
    loading,
    isCreating,
    isUpdating,
    error,
    updateTransaction,
    deleteTransaction,
    refetch
  } = useTransactions(currentPage, memoFilters);

  const { sortedData, sortConfig, handleSort } = useSorting(transactions);

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
    // Forcer le rafraîchissement après création/modification
    setTimeout(() => {
      refetch();
    }, 100);
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

  const calculateStats = () => {
    const totalUSD = transactions
      .filter(t => t.devise === 'USD')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const totalFrais = transactions.reduce((sum, t) => sum + t.frais, 0);

    const totalBenefice = transactions.reduce((sum, t) => sum + t.benefice, 0);

    return { totalUSD, totalFrais, totalBenefice };
  };

  const { totalUSD, totalFrais, totalBenefice } = calculateStats();

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
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Bulk Actions Bar */}
          {selectedTransactions.size > 0 && (() => {
            const selectedTotals = calculateSelectedTotals();
            return (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex flex-col space-y-4">
                    {/* Première ligne: Sélection et actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Badge variant="default" className="bg-blue-600">
                          {selectedTransactions.size} sélectionnée(s)
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransactions(new Set())}
                        >
                          Désélectionner tout
                        </Button>
                      </div>
                      <div className="flex items-center space-x-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Changer le statut
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('En attente')}>
                              <Clock className="mr-2 h-4 w-4" />
                              En attente
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Servi')}>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Servi
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Remboursé')}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Remboursé
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Annulé')}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Annulé
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <PermissionGuard module="transactions" permission="delete">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>
                    
                    {/* Deuxième ligne: Résumé des montants */}
                    <div className="flex items-center justify-center space-x-6 text-sm border-t border-blue-200 pt-3">
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-700">Montant USD:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrencyValue(selectedTotals.totalUSD, 'USD')}
                        </span>
                      </div>
                      {selectedTotals.totalCDF > 0 && (
                        <div className="flex items-center space-x-2">
                          <Wallet className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-700">Montant CDF:</span>
                          <span className="font-bold text-blue-600">
                            {formatCurrencyValue(selectedTotals.totalCDF, 'CDF')}
                          </span>
                        </div>
                      )}
                      {selectedTotals.totalCNY > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-700">CNY:</span>
                          <span className="font-bold text-purple-600">
                            {formatCurrencyValue(selectedTotals.totalCNY, 'CNY')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-gray-700">Bénéfice:</span>
                        <span className="font-bold text-orange-600">
                          {formatCurrencyValue(selectedTotals.totalBenefice, 'USD')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
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

          {/* Action Buttons */}
          <div className="flex items-center justify-end">
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={exportTransactions}
                disabled={transactions.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              
              <PermissionGuard module="transactions" permission="create">
                <Button className="bg-green-500 hover:bg-green-600" onClick={handleAddTransaction}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle Transaction
                </Button>
              </PermissionGuard>
            </div>
          </div>

          {/* Stats Cards - Design System */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Total USD Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total USD</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
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
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Frais</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
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
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bénéfice total</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {formatCurrencyValue(totalBenefice, 'USD')}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-purple-500 flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Count Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {pagination?.count || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-500 flex-shrink-0">
                    <Receipt className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
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
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Plus de filtres
            </Button>
          </div>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Liste des Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="w-12 py-3 px-4">
                        <Checkbox
                          checked={selectedTransactions.size === transactions.length && transactions.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <SortableHeader
                        title="ID"
                        sortKey="id"
                        currentSort={sortConfig}
                        onSort={handleSort}
                        className="min-w-[120px]"
                      />
                      <SortableHeader
                        title="Client"
                        sortKey="client.nom"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="Date"
                        sortKey="date_paiement"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="Montant"
                        sortKey="montant"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="Motif"
                        sortKey="motif"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="Frais"
                        sortKey="frais"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="Bénéfice"
                        sortKey="benefice"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="CNY"
                        sortKey="montant_cny"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="Mode"
                        sortKey="mode_paiement"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        title="Statut"
                        sortKey="statut"
                        currentSort={sortConfig}
                        onSort={handleSort}
                      />
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        </tr>
                      ))
                    ) : transactions.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="py-16">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <Receipt className="h-8 w-8 text-gray-400" />
                            </div>
                            <p className="text-lg font-medium text-gray-900 mb-2">Aucune transaction</p>
                            <p className="text-sm text-gray-500 mb-4">Commencez par créer votre première transaction</p>
                            <PermissionGuard module="transactions" permission="create">
                              <Button onClick={handleAddTransaction} className="bg-green-500 hover:bg-green-600">
                                <Plus className="mr-2 h-4 w-4" />
                                Nouvelle Transaction
                              </Button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedData.map((transaction, index) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <Checkbox
                              checked={selectedTransactions.has(transaction.id)}
                              onCheckedChange={() => handleSelectTransaction(transaction.id)}
                            />
                          </td>
                          <td className="py-3 px-4 font-medium min-w-[120px]">
                            {generateReadableId(transaction.id, index)}
                          </td>
                          <td className="py-3 px-4">{transaction.client?.nom || 'Client inconnu'}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(transaction.date_paiement).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium">
                              {formatCurrencyValue(transaction.montant, transaction.devise)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={transaction.motif === 'Commande' ? 'default' : 'secondary'}>
                              {transaction.motif}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatCurrencyValue(transaction.frais, 'USD')}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-green-600">
                            {formatCurrencyValue(transaction.benefice, 'USD')}
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-blue-600">
                            {transaction.montant_cny ? formatCurrencyValue(transaction.montant_cny, 'CNY') : '-'}
                          </td>
                          <td className="py-3 px-4 text-sm">{transaction.mode_paiement}</td>
                          <td className="py-3 px-4">
                            {checkPermission('transactions', 'update') ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-8 flex items-center gap-2 hover:bg-gray-50"
                                  >
                                    {getStatusBadge(transaction.statut)}
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
                              getStatusBadge(transaction.statut)
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleViewTransaction(transaction)}
                                className="hover:bg-blue-50"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              <PermissionGuard module="transactions" permission="update">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditTransaction(transaction)}
                                  className="hover:bg-green-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                              
                              <PermissionGuard module="transactions" permission="delete">
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
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination avec sélecteur de taille */}
              {pagination && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Afficher</span>
                    <Select value="10" onValueChange={(value) => {
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
                      {pagination.count} transaction{pagination.count > 1 ? 's' : ''} au total
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

          {/* Transaction Form Modal */}
          <TransactionForm
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