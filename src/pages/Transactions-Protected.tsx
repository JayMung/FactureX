"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import Pagination from '../components/ui/pagination-custom';
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
    // Les mutations dans useTransactions gèrent déjà l'actualisation automatique
    // Pas besoin de refetch manuel
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

  const calculateStats = () => {
    const totalUSD = transactions
      .filter(t => t.devise === 'USD')
      .reduce((sum, t) => sum + t.montant, 0);
    
    const totalCDF = transactions
      .filter(t => t.devise === 'CDF')
      .reduce((sum, t) => sum + t.montant, 0);

    const totalBenefice = transactions.reduce((sum, t) => sum + t.benefice, 0);

    return { totalUSD, totalCDF, totalBenefice };
  };

  const { totalUSD, totalCDF, totalBenefice } = calculateStats();

  const generateReadableId = (index: number) => {
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `TX${paddedNumber}`;
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

            {/* Total CDF Card */}
            <Card className="card-base transition-shadow-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total CDF</p>
                    <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                      {totalCDF === 0 ? '0 CDF' : formatCurrencyValue(totalCDF, 'CDF')}
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
                      <th className="text-left py-3 px-4 font-medium text-gray-700">ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Montant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Motif</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Frais</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Bénéfice</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">CNY</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Mode</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="border-b">
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
                        <td colSpan={11} className="py-16">
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
                      transactions.map((transaction, index) => (
                        <tr key={transaction.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">
                            {generateReadableId((currentPage - 1) * (pagination?.pageSize || 10) + index)}
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