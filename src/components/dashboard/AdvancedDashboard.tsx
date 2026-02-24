import React, { useState } from 'react';
import StatCard from './StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Receipt, 
  Download,
  BarChart3,
  PieChart,
  Activity,
  Package,
  Wallet
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useDashboardAnalytics } from '@/hooks/useDashboardAnalytics';
import { useTransactions } from '@/hooks/useTransactions';
import { useColis } from '@/hooks/useColis';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface AdvancedDashboardProps {
  className?: string;
  period?: string;
}

const periodFilterToAnalytics = (p?: string): string => {
  switch (p) {
    case 'day': return '24h';
    case 'week': return '7d';
    case 'month': return '30d';
    case 'year': return '90d';
    case 'all': return '90d';
    default: return p || '7d';
  }
};

const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ className, period: periodProp }) => {
  const period = periodFilterToAnalytics(periodProp);
  const [chartType, setChartType] = useState<'revenue' | 'transactions' | 'clients'>('revenue');

  const { 
    analytics, 
    loading, 
    error,
    refetch 
  } = useDashboardAnalytics(period);

  // Charger les données des modules Colis et Finance
  const { globalTotals: financeStats, loading: financeLoading } = useTransactions(1, {});
  const { stats: colisStats, loading: colisLoading, error: colisError } = useColis(1, {});

  const handleExport = () => {
    // Export des données analytics en CSV
    const csv = [
      ['Date', 'Revenus USD', 'Coût Fournisseur USD', 'Dépenses Opé. USD', 'Marge Nette USD'],
      ...analytics.dailyStats.map(stat => [
        stat.date,
        stat.revenueUSD.toString(),
        stat.supplierCostUSD.toString(),
        stat.operationalExpensesUSD.toString(),
        stat.netMarginUSD.toString()
      ])
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-xl border border-border bg-card/95 dark:bg-card px-4 py-3 shadow-lg backdrop-blur-sm">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-foreground">
                ${entry.value?.toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container-section">
        <div className="grid-responsive-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="card-base">
              <CardContent className="p-6">
                <div className="h-20 skeleton"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="card-base">
          <CardContent className="p-6">
            <div className="h-64 skeleton"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <Activity className="h-12 w-12 text-status-error mx-auto mb-4" />
            <h3 className="heading-4 mb-2">Erreur de chargement</h3>
            <p className="body-text mb-4">{error}</p>
            <Button onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container-section">
      {/* Contrôles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Type de graphique" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="revenue">Revenus</SelectItem>
              <SelectItem value="transactions">Transactions</SelectItem>
              <SelectItem value="clients">Clients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exporter
        </Button>
      </div>

      {/* Cartes de statistiques — Colorful Design */}
      <div className="grid-responsive-4">
        {/* Revenus totaux — vert */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-400 to-emerald-600 p-5 text-white shadow-md">
          <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="mb-3 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/20">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <p className="text-3xl font-bold leading-none truncate">{formatCurrency(analytics.totalRevenueUSD, 'USD')}</p>
          <p className="mt-1 text-sm text-white/80">Revenus totaux</p>
          {analytics.revenueChange && (
            <div className="mt-2 flex items-center gap-1 text-xs text-white/70">
              {analytics.revenueChange.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(analytics.revenueChange.value)}%</span>
            </div>
          )}
        </div>

        {/* Marge brute — bleu */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 p-5 text-white shadow-md">
          <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="mb-3 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/20">
            <Receipt className="h-5 w-5 text-white" />
          </div>
          <p className="text-3xl font-bold leading-none truncate">{formatCurrency(analytics.netMarginUSD, 'USD')}</p>
          <p className="mt-1 text-sm text-white/80">Marge brute</p>
          {analytics.marginChange && (
            <div className="mt-2 flex items-center gap-1 text-xs text-white/70">
              {analytics.marginChange.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(analytics.marginChange.value)}%</span>
            </div>
          )}
        </div>

        {/* Clients actifs — violet */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-400 to-purple-600 p-5 text-white shadow-md">
          <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="mb-3 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/20">
            <Users className="h-5 w-5 text-white" />
          </div>
          <p className="text-3xl font-bold leading-none">{analytics.activeClients.toLocaleString()}</p>
          <p className="mt-1 text-sm text-white/80">Clients actifs</p>
        </div>

        {/* Bénéfice net — orange */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600 p-5 text-white shadow-md">
          <div className="absolute -bottom-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="mb-3 inline-flex items-center justify-center h-9 w-9 rounded-xl bg-white/20">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <p className="text-3xl font-bold leading-none truncate">{formatCurrency(analytics.netProfitUSD, 'USD')}</p>
          <p className="mt-1 text-sm text-white/80">Bénéfice net</p>
          {analytics.profitChange && (
            <div className="mt-2 flex items-center gap-1 text-xs text-white/70">
              {analytics.profitChange.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(analytics.profitChange.value)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Graphique principal */}
      <Card className="card-base">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <span className="section-title">
                {chartType === 'revenue' && 'Évolution des revenus'}
                {chartType === 'transactions' && 'Évolution des transactions'}
                {chartType === 'clients' && 'Évolution des clients'}
              </span>
            </div>
            <Badge variant="outline" className="small-text badge-neutral">
              {period === '24h' && 'Dernières 24h'}
              {period === '7d' && 'Derniers 7 jours'}
              {period === '30d' && 'Derniers 30 jours'}
              {period === '90d' && 'Derniers 90 jours'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'revenue' ? (
              <AreaChart data={analytics.dailyStats}>
                <defs>
                  <linearGradient id="colorUSD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCDF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} tickMargin={12} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} tickFormatter={(val) => `${val / 1000}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(value) => <span className="small-text">{value}</span>} />
                <Area type="monotone" dataKey="revenueUSD" stroke="#10b981" fillOpacity={1} fill="url(#colorUSD)" name="Revenus USD" />
                <Area type="monotone" dataKey="supplierCostUSD" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCDF)" name="Coût Fournisseur USD" />
              </AreaChart>
            ) : chartType === 'transactions' ? (
              <BarChart data={analytics.dailyStats}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} tickMargin={12} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(value) => <span className="small-text">{value}</span>} />
                <Bar dataKey="netMarginUSD" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Marge Nette USD" />
              </BarChart>
            ) : (
              <LineChart data={analytics.dailyStats}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} tickMargin={12} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(value) => <span className="small-text">{value}</span>} />
                <Line
                  type="monotone"
                  dataKey="activeClients"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ fill: '#9333ea', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Clients actifs"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphiques secondaires */}
      <div className="grid-responsive-2">
        <Card className="card-base">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-muted-foreground" />
              <span className="section-title">Répartition par devise</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.currencyBreakdown.length === 0 ? (
                <p className="body-text text-center py-4">Aucune donnée de devise</p>
              ) : (
                analytics.currencyBreakdown.map((item) => (
                  <div key={item.currency} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={cn(
                        'w-4 h-4 rounded',
                        item.currency === 'USD' ? 'bg-green-500' :
                        item.currency === 'CDF' ? 'bg-blue-500' : 'bg-orange-500'
                      )}></div>
                      <span>{item.currency}</span>
                      <span className="small-text">({item.count} txn)</span>
                    </div>
                    <span className="label-base text-mono">
                      {formatCurrency(item.total, item.currency)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-base">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <span className="section-title">Top transactions récentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topTransactions.length === 0 ? (
                <p className="body-text text-center py-4">Aucune transaction</p>
              ) : (
                analytics.topTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between">
                    <div>
                      <p className="label-base">{transaction.client_name}</p>
                      <p className="small-text">
                        {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="label-base text-mono">
                        {formatCurrency(transaction.montant, transaction.devise)}
                      </p>
                      {transaction.motif && (
                        <span className="small-text">{transaction.motif}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules Colis & Finance */}
      <div className="grid-responsive-2">
        <Card className="card-base">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-status-info" />
              <span className="section-title">Module Colis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {colisLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : colisError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="label-base text-status-error mb-2">Erreur de chargement</p>
                <p className="body-text">{colisError}</p>
                <p className="small-text mt-2">Vérifiez que la table 'colis' existe et que vous avez les permissions</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <p className="small-text font-medium">Total Colis</p>
                  <p className="heading-2 text-mono">
                    {colisStats?.totalCount || 0}
                  </p>
                  <p className="small-text">Tous statuts confondus</p>
                </div>
                <div className="space-y-2">
                  <p className="small-text font-medium">En Transit</p>
                  <p className="heading-2 text-status-info text-mono">
                    {colisStats?.enTransit || 0}
                  </p>
                  <p className="small-text">Colis en cours de livraison</p>
                </div>
                <div className="space-y-2">
                  <p className="small-text font-medium">Livrés</p>
                  <p className="heading-2 text-status-success text-mono">
                    {colisStats?.livres || 0}
                  </p>
                  <p className="small-text">Colis livrés avec succès</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-base">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-status-success" />
              <span className="section-title">Module Finance</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financeLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="small-text font-medium">Volume Transactions USD</p>
                  <p className="heading-2 text-mono">
                    {formatCurrency(financeStats?.totalUSD || 0, 'USD')}
                  </p>
                  <p className="small-text">Transactions commerciales</p>
                </div>
                <div className="space-y-2">
                  <p className="small-text font-medium">Commissions Perçues</p>
                  <p className="heading-2 text-status-info text-mono">
                    {formatCurrency(financeStats?.totalFrais || 0, 'USD')}
                  </p>
                  <p className="small-text">Frais perçus</p>
                </div>
                <div className="space-y-2">
                  <p className="small-text font-medium">Bénéfice Brut</p>
                  <p className="heading-2 text-foreground text-mono">
                    {formatCurrency(financeStats?.totalBenefice || 0, 'USD')}
                  </p>
                  <p className="small-text">Commande + Transfert</p>
                </div>
                <div className="space-y-2">
                  <p className="small-text font-medium">Total Dépenses</p>
                  <p className="heading-2 text-status-error text-mono">
                    {formatCurrency(financeStats?.totalDepenses || 0, 'USD')}
                  </p>
                  <p className="small-text">Sorties d'argent</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedDashboard;