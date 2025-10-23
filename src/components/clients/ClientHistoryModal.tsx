import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  Download,
  Eye,
  Filter,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDate } from '@/utils/formatCurrency';
import { useClientHistory } from '@/hooks/useClientHistory';
import { cn } from '@/lib/utils';
import type { Client } from '@/types';

interface ClientHistoryModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({ 
  client, 
  isOpen, 
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { 
    history, 
    stats, 
    loading, 
    pagination,
    refetch 
  } = useClientHistory(client?.id || '', currentPage, {
    search: searchTerm,
    status: statusFilter,
    currency: currencyFilter
  });

  const handleExport = () => {
    if (!history.length) return;

    const csv = [
      ['Date', 'Référence', 'Montant', 'Devise', 'Statut', 'Motif', 'Mode Paiement'],
      ...history.map(transaction => [
        formatDate(transaction.created_at),
        transaction.reference || transaction.id.slice(0, 8),
        transaction.montant.toString(),
        transaction.devise,
        transaction.statut,
        transaction.motif,
        transaction.mode_paiement
      ])
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique-${client?.nom}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Validé': return 'bg-green-100 text-green-800';
      case 'En attente': return 'bg-yellow-100 text-yellow-800';
      case 'Annulé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCurrencyIcon = (currency: string) => {
    return currency === 'USD' ? '$' : 'CDF';
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Historique du client</span>
          </DialogTitle>
          <DialogDescription>
            Vue consolidée de toutes les transactions et informations pour {client.nom}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations du client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Informations du client</span>
                <Badge variant="outline" className="text-xs">
                  ID: {client.id.slice(0, 8)}...
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{client.nom}</p>
                    <p className="text-xs text-gray-500">Nom complet</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{client.telephone}</p>
                    <p className="text-xs text-gray-500">Téléphone</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{client.email || 'Non renseigné'}</p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">{formatDate(client.created_at)}</p>
                    <p className="text-xs text-gray-500">Date d'inscription</p>
                  </div>
                </div>
              </div>
              {client.adresse && (
                <div className="mt-4 flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <p className="text-sm text-gray-600">{client.adresse}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Statistiques du client */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                    <p className="text-2xl font-bold">{stats.totalTransactions}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total USD</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(stats.totalUSD, 'USD')}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total CDF</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(stats.totalCDF, 'CDF')}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Bénéfice généré</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(stats.totalBenefice, 'USD')}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filtres et recherche */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Rechercher par référence, montant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="Validé">Validés</SelectItem>
                    <SelectItem value="En attente">En attente</SelectItem>
                    <SelectItem value="Annulé">Annulés</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Toutes les devises" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les devises</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Exporter
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Historique des transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Historique des transactions</span>
                <Badge variant="outline" className="text-xs">
                  {pagination.count} transaction{pagination.count > 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">Aucune transaction trouvée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((transaction) => (
                    <div 
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            transaction.devise === 'USD' ? 'bg-green-100' : 'bg-blue-100'
                          )}>
                            <span className="font-bold text-sm">
                              {getCurrencyIcon(transaction.devise)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="font-medium">
                            {formatCurrency(transaction.montant, transaction.devise)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatDate(transaction.created_at)} • {transaction.motif}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(transaction.statut)}>
                          {transaction.statut}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {transaction.mode_paiement}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {pagination.page} sur {pagination.totalPages}
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={pagination.page === 1}
                >
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientHistoryModal;