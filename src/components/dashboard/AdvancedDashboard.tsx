import React, { useState } from 'react';
import { StatCard } from '@/components/ui/stat-card';
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

      {/* Cartes de statistiques — Cotheme Design */}
      <div className="grid-responsive-4">
        <StatCard
          title="Revenus totaux"
          value={formatCurrency(analytics.totalRevenueUSD, 'USD')}
          icon={DollarSign}
          iconColor="text-primary"
          trend={analytics.revenueChange ? { 
            value: analytics.revenueChange.value, 
            label: "vs période prec." 
          } : undefined}
          className="bg-card shadow-sm hover:shadow-md transition-all border-border"
        />

        <StatCard
          title="Marge brute"
          value={formatCurrency(analytics.netMarginUSD, 'USD')}
          icon={Receipt}
          iconColor="text-info"
          trend={analytics.marginChange ? { 
            value: analytics.marginChange.value, 
            label: "vs période prec." 
          } : undefined}
          className="bg-card shadow-sm hover:shadow-md transition-all border-border"
        />

        <StatCard
          title="Clients actifs"
          value={analytics.activeClients.toLocaleString()}
          icon={Users}
          iconColor="text-purple-500"
          className="bg-card shadow-sm hover:shadow-md transition-all border-border"
        />

        <StatCard
          title="Bénéfice net"
          value={formatCurrency(analytics.netProfitUSD, 'USD')}
          icon={TrendingUp}
          iconColor="text-warning"
          trend={analytics.profitChange ? { 
            value: analytics.profitChange.value, 
            label: "vs période prec." 
          } : undefined}
          className="bg-card shadow-sm hover:shadow-md transition-all border-border"
        />
      </div>

      {/* Graphique principal */}
      <Card className="col-span-full lg:col-span-2 bg-card rounded-2xl border border-border shadow-sm p-2">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {chartType === 'revenue' && 'Aperçu des Revenus'}
                {chartType === 'transactions' && 'Évolution des transactions'}
                {chartType === 'clients' && 'Évolution des clients'}
              </h2>
              <p className="text-sm text-muted-foreground">Flux mensuel</p>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant="outline" className="text-xs font-medium text-slate-500 bg-slate-50 border-none">
                {period === '24h' && 'Dernières 24h'}
                {period === '7d' && 'Derniers 7 jours'}
                {period === '30d' && 'Derniers 30 jours'}
                {period === '90d' && 'Derniers 90 jours'}
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            {chartType === 'revenue' ? (
              <AreaChart data={analytics.dailyStats}>
                <defs>
                  <linearGradient id="colorUSD" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCDF" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} tickMargin={16} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickFormatter={(val) => `${val / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4'}} />
                <Legend formatter={(value) => <span className="text-xs text-slate-500 font-medium">{value}</span>} iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Area type="monotone" dataKey="revenueUSD" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorUSD)" name="Revenus USD" activeDot={{r: 6, fill: '#059669', stroke: '#fff', strokeWidth: 2}} />
                <Area type="monotone" dataKey="supplierCostUSD" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCDF)" name="Coût Fournisseur USD" activeDot={{r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2}} />
              </AreaChart>
            ) : chartType === 'transactions' ? (
              <BarChart data={analytics.dailyStats} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} tickMargin={16} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{fill: '#f8fafc'}} />
                <Legend formatter={(value) => <span className="text-xs text-slate-500 font-medium">{value}</span>} iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="netMarginUSD" fill="#2563eb" radius={[6, 6, 6, 6]} name="Marge Nette USD" />
              </BarChart>
            ) : (
              <LineChart data={analytics.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} tickMargin={16} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4'}} />
                <Legend formatter={(value) => <span className="text-xs text-slate-500 font-medium">{value}</span>} iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Line
                  type="monotone"
                  dataKey="activeClients"
                  stroke="#9333ea"
                  strokeWidth={3}
                  dot={{ fill: '#fff', stroke: '#9333ea', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#9333ea', stroke: '#fff', strokeWidth: 2 }}
                  name="Clients actifs"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Activités Récentes & Transactions */}
      <div className="grid-responsive-2">
        <Card className="bg-card rounded-2xl border border-border shadow-sm p-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">
              Top transactions récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analytics.topTransactions.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Aucune transaction</p>
              ) : (
                analytics.topTransactions.slice(0, 5).map((transaction, i) => (
                  <div key={transaction.id} className="flex gap-4 items-center">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                      i % 3 === 0 ? "bg-emerald-50 text-emerald-600" :
                      i % 3 === 1 ? "bg-blue-50 text-blue-600" :
                      "bg-purple-50 text-purple-600"
                    )}>
                      <Receipt className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-slate-900">{transaction.client_name}</p>
                        <span className="text-xs text-slate-400">
                          {new Date(transaction.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-slate-500 truncate max-w-[150px]">
                          {transaction.motif || 'Paiement'}
                        </p>
                        <p className="text-sm font-bold text-slate-900">
                          {formatCurrency(transaction.montant, transaction.devise)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {analytics.topTransactions.length > 0 && (
              <Button variant="outline" className="w-full mt-6 rounded-xl border-slate-200 text-primary font-bold hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-100 transition-all">
                Voir tout l'historique
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card rounded-2xl border border-border shadow-sm p-2">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-foreground">
              Répartition par devise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analytics.currencyBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Aucune donnée de devise</p>
              ) : (
                analytics.currencyBreakdown.map((item) => (
                  <div key={item.currency} className="flex gap-4 items-center">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0",
                      item.currency === 'USD' ? "bg-emerald-50 text-emerald-600" :
                      item.currency === 'CDF' ? "bg-blue-50 text-blue-600" :
                      "bg-orange-50 text-orange-600"
                    )}>
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold text-slate-900">Portefeuille {item.currency}</p>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">
                          {item.count} txn
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {formatCurrency(item.total, item.currency)}
                      </p>
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