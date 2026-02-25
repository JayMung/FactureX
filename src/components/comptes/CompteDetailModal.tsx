import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  Building2,
  Banknote,
  Wifi,
  ExternalLink
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

const PAGE_SIZE = 8;

const getCardGradient = (nom: string, type: string) => {
  const n = nom.toLowerCase();
  if (n.includes('airtel')) return 'from-red-600 via-red-500 to-rose-400';
  if (n.includes('orange')) return 'from-orange-500 via-orange-400 to-amber-300';
  if (n.includes('m-pesa') || n.includes('mpesa')) return 'from-green-700 via-green-500 to-emerald-400';
  if (n.includes('illicocash') || n.includes('illico')) return 'from-blue-700 via-blue-500 to-cyan-400';
  if (n.includes('alipay')) return 'from-blue-600 via-sky-500 to-cyan-400';
  if (n.includes('cash') || n.includes('bureau')) return 'from-emerald-700 via-emerald-500 to-teal-400';
  if (type === 'banque') return 'from-slate-700 via-slate-500 to-blue-400';
  if (type === 'cash') return 'from-emerald-700 via-emerald-500 to-teal-400';
  return 'from-purple-700 via-purple-500 to-violet-400';
};

const getCardIcon = (type: string) => {
  switch (type) {
    case 'mobile_money': return <Wifi className="h-8 w-8 text-white/70" />;
    case 'banque': return <Building2 className="h-8 w-8 text-white/70" />;
    case 'cash': return <Banknote className="h-8 w-8 text-white/70" />;
    default: return <Smartphone className="h-8 w-8 text-white/70" />;
  }
};

const CompteDetailModal: React.FC<CompteDetailModalProps> = ({ compte, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [mouvPage, setMouvPage] = useState(1);
  const navigate = useNavigate();

  const handleGoToTransaction = (transactionId: string) => {
    onClose();
    navigate(`/transactions?highlight=${transactionId}`);
  };

  const { mouvements, isLoading: isLoadingMouvements, totalCount, totalPages } = useCompteMouvements(
    compte?.id || '',
    PAGE_SIZE,
    mouvPage
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

  const gradient = getCardGradient(compte.nom, compte.type_compte);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Visual bank card header */}
        <div className={`relative bg-gradient-to-br ${gradient} p-6 rounded-t-xl overflow-hidden`}>
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute top-4 -right-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-black/10" />

          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/60 text-xs font-medium uppercase tracking-widest">
                  {compte.type_compte === 'mobile_money' ? 'Mobile Money' : compte.type_compte === 'banque' ? 'Banque' : 'Cash'}
                </span>
                <Badge className={`text-xs px-2 py-0 ${compte.is_active ? 'bg-white/20 text-white border-white/30' : 'bg-red-500/40 text-white border-red-400/40'} border`}>
                  {compte.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-wide">{compte.nom}</h2>
              {compte.numero_compte && (
                <p className="text-white/60 text-sm mt-1 font-mono">{compte.numero_compte}</p>
              )}
            </div>
            {getCardIcon(compte.type_compte)}
          </div>

          <div className="relative mt-6">
            <p className="text-white/60 text-xs uppercase tracking-widest">Solde actuel</p>
            <p className="text-3xl font-bold text-white mt-0.5">
              {formatCurrency(compte.solde_actuel, compte.devise)}
            </p>
            <p className="text-white/50 text-xs mt-1">{compte.devise}</p>
          </div>
        </div>

        <div className="p-6">

        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setMouvPage(1); }}>
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
              <h3 className="text-lg font-semibold">
                Mouvements
                {totalCount > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-500">({totalCount})</span>
                )}
              </h3>
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
              <>
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
                            {(mouvement as any).transaction?.id && (
                              <button
                                type="button"
                                onClick={() => handleGoToTransaction((mouvement as any).transaction.id)}
                                className="mt-1 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Voir la transaction
                              </button>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                              <span>Solde avant: {formatCurrency(mouvement.solde_avant, compte.devise)}</span>
                              <span className="text-gray-400">→</span>
                              <span className={mouvement.type_mouvement === 'debit' ? 'text-red-500 font-medium' : 'text-green-500 font-medium'}>
                                Solde après: {formatCurrency(mouvement.solde_apres, compte.devise)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-bold ${
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm text-gray-500">
                      Page {mouvPage} sur {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMouvPage(p => Math.max(1, p - 1))}
                        disabled={mouvPage === 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const start = Math.max(1, mouvPage - 2);
                        const pageNum = start + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === mouvPage ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setMouvPage(pageNum)}
                            className="h-8 w-8 p-0 text-xs"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMouvPage(p => Math.min(totalPages, p + 1))}
                        disabled={mouvPage === totalPages}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompteDetailModal;
