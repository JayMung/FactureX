import React, { useState } from 'react';
import { useMouvementsComptes } from '@/hooks/useMouvementsComptes';
import { useMouvementsComptesStats } from '@/hooks/useMouvementsComptesStats';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  Filter,
  ArrowLeftRight,
  Activity
} from 'lucide-react';
import { SparklineChart } from '@/components/comptes/SparklineChart';
import { TrendBadge } from '@/components/comptes/TrendBadge';
import { formatCurrency } from '@/utils/formatCurrency';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Pagination from '@/components/ui/pagination-custom';
import { showSuccess, showError } from '@/utils/toast';
import type { MouvementCompte } from '@/types';
import { getDateRange, PeriodFilter } from '@/utils/dateUtils';
import { UnifiedDataTable } from '@/components/ui/unified-data-table';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { ColumnSelector } from '@/components/ui/column-selector';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import { PeriodFilterTabs } from '@/components/ui/period-filter-tabs';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const MouvementsComptes: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [compteFilter, setCompteFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'auto'>('auto');
  const [columnsConfig, setColumnsConfig] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
  const { comptes } = useComptesFinanciers();
  React.useEffect(() => {
    if (periodFilter !== 'all') {
      const { current } = getDateRange(periodFilter);
      if (current.start && current.end) {
        setDateFrom(format(current.start, 'yyyy-MM-dd'));
        setDateTo(format(current.end, 'yyyy-MM-dd'));
      }
    } else {
      setDateFrom('');
      setDateTo('');
    }
    setCurrentPage(1);
  }, [periodFilter]);

  const { mouvements, pagination, isLoading, error } = useMouvementsComptes(currentPage, {
    compte_id: compteFilter === 'all' ? undefined : compteFilter,
    type_mouvement: typeFilter === 'all' ? undefined : (typeFilter as 'debit' | 'credit'),
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined
  });

  // Récupérer les statistiques globales de TOUS les mouvements
  const { stats: globalStats, loading: statsLoading } = useMouvementsComptesStats({
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

  const handleExport = async (exportFormat: 'csv' | 'excel' | 'pdf') => {
    try {
      // Fetch 1000 items maximum for the export to bypass pagination
      let query = supabase
        .from('mouvements_comptes')
        .select(`
          *,
          compte:comptes_financiers(nom, devise),
          transaction:transactions(motif, type_transaction)
        `)
        .order('date_mouvement', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(2000);

      if (compteFilter !== 'all') {
        query = query.eq('compte_id', compteFilter);
      }
      if (typeFilter !== 'all') {
        query = query.eq('type_mouvement', typeFilter);
      }
      if (dateFrom) {
        query = query.gte('date_mouvement', `${dateFrom}T00:00:00.000Z`);
      }
      if (dateTo) {
        query = query.lte('date_mouvement', `${dateTo}T23:59:59.999Z`);
      }

      const { data: allData, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      let dataToExport = allData || [];

      // Appliquer la recherche locale
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        dataToExport = dataToExport.filter((m: any) => 
          m.description?.toLowerCase().includes(search) ||
          m.compte?.nom.toLowerCase().includes(search) ||
          m.montant.toString().includes(search)
        );
      }

      if (dataToExport.length === 0) {
        showError('Aucune donnée à exporter avec les filtres actuels');
        return;
      }

      // Fetch exchange rates from settings to calculate equivalent totals
      const { data: ratesData } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'taux_change')
        .in('cle', ['usdToCny', 'usdToCdf']);

      const rates: Record<string, number> = { usdToCny: 6.95, usdToCdf: 2200 };
      ratesData?.forEach((s: any) => {
        rates[s.cle] = parseFloat(s.valeur) || rates[s.cle];
      });

      const convertToUSD = (montant: number, devise: string): number => {
        if (devise === 'USD') return montant;
        if (devise === 'CNY') return montant / rates.usdToCny;
        if (devise === 'CDF') return montant / rates.usdToCdf;
        return montant;
      };

      let totalDebitUSD = 0;
      let totalCreditUSD = 0;

      const headers = ['Date', 'Compte', 'Description', 'Débit', 'Crédit', 'Solde après'];
      const rows = dataToExport.map((m: any) => {
        const montantVal = Number(m.montant);
        const devise = m.compte?.devise || 'USD';
        
        const typeTrans = m.transaction?.type_transaction;
        
        // On n'ajoute pas les transferts (SWAP) dans le TOTAL car ils gonflent artificiellement 
        // les recettes et dépenses de l'entreprise (c'est juste un mouvement interne).
        if (typeTrans !== 'transfert') {
          if (m.type_mouvement === 'debit') totalDebitUSD += convertToUSD(montantVal, devise);
          if (m.type_mouvement === 'credit') totalCreditUSD += convertToUSD(montantVal, devise);
        }

        // We format numbers to keep raw values, but user can see 'Compte' to guess currency
        // But for clarity, we can add the devise acronym if it's CSV or PDF, however for Excel it breaks number format.
        // We will keep raw numbers.
        return [
          format(new Date(m.date_mouvement), 'dd/MM/yyyy HH:mm'),
          `${m.compte?.nom || ''} ${devise !== 'USD' ? `(${devise})` : ''}`.trim(),
          m.description || '',
          m.type_mouvement === 'debit' ? m.montant.toString() : '',
          m.type_mouvement === 'credit' ? m.montant.toString() : '',
          m.solde_apres.toString()
        ];
      });

      // Ligne de totaux
      const totalRow = [
        '', 
        '', 
        'TOTAL USD (Hors Transferts)', 
        totalDebitUSD.toFixed(2), 
        totalCreditUSD.toFixed(2), 
        ''
      ];
      
      const dateStr = dateFrom && dateTo ? `${dateFrom}-au-${dateTo}` : format(new Date(), 'yyyy-MM-dd');
      const filename = `mouvements-comptes-${dateStr}`;

      if (exportFormat === 'csv') {
        const csv = [headers, ...rows, totalRow].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showSuccess('Export CSV réussi');
      } else if (exportFormat === 'excel') {
        const wsData = [
          headers,
          ...rows.map(row => [
            row[0],
            row[1],
            row[2],
            row[3] ? Number(row[3]) : null,
            row[4] ? Number(row[4]) : null,
            Number(row[5])
          ]),
          [
            totalRow[0], 
            totalRow[1], 
            totalRow[2], 
            totalRow[3] ? Number(totalRow[3]) : null, 
            totalRow[4] ? Number(totalRow[4]) : null, 
            null
          ]
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        ws['!cols'] = [
          { wch: 18 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mouvements');
        XLSX.writeFile(wb, `${filename}.xlsx`);
        showSuccess('Export Excel réussi');
      } else if (exportFormat === 'pdf') {
        // Fetch company name for header
        const { data: settingsData } = await supabase
          .from('settings')
          .select('cle, valeur')
          .eq('categorie', 'company');
        const companySettings = (settingsData || []).reduce((acc: any, curr) => {
          acc[curr.cle] = curr.valeur;
          return acc;
        }, {});
        const boName = companySettings['nom_entreprise']?.toUpperCase() || 'FACTUREX';

        const doc = new jsPDF('landscape');
        
        // Entête FactureX/Entreprise
        doc.setFillColor(16, 185, 129); // Emerald
        doc.rect(0, 0, doc.internal.pageSize.width, 6, 'F');
        
        doc.setFontSize(20);
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.text(boName, 14, 20);

        doc.setFontSize(16);
        doc.setTextColor(31, 41, 55);
        doc.text('Historique des Mouvements', 14, 30);
        
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'normal');
        doc.text(`Généré le: ${format(new Date(), 'dd/MM/yyyy à HH:mm')}`, 14, 36);
        
        let metaY = 36;
        if (dateFrom && dateTo) {
          metaY += 6;
          doc.text(`Période: Du ${format(new Date(dateFrom), 'dd/MM/yyyy')} au ${format(new Date(dateTo), 'dd/MM/yyyy')}`, 14, metaY);
        }
        if (compteFilter !== 'all') {
          const selectedCompte = comptes.find(c => c.id === compteFilter);
          if (selectedCompte) {
            metaY += 6;
            doc.text(`Compte: ${selectedCompte.nom}`, 14, metaY);
          }
        }

        autoTable(doc, {
          startY: metaY + 8,
          head: [headers],
          body: [...rows, totalRow],
          theme: 'grid',
          headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold' },
          bodyStyles: { textColor: [31, 41, 55], fontSize: 9 },
          columnStyles: {
              0: { cellWidth: 35 }, 
              1: { cellWidth: 40 }, 
              2: { cellWidth: 'auto' }, 
              3: { cellWidth: 30, halign: 'right', textColor: [239, 68, 68] }, 
              4: { cellWidth: 30, halign: 'right', textColor: [16, 185, 129] }, 
              5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }  
          },
          didParseCell: function(data) {
            if (data.row.index === rows.length) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [249, 250, 251];
              if (data.column.index === 3) data.cell.styles.textColor = [239, 68, 68];
              else if (data.column.index === 4) data.cell.styles.textColor = [16, 185, 129];
              else data.cell.styles.textColor = [31, 41, 55];
            }
          }
        });

        doc.save(`${filename}.pdf`);
        showSuccess('Export PDF réussi');
      }
    } catch (err) {
      console.error('Erreur export:', err);
      showError('Une erreur est survenue lors de l\'exportation');
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

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <PeriodFilterTabs
          period={periodFilter}
          onPeriodChange={setPeriodFilter}
          showAllOption={true}
        />
      </div>

      {/* Stats Cards - FreshCart style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Dépenses" value={statsLoading ? '...' : formatCurrency(globalStats.totalDebits, 'USD')} icon={TrendingDown} iconColor="#ef4444" iconBg="#fee2e2" loading={statsLoading} />
        <KpiCard title="Revenus" value={statsLoading ? '...' : formatCurrency(globalStats.totalCredits, 'USD')} icon={TrendingUp} iconColor="#21ac74" iconBg="#dcfce7" loading={statsLoading} />
        <KpiCard title="Solde Global" value={statsLoading ? '...' : formatCurrency(globalStats.soldeNet, 'USD')} icon={ArrowUpCircle} iconColor="#3b82f6" iconBg="#dbeafe" loading={statsLoading} />
        <KpiCard title="Mouvements" value={statsLoading ? '...' : globalStats.nombreMouvements} icon={Calendar} iconColor="#64748b" iconBg="#f1f5f9" loading={statsLoading} />
      </div>


      {/* P14: Sparkline contextuel quand un compte est filtré */}
      {compteFilter !== 'all' && (() => {
        const selectedCompte = comptes.find(c => c.id === compteFilter);
        if (!selectedCompte) return null;
        return (
          <Card className="border-dashed border-2 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
            <CardContent className="py-4 px-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                      Flux net — {selectedCompte.nom} — 30 derniers jours
                    </span>
                  </div>
                  <TrendBadge
                    compteId={selectedCompte.id}
                    soldeActuel={selectedCompte.solde_actuel}
                    devise={selectedCompte.devise}
                    variant="inline"
                  />
                </div>
                <SparklineChart compteId={selectedCompte.id} devise={selectedCompte.devise} />
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Filters - Cleaner Design */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            />
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={compteFilter} onValueChange={setCompteFilter}>
              <SelectTrigger className="w-[180px] bg-gray-50 dark:bg-gray-800">
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

            <FilterTabs
              tabs={[
                { id: 'all', label: 'Tous', count: mouvements.length }, // Note: count might be inaccurate if paginated, but acceptable for now or hide count
                { id: 'debit', label: 'Débits', count: mouvements.filter(m => m.type_mouvement === 'debit').length },
                { id: 'credit', label: 'Crédits', count: mouvements.filter(m => m.type_mouvement === 'credit').length },
              ]}
              activeTab={typeFilter}
              onTabChange={setTypeFilter}
            />

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px] bg-gray-50 dark:bg-gray-800"
              />
              <span className="text-gray-400">→</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px] bg-gray-50 dark:bg-gray-800"
              />
            </div>
          </div>

          {/* Export Button (only visible on mobile, uses ExportDropdown on desktop) */}
          <div className="lg:hidden w-full flex justify-end">
            <ExportDropdown
              onExport={handleExport}
              disabled={filteredMouvements.length === 0}
            />
          </div>
        </div>
      </div>

      {/* Table - Enhanced Design */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border overflow-hidden shadow-sm">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-purple-500" />
                Historique des Mouvements
              </CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <ColumnSelector
                columns={MOUVEMENT_COLUMNS.map(c => ({
                  key: c.key,
                  label: c.title,
                  visible: columnsConfig[c.key] !== false
                }))}
                onColumnsChange={(cols) => setColumnsConfig(cols.reduce((acc, c) => ({ ...acc, [c.key]: c.visible }), {}))}
              />
              <ExportDropdown
                onExport={handleExport}
                disabled={filteredMouvements.length === 0}
                className="hidden lg:flex"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <UnifiedDataTable
            data={filteredMouvements}
            columns={MOUVEMENT_COLUMNS.filter(c => columnsConfig[c.key] !== false)}
            loading={isLoading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            emptyMessage="Aucun mouvement trouvé"
            emptySubMessage="Essayez de modifier vos filtres ou la période"
            // map 'compteFilter' to be used in column render if needed, or context
            cardConfig={{
              titleKey: 'description',
              subtitleKey: 'compte.nom',
              badgeKey: 'type_mouvement',
              badgeRender: (item) => (
                <Badge className={item.type_mouvement === 'debit' ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
                  {item.type_mouvement === 'debit' ? 'Débit' : 'Crédit'}
                </Badge>
              ),
              infoFields: [
                { key: 'date_mouvement', label: 'Date', render: (val) => format(new Date(val), 'dd/MM/yyyy HH:mm') },
                {
                  key: 'montant', label: 'Montant', render: (val, item) =>
                    <span className={item.type_mouvement === 'debit' ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                      {formatCurrency(val, item.compte?.devise || 'USD')}
                    </span>
                }
              ]
            }}
          />
        </CardContent>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default MouvementsComptes;

const MOUVEMENT_COLUMNS = [
  {
    key: 'date_mouvement',
    title: 'Date',
    sortable: true,
    render: (value: any) => format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: fr })
  },
  {
    key: 'compte.nom',
    title: 'Compte',
    sortable: true,
    render: (value: any, item: any) => item.compte?.nom || '-'
  },
  {
    key: 'description',
    title: 'Description',
    sortable: true,
    render: (value: any, item: any) => {
      const isSwap = item.transaction?.type_transaction === 'transfert';
      return (
        <div className="flex items-center gap-2">
          {isSwap && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs px-1.5 py-0.5">
              🔄 Swap
            </Badge>
          )}
          <span className={`font-medium ${isSwap ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {value}
          </span>
        </div>
      );
    }
  },
  {
    key: 'type_mouvement',
    title: 'Type',
    sortable: true,
    render: (value: any) => (
      <Badge className={value === 'debit' ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}>
        {value === 'debit' ? 'Débit' : 'Crédit'}
      </Badge>
    )
  },
  {
    key: 'debit',
    title: 'Débit',
    align: 'right' as const,
    hiddenOn: 'sm' as const,
    render: (value: any, item: any) => {
      if (item.type_mouvement !== 'debit') return '-';
      const devise = item.compte?.devise || 'USD';
      // Show USD equivalent if not already USD
      const isUSD = devise === 'USD';
      return (
        <span className="text-red-600 font-bold">
          {formatCurrency(item.montant, 'USD')}
          {!isUSD && (
            <span className="text-xs text-gray-400 ml-1">
              ({formatCurrency(item.montant, devise)})
            </span>
          )}
        </span>
      );
    }
  },
  {
    key: 'credit',
    title: 'Crédit',
    align: 'right' as const,
    hiddenOn: 'sm' as const,
    render: (value: any, item: any) => {
      if (item.type_mouvement !== 'credit') return '-';
      const devise = item.compte?.devise || 'USD';
      // For CNY accounts, show the real CNY value with USD conversion note
      if (devise === 'CNY') {
        // Assume rate ~7.25 (we'd need to pass this from context for accuracy)
        const usdEquivalent = item.montant / 7.25;
        return (
          <span className="text-green-600 font-bold">
            {formatCurrency(item.montant, 'CNY')}
            <span className="text-xs text-gray-400 ml-1">
              (~{formatCurrency(usdEquivalent, 'USD')})
            </span>
          </span>
        );
      }
      if (devise === 'CDF') {
        const usdEquivalent = item.montant / 2850;
        return (
          <span className="text-green-600 font-bold">
            {formatCurrency(item.montant, 'CDF')}
            <span className="text-xs text-gray-400 ml-1">
              (~{formatCurrency(usdEquivalent, 'USD')})
            </span>
          </span>
        );
      }
      return (
        <span className="text-green-600 font-bold">
          {formatCurrency(item.montant, 'USD')}
        </span>
      );
    }
  },
  {
    key: 'solde_apres',
    title: 'Solde',
    align: 'right' as const,
    render: (value: any, item: any) => {
      const devise = item.compte?.devise || 'USD';
      // For non-USD accounts, show the original currency value
      // The solde_apres is in the account's native currency
      if (devise === 'CNY') {
        const usdEquivalent = value / 7.25;
        return (
          <span className="font-mono font-bold">
            {formatCurrency(value, 'CNY')}
            <span className="text-xs text-gray-400 ml-1">
              (~{formatCurrency(usdEquivalent, 'USD')})
            </span>
          </span>
        );
      }
      if (devise === 'CDF') {
        const usdEquivalent = value / 2850;
        return (
          <span className="font-mono font-bold">
            {formatCurrency(value, 'CDF')}
            <span className="text-xs text-gray-400 ml-1">
              (~{formatCurrency(usdEquivalent, 'USD')})
            </span>
          </span>
        );
      }
      return (
        <span className="font-mono font-bold">
          {formatCurrency(value, 'USD')}
        </span>
      );
    }
  }
];

