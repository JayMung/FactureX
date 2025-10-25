import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';
import { useClientHistory } from '@/hooks/useClientHistory';
import type { Client } from '@/types';
import { formatCurrency } from '@/utils/formatCurrency';
import Pagination from '@/components/ui/pagination-custom';

interface ClientHistoryModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({
  client,
  open,
  onOpenChange
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    currency: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const {
    history,
    stats,
    loading,
    pagination,
    refetch
  } = useClientHistory(client?.id || '', currentPage, filters);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleExport = () => {
    const csv = [
      ['Date', 'Type', 'Montant', 'Devise', 'Mode de paiement', 'Statut', 'Référence'],
      ...history.map(item => [
        new Date(item.created_at).toLocaleDateString('fr-FR'),
        item.motif || 'Transaction',
        item.montant.toString(),
        item.devise,
        item.mode_paiement,
        item.statut,
        item.id || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-${client?.nom}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Servi':
        return 'bg-green-100 text-green-800';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800';
      case 'Remboursé':
        return 'bg-blue-100 text-blue-800';
      case 'Annulé':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrencyIcon = (currency: string) => {
    switch (currency) {
      case 'USD':
        return '$';
      case 'CDF':
        return 'FC';
      case 'CNY':
        return '¥';
      default:
        return currency;
    }
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Historique du client</h2>
              <p className="text-gray-500">{client.nom} - {client.telephone}</p>
            </div>
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exporter
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total USD</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${stats.totalUSD.toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total CDF</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.totalCDF.toLocaleString()} FC
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Bénéfice Total</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${stats.totalBenefice.toLocaleString()}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par référence ou motif..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
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
                
                <Select value={filters.currency} onValueChange={(value) => handleFilterChange('currency', value)}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Devise" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes devises</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                    className="w-full sm:w-auto"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                    className="w-full sm:w-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Liste des transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Transactions</span>
                <Button onClick={refetch} variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Actualiser
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Aucune transaction trouvée</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Badge variant="outline">
                              {getCurrencyIcon(transaction.devise)}
                            </Badge>
                            <Badge className={getStatusColor(transaction.statut)}>
                              {transaction.statut}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <p className="text-sm text-gray-600">Montant</p>
                              <p className="font-semibold">
                                {formatCurrency(transaction.montant, transaction.devise)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Motif</p>
                              <p className="font-medium">{transaction.motif}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Mode paiement</p>
                              <p className="font-medium">{transaction.mode_paiement}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Bénéfice</p>
                              <p className="font-medium text-green-600">
                                ${transaction.benefice?.toLocaleString() || '0'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientHistoryModal;