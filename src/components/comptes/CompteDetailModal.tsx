import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Info,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Download,
  BarChart3
} from 'lucide-react';
import { useCompteMouvements, useCompteStats } from '@/hooks/useMouvementsComptes';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { CompteFinancier } from '@/types';
import { showSuccess } from '@/utils/toast';

interface CompteDetailModalProps {
  compte: CompteFinancier | null;
  isOpen: boolean;
  onClose: () => void;
}

const CompteDetailModal: React.FC<CompteDetailModalProps> = ({ compte, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');
  
  const { mouvements, isLoading: isLoadingMouvements } = useCompteMouvements(
    compte?.id || '',
    20
  );
  
  const { stats, isLoading: isLoadingStats } = useCompteStats(compte?.id || '');

  if (!compte) return null;

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'banque':
        return 'Banque';
      case 'cash':
        return 'Cash';
      default:
        return type;
    }
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

  const exportMouvements = () => {
    const headers = ['Date', 'Type', 'Description', 'Montant', 'Solde après'];
    const rows = mouvements.map(m => [
      format(new Date(m.date_mouvement), 'dd/MM/yyyy HH:mm'),
      m.type_mouvement === 'debit' ? 'Débit' : 'Crédit',
      m.description || '',
      m.montant.toString(),
      m.solde_apres.toString()
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${compte.nom}-mouvements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showSuccess('Export réussi');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            {compte.nom}
            <Badge variant={compte.is_active ? 'default' : 'destructive'}>
              {compte.is_active ? 'Actif' : 'Inactif'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="mouvements" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Mouvements
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Statistiques
            </TabsTrigger>
          </TabsList>

          {/* Onglet Informations */}
          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Détails du compte</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Type de compte</p>
                    <p className="text-lg font-semibold">{getAccountTypeLabel(compte.type_compte)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Devise</p>
                    <p className="text-lg font-semibold">{compte.devise}</p>
                  </div>
                  {compte.numero_compte && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Numéro de compte</p>
                      <p className="text-lg font-mono font-semibold">{compte.numero_compte}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Statut</p>
                    <Badge variant={compte.is_active ? 'default' : 'destructive'}>
                      {compte.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Solde actuel</p>
                  <p className="text-4xl font-bold text-blue-600">
                    {formatCurrency(compte.solde_actuel, compte.devise)}
                  </p>
                </div>

                {compte.description && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Description</p>
                    <p className="text-gray-700 dark:text-gray-300">{compte.description}</p>
                  </div>
                )}

                <div className="pt-4 border-t text-xs text-gray-500">
                  <p>Créé le : {format(new Date(compte.created_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                  {compte.updated_at && (
                    <p>Modifié le : {format(new Date(compte.updated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Mouvements */}
          <TabsContent value="mouvements" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Derniers mouvements</h3>
              <Button onClick={exportMouvements} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </div>

            {isLoadingMouvements ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : mouvements.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  Aucun mouvement enregistré
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {mouvements.map((mouvement) => (
                  <Card key={mouvement.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getTypeBadge(mouvement.type_mouvement)}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(mouvement.date_mouvement), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {mouvement.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Solde avant: {formatCurrency(mouvement.solde_avant, compte.devise)}</span>
                            <span>→</span>
                            <span>Solde après: {formatCurrency(mouvement.solde_apres, compte.devise)}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${
                            mouvement.type_mouvement === 'debit' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {mouvement.type_mouvement === 'debit' ? '-' : '+'}
                            {formatCurrency(mouvement.montant, compte.devise)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Onglet Statistiques */}
          <TabsContent value="stats" className="space-y-4">
            {isLoadingStats ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Crédits</CardTitle>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(stats.totalCredits, compte.devise)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stats.nombreCredits} mouvement{stats.nombreCredits > 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Débits</CardTitle>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(stats.totalDebits, compte.devise)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {stats.nombreDebits} mouvement{stats.nombreDebits > 1 ? 's' : ''}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Solde Actuel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-4xl font-bold text-blue-600">
                      {formatCurrency(stats.soldeActuel, compte.devise)}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Solde après le dernier mouvement
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Résumé</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600 dark:text-gray-400">Nombre total de mouvements</span>
                      <span className="font-semibold">{stats.nombreCredits + stats.nombreDebits}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-gray-600 dark:text-gray-400">Solde actuel</span>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(stats.soldeActuel, compte.devise)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 dark:text-gray-400">Moyenne par mouvement</span>
                      <span className="font-semibold">
                        {formatCurrency(
                          (stats.totalCredits + stats.totalDebits) / (stats.nombreCredits + stats.nombreDebits || 1),
                          compte.devise
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CompteDetailModal;
