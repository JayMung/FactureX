import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Receipt, 
  Calendar,
  Download,
  Filter,
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
}

const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ className }) => {
  const [period, setPeriod] = useState('7d');
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

  // Debug logs
  useEffect(() => {
    console.log('📊 Finance Stats:', financeStats);
    console.log('📦 Colis Stats:', colisStats);
    if (colisError) {
      console.error('❌ Colis Error:', colisError);
    }
  }, [financeStats, colisStats, colisError]);

  const handleExport = () => {
    // Export des données analytics en CSV
    const csv = [
      ['Période', 'Revenus USD', 'Revenus CDF', 'Transactions', 'Nouveaux clients'],
      ...analytics.dailyStats.map(stat => [
        stat.date,
        stat.revenueUSD.toString(),
        stat.revenueCDF.toString(),
        stat.transactions.toString(),
        stat.newClients.toString()
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

  const StatCard = ({ 
    title, 
    value, 
    change, 
    icon, 
    color 
  }: {
    title: string;
    value: string;
    change?: { value: number; isPositive: boolean };
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {change && (
              <div className="flex items-center mt-2">
                {change.isPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  change.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {change.value}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs période précédente</span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-full", color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div className="rounded-xl border border-slate-100 bg-white/95 px-4 py-3 shadow-lg">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <div className="mt-2 space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-600">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}
              </span>
              <span className="font-semibold text-slate-900">
                {entry.value?.toLocaleString('fr-FR')}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
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
            <Activity className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => refetch()}>
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Dernières 24h</SelectItem>
              <SelectItem value="7d">Derniers 7 jours</SelectItem>
              <SelectItem value="30d">Derniers 30 jours</SelectItem>
              <SelectItem value="90d">Derniers 90 jours</SelectItem>
            </SelectContent>
          </Select>

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

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Revenus totaux"
          value={formatCurrency(analytics.totalRevenue, 'USD')}
          change={analytics.revenueChange}
          icon={<DollarSign className="h-6 w-6 text-white" />}
          color="bg-green-600"
        />
        <StatCard
          title="Transactions"
          value={analytics.totalTransactions.toLocaleString()}
          change={analytics.transactionChange}
          icon={<Receipt className="h-6 w-6 text-white" />}
          color="bg-blue-600"
        />
        <StatCard
          title="Clients actifs"
          value={analytics.activeClients.toLocaleString()}
          change={analytics.clientChange}
          icon={<Users className="h-6 w-6 text-white" />}
          color="bg-purple-600"
        />
        <StatCard
          title="Bénéfice net"
          value={formatCurrency(analytics.netProfit, 'USD')}
          change={analytics.profitChange}
          icon={<TrendingUp className="h-6 w-6 text-white" />}
          color="bg-orange-600"
        />
      </div>

      {/* Graphique principal */}
      <Card className="border border-slate-100 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>
                {chartType === 'revenue' && 'Évolution des revenus'}
                {chartType === 'transactions' && 'Évolution des transactions'}
                {chartType === 'clients' && 'Évolution des clients'}
              </span>
            </div>
            <Badge variant="outline" className="text-xs">
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
                <Legend formatter={(value) => <span className="text-xs text-slate-500">{value}</span>} />
                <Area type="monotone" dataKey="revenueUSD" stroke="#10b981" fillOpacity={1} fill="url(#colorUSD)" name="Revenus USD" />
                <Area type="monotone" dataKey="revenueCDF" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCDF)" name="Revenus CDF" />
              </AreaChart>
            ) : chartType === 'transactions' ? (
              <BarChart data={analytics.dailyStats}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} tickMargin={12} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(value) => <span className="text-xs text-slate-500">{value}</span>} />
                <Bar dataKey="transactions" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Transactions" />
              </BarChart>
            ) : (
              <LineChart data={analytics.dailyStats}>
                <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#94a3b8" style={{ fontSize: '12px' }} tickMargin={12} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend formatter={(value) => <span className="text-xs text-slate-500">{value}</span>} />
                <Line
                  type="monotone"
                  dataKey="newClients"
                  stroke="#9333ea"
                  strokeWidth={2}
                  dot={{ fill: '#9333ea', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Nouveaux clients"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Graphiques secondaires */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>Répartition par devise</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>USD</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(analytics.currencyBreakdown.USD, 'USD')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>CDF</span>
                </div>
                <span className="font-medium">
                  {formatCurrency(analytics.currencyBreakdown.CDF, 'CDF')}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Top transactions récentes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topTransactions.slice(0, 5).map((transaction, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{transaction.clientName}</p>
                    <p className="text-sm text-gray-500">{transaction.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {transaction.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Module Colis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <span>Module Colis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {colisLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : colisError ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-red-600 font-medium mb-2">Erreur de chargement</p>
              <p className="text-sm text-gray-500">{colisError}</p>
              <p className="text-xs text-gray-400 mt-2">Vérifiez que la table 'colis' existe et que vous avez les permissions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Total Colis</p>
                <p className="text-3xl font-bold text-gray-900">
                  {colisStats?.totalCount || 0}
                </p>
                <p className="text-xs text-gray-500">Tous statuts confondus</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">En Transit</p>
                <p className="text-3xl font-bold text-blue-600">
                  {colisStats?.enTransit || 0}
                </p>
                <p className="text-xs text-gray-500">Colis en cours de livraison</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Livrés</p>
                <p className="text-3xl font-bold text-green-600">
                  {colisStats?.livres || 0}
                </p>
                <p className="text-xs text-gray-500">Colis livrés avec succès</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Module Finance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wallet className="h-5 w-5 text-green-600" />
            <span>Module Finance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {financeLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Total USD</p>
                <p className="text-3xl font-bold text-green-600">
                  {formatCurrency(financeStats?.totalUSD || 0, 'USD')}
                </p>
                <p className="text-xs text-gray-500">Transactions commerciales</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Total Frais</p>
                <p className="text-3xl font-bold text-blue-600">
                  {formatCurrency(financeStats?.totalFrais || 0, 'USD')}
                </p>
                <p className="text-xs text-gray-500">Frais perçus</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Bénéfice Total</p>
                <p className="text-3xl font-bold text-purple-600">
                  {formatCurrency(financeStats?.totalBenefice || 0, 'USD')}
                </p>
                <p className="text-xs text-gray-500">Commande + Transfert</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Total Dépenses</p>
                <p className="text-3xl font-bold text-red-600">
                  {formatCurrency(financeStats?.totalDepenses || 0, 'USD')}
                </p>
                <p className="text-xs text-gray-500">Sorties d'argent</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdvancedDashboard;