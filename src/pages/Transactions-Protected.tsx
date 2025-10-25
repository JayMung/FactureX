"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { useTransactions } from '../hooks/useTransactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Calendar,
  User,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import type { Transaction, TransactionFilters } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

const TransactionsProtected: React.FC = () => {
  usePageSetup({
    title: 'Transactions',
    subtitle: 'Gérez toutes vos transactions'
  });

  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { 
    transactions, 
    pagination, 
    loading, 
    createTransaction, 
    updateTransaction, 
    deleteTransaction 
  } = useTransactions(page, filters);

  const handleUpdateTransaction = (id: string, data: any) => {
    updateTransaction(id, data);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Complété':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'En attente':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'Annulé':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complété':
        return 'bg-green-100 text-green-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Annulé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
              <p className="text-gray-500">Gérez toutes vos transactions</p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/transactions/new')}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle transaction
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher une transaction..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtres
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Statut</Label>
                  <Select
                    value={filters.status || ''}
                    onValueChange={(value) => setFilters({ ...filters, status: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les statuts</SelectItem>
                      <SelectItem value="Complété">Complété</SelectItem>
                      <SelectItem value="En attente">En attente</SelectItem>
                      <SelectItem value="Annulé">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Devise</Label>
                  <Select
                    value={filters.currency || ''}
                    onValueChange={(value) => setFilters({ ...filters, currency: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Toutes les devises" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Toutes les devises</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CDF">CDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mode de paiement</Label>
                  <Select
                    value={filters.modePaiement || ''}
                    onValueChange={(value) => setFilters({ ...filters, modePaiement: value || undefined })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les modes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tous les modes</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Banque">Banque</SelectItem>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Client</Label>
                  <Input
                    placeholder="ID Client"
                    value={filters.clientId || ''}
                    onChange={(e) => setFilters({ ...filters, clientId: e.target.value || undefined })}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>Liste des transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune transaction</h3>
                <p className="text-gray-500">Commencez par créer votre première transaction</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">ID</th>
                      <th className="text-left py-3 px-4">Client</th>
                      <th className="text-left py-3 px-4">Montant</th>
                      <th className="text-left py-3 px-4">Devise</th>
                      <th className="text-left py-3 px-4">Mode</th>
                      <th className="text-left py-3 px-4">Statut</th>
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-gray-900">
                            #{transaction.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {transaction.client?.nom || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm font-medium text-gray-900">
                            {transaction.devise === 'USD' ? '$' : ''}{transaction.montant.toFixed(2)}
                            {transaction.devise === 'CDF' ? ' CDF' : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{transaction.devise}</Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">{transaction.mode_paiement}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            {getStatusIcon(transaction.statut)}
                            <Badge className={`ml-2 ${getStatusColor(transaction.statut)}`}>
                              {transaction.statut}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (window.confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
                                  deleteTransaction(transaction.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Affichage de {((page - 1) * 10) + 1} à {Math.min(page * 10, pagination.count)} sur {pagination.count} résultats
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Précédent
              </Button>
              <span className="text-sm text-gray-700">
                Page {page} sur {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default TransactionsProtected;