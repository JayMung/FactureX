import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalyticsData {
  totalRevenue: number;
  totalTransactions: number;
  activeClients: number;
  netProfit: number;
  revenueChange: { value: number; isPositive: boolean };
  transactionChange: { value: number; isPositive: boolean };
  clientChange: { value: number; isPositive: boolean };
  profitChange: { value: number; isPositive: boolean };
  currencyBreakdown: {
    USD: number;
    CDF: number;
  };
  dailyStats: Array<{
    date: string;
    revenueUSD: number;
    revenueCDF: number;
    transactions: number;
    newClients: number;
  }>;
  topTransactions: Array<{
    clientName: string;
    amount: number;
    currency: string;
    date: string;
    status: string;
  }>;
}

export const useDashboardAnalytics = (period: string = '7d') => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalRevenue: 0,
    totalTransactions: 0,
    activeClients: 0,
    netProfit: 0,
    revenueChange: { value: 0, isPositive: true },
    transactionChange: { value: 0, isPositive: true },
    clientChange: { value: 0, isPositive: true },
    profitChange: { value: 0, isPositive: true },
    currencyBreakdown: { USD: 0, CDF: 0 },
    dailyStats: [],
    topTransactions: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPeriodDates = (period: string) => {
    const now = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setDate(now.getDate() - 1);
        break;
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString()
    };
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { startDate, endDate } = getPeriodDates(period);

      // Récupérer les transactions de la période
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          client:clients(nom)
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Récupérer les clients actifs
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('created_at')
        .gte('created_at', startDate);

      if (clientsError) throw clientsError;

      // Calculer les statistiques
      const totalRevenue = transactions?.reduce((sum, t) => {
        return sum + (t.devise === 'USD' ? t.montant : t.montant / 2850); // Conversion approximative
      }, 0) || 0;

      const totalTransactions = transactions?.length || 0;
      const activeClients = clients?.length || 0;
      const netProfit = transactions?.reduce((sum, t) => sum + (t.benefice || 0), 0) || 0;

      // Répartition par devise
      const currencyBreakdown = transactions?.reduce((acc, t) => {
        if (t.devise === 'USD') {
          acc.USD += t.montant;
        } else {
          acc.CDF += t.montant;
        }
        return acc;
      }, { USD: 0, CDF: 0 }) || { USD: 0, CDF: 0 };

      // Top transactions
      const topTransactions = transactions?.slice(0, 10).map(t => ({
        clientName: t.client?.nom || 'Client inconnu',
        amount: t.montant,
        currency: t.devise,
        date: new Date(t.created_at).toLocaleDateString('fr-FR'),
        status: t.statut
      })) || [];

      // Statistiques quotidiennes (simplifié)
      const dailyStats = transactions?.reduce((acc, t) => {
        const date = new Date(t.created_at).toLocaleDateString('fr-FR');
        const existing = acc.find(s => s.date === date);
        
        if (existing) {
          existing.transactions++;
          if (t.devise === 'USD') {
            existing.revenueUSD += t.montant;
          } else {
            existing.revenueCDF += t.montant;
          }
        } else {
          acc.push({
            date,
            revenueUSD: t.devise === 'USD' ? t.montant : 0,
            revenueCDF: t.devise === 'CDF' ? t.montant : 0,
            transactions: 1,
            newClients: 0
          });
        }
        
        return acc;
      }, [] as AnalyticsData['dailyStats']) || [];

      setAnalytics({
        totalRevenue,
        totalTransactions,
        activeClients,
        netProfit,
        revenueChange: { value: 12, isPositive: true }, // Simulé
        transactionChange: { value: 8, isPositive: true }, // Simulé
        clientChange: { value: 15, isPositive: true }, // Simulé
        profitChange: { value: 10, isPositive: true }, // Simulé
        currencyBreakdown,
        dailyStats,
        topTransactions
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics
  };
};