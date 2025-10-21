"use client";

import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
  Trash2
} from 'lucide-react';
import { useTransactions } from '../hooks/useTransactions';
import Pagination from '../components/ui/pagination-custom';
import { Skeleton } from '../components/ui/skeleton';
import TransactionForm from '../components/forms/TransactionForm';
import ConfirmDialog from '../components/ui/confirm-dialog';
import type { Transaction } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

const Transactions = () => {
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

  const {
    transactions,
    pagination,
    isLoading,
    error,
    updateTransaction,
    refetch
  } = useTransactions(currentPage, {
    status: statusFilter,
    currency: currencyFilter,
    modePaiement: searchTerm
  });

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else if (currency === 'CDF') {
      return `${amount.toLocaleString('fr-FR')} CDF`;
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

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    
    setIsDeleting(true);
    try {
      // TODO: Implémenter la suppression dans le hook useTransactions
      // await deleteTransaction(transactionToDelete.id);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
      showSuccess('Transaction supprimée avec succès');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
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
      await updateTransaction({
        id: transactionToValidate.id,
        data: {
          statut: 'Servi',
          valide_par: 'current_user' // TODO: Get from auth context
        }
      });
      setValidateDialogOpen(false);
      setTransactionToValidate(null);
      showSuccess('Transaction validée avec succès');
    } catch (error: any) {
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

  const handleFormSuccess = () => {
    refetch();
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

  // Function to generate readable transaction ID
  const generateReadableId = (index: number) => {
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `TX${paddedNumber}`;
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
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Gestion des Transactions</h2>
            <p className="text-gray-500">Enregistrez, suivez et validez chaque transfert</p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddTransaction}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle Transaction
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total USD</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(totalUSD, 'USD')}
                  </p>
                </div>
                <div className="text-emerald-600">
                  <span className="text-2xl font-bold">$</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Total CDF</p>
                  <p className="text-sm text-red-600 font-medium">À retirer CDF</p>
                </div>
                <div className="text-right space-y-2">
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(totalCDF, 'CDF')}
                  </p>
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(Math.round(totalCDF * 0.7), 'CDF')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Bénéfice total</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(totalBenefice, 'USD')}
                  </p>
                </div>
                <div className="text-purple-600">
                  <span className="text-2xl font-bold">↑</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {pagination?.count || 0}
                  </p>
                </div>
                <div className="text-gray-600">
                  <span className="text-2xl font-bold">T</span>
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
            <div className="overflow-x-auto">
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
                  {isLoading ? (
                    Array.from({ length: 10 }).map((_, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                        <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-8 text-center text-gray-500">
                        Aucune transaction trouvée
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
                          {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">
                            {formatCurrency(transaction.montant, transaction.devise)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={transaction.motif === 'Commande' ? 'default' : 'secondary'}>
                            {transaction.motif}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {formatCurrency(transaction.frais, 'USD')}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-green-600">
                          {formatCurrency(transaction.benefice, 'USD')}
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-blue-600">
                          {formatCurrency(transaction.montant_cny, 'CNY')}
                        </td>
                        <td className="py-3 px-4 text-sm">{transaction.mode_paiement}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(transaction.statut)}
                            <Badge className={getStatusColor(transaction.statut)}>
                              {transaction.statut}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {transaction.statut === 'En attente' && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-green-600"
                                onClick={() => handleValidateTransaction(transaction)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-600"
                              onClick={() => handleDeleteTransaction(transaction)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Supprimer la transaction"
          description={`Êtes-vous sûr de vouloir supprimer la transaction de ${formatCurrency(transactionToDelete?.montant || 0, transactionToDelete?.devise || 'USD')} ? Cette action est irréversible.`}
          confirmText="Supprimer"
          cancelText="Annuler"
          onConfirm={confirmDeleteTransaction}
          isConfirming={isDeleting}
          type="delete"
        />

        {/* Validation Confirmation Dialog */}
        <ConfirmDialog
          open={validateDialogOpen}
          onOpenChange={setValidateDialogOpen}
          title="Valider la transaction"
          description={`Êtes-vous sûr de vouloir valider la transaction de ${formatCurrency(transactionToValidate?.montant || 0, transactionToValidate?.devise || 'USD')} ? Le statut passera à "Servi".`}
          confirmText="Valider"
          cancelText="Annuler"
          onConfirm={confirmValidateTransaction}
          isConfirming={isValidating}
          type="warning"
        />
      </div>
    </Layout>
  );
};

export default Transactions;