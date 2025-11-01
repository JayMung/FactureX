import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useMouvementsComptes } from '@/hooks/useMouvementsComptes';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpCircle, 
  ArrowDownCircle,
  Calendar,
  Filter
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Pagination from '@/components/ui/pagination-custom';
import { showSuccess } from '@/utils/toast';
import type { MouvementCompte } from '@/types';

const MouvementsComptes: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [compteFilter, setCompteFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { comptes } = useComptesFinanciers();
  const { mouvements, pagination, isLoading, error } = useMouvementsComptes(currentPage, {
    compte_id: compteFilter === 'all' ? undefined : compteFilter,
    type_mouvement: typeFilter === 'all' ? undefined : (typeFilter as 'debit' | 'credit'),
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined
  });

  // Filter mouvements by search term (client-side)
  const filteredMouvements = mouvements.filter(mouvement => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      mouvement.description?.toLowerCase().includes(search) ||
      mouvement.compte?.nom.toLowerCase().includes(search) ||
      mouvement.montant.toString().includes(search)
    );
  });

  // Calculate statistics
  const stats = {
    totalDebits: filteredMouvements
      .filter(m => m.type_mouvement === 'debit')
      .reduce((sum, m) => sum + m.montant, 0),
    totalCredits: filteredMouvements
      .filter(m => m.type_mouvement === 'credit')
      .reduce((sum, m) => sum + m.montant, 0),
    nombreDebits: filteredMouvements.filter(m => m.type_mouvement === 'debit').length,
    nombreCredits: filteredMouvements.filter(m => m.type_mouvement === 'credit').length
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Compte', 'Description', 'Débit', 'Crédit', 'Solde après'];
    const rows = filteredMouvements.map(m => [
      format(new Date(m.date_mouvement), 'dd/MM/yyyy HH:mm'),
      m.compte?.nom || '',
      m.description || '',
      m.type_mouvement === 'debit' ? m.montant.toString() : '',
      m.type_mouvement === 'credit' ? m.montant.toString() : '',
      m.solde_apres.toString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mouvements-comptes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Export réussi');
  };

  const getTypeBadge = (type: 'debit' | 'credit') => {
    if (type === 'debit') {
      return (
        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
          <ArrowDownCircle className="h-3 w-3 mr-1" />
          Débit
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <ArrowUpCircle className="h-3 w-3 mr-1" />
        Crédit
      </Badge>
    );
  };

  if (error) {
    return (
      <Layout>
        <div className="text-center text-red-600 p-4">
          Erreur: {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Mouvements de Comptes</h1>
          <p className="text-gray-600">Historique des débits et crédits de tous vos comptes</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Débits</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.totalDebits, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">{stats.nombreDebits} mouvements</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Crédits</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(stats.totalCredits, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">{stats.nombreCredits} mouvements</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Solde Net</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(stats.totalCredits - stats.totalDebits, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground">Différence crédits - débits</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mouvements</CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredMouvements.length}</div>
              <p className="text-xs text-muted-foreground">Sur la période sélectionnée</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={compteFilter} onValueChange={setCompteFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les comptes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les comptes</SelectItem>
                  {comptes.map(compte => (
                    <SelectItem key={compte.id} value={compte.id}>
                      {compte.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="debit">Débits</SelectItem>
                  <SelectItem value="credit">Crédits</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="Date début"
              />

              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="Date fin"
              />
            </div>

            <div className="flex justify-end mt-4">
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Compte
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      Débit
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      Crédit
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                      Solde après
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredMouvements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        Aucun mouvement trouvé
                      </td>
                    </tr>
                  ) : (
                    filteredMouvements.map((mouvement) => (
                      <tr key={mouvement.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm">
                          {format(new Date(mouvement.date_mouvement), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium">
                          {mouvement.compte?.nom}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {mouvement.description}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {getTypeBadge(mouvement.type_mouvement)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
                          {mouvement.type_mouvement === 'debit' 
                            ? formatCurrency(mouvement.montant, mouvement.compte?.devise || 'USD')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-green-600">
                          {mouvement.type_mouvement === 'credit' 
                            ? formatCurrency(mouvement.montant, mouvement.compte?.devise || 'USD')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold">
                          {formatCurrency(mouvement.solde_apres, mouvement.compte?.devise || 'USD')}
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
      </div>
    </Layout>
  );
};

export default MouvementsComptes;
