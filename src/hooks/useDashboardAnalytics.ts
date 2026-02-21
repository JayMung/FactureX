import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CurrencyBreakdownItem {
  currency: string;
  total: number;
  count: number;
}

export interface DailyStatItem {
  date: string;
  revenueUSD: number;
  supplierCostUSD: number;
  operationalExpensesUSD: number;
  netMarginUSD: number;
}

export interface TopTransactionItem {
  id: string;
  montant: number;
  devise: string;
  motif: string;
  client_name: string;
  created_at: string;
}

export interface DashboardData {
  totalRevenueUSD: number;
  supplierCostUSD: number;
  operationalExpensesUSD: number;
  totalExpensesUSD: number;
  netMarginUSD: number;
  netProfitUSD: number;
  totalFrais: number;
  totalFactures: number;
  facturesValidees: number;
  facturesEnAttente: number;
  activeClients: number;
  currencyBreakdown: CurrencyBreakdownItem[];
  dailyStats: DailyStatItem[];
  topTransactions: TopTransactionItem[];
  revenueChange: { value: number; isPositive: boolean };
  expenseChange: { value: number; isPositive: boolean };
  profitChange: { value: number; isPositive: boolean };
  marginChange: { value: number; isPositive: boolean };
  dataWarning: string | null;
  incompleteTransactionsCount: number;
  incompleteAmountUSD: number;
}

const DEFAULT_DATA: DashboardData = {
  totalRevenueUSD: 0,
  supplierCostUSD: 0,
  operationalExpensesUSD: 0,
  totalExpensesUSD: 0,
  netMarginUSD: 0,
  netProfitUSD: 0,
  totalFrais: 0,
  totalFactures: 0,
  facturesValidees: 0,
  facturesEnAttente: 0,
  activeClients: 0,
  currencyBreakdown: [],
  dailyStats: [],
  topTransactions: [],
  revenueChange: { value: 0, isPositive: true },
  expenseChange: { value: 0, isPositive: true },
  profitChange: { value: 0, isPositive: true },
  marginChange: { value: 0, isPositive: true },
  dataWarning: null,
  incompleteTransactionsCount: 0,
  incompleteAmountUSD: 0,
};

const getPeriodDates = (period: string): { startDate: string; endDate: string } => {
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
    endDate: now.toISOString(),
  };
};

export const useDashboardAnalytics = (period: string = '7d') => {
  const [analytics, setAnalytics] = useState<DashboardData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non authentifié');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      if (!profile?.organization_id) throw new Error('Organization introuvable pour cet utilisateur');

      const { startDate, endDate } = getPeriodDates(period);

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_dashboard_overview_secure', {
          p_organization_id: profile.organization_id,
          p_start_date: startDate,
          p_end_date: endDate,
        });

      if (rpcError) throw rpcError;

      const d = rpcData as any;

      setAnalytics({
        totalRevenueUSD:          d.totalRevenueUSD          ?? 0,
        supplierCostUSD:          d.supplierCostUSD          ?? 0,
        operationalExpensesUSD:   d.operationalExpensesUSD   ?? 0,
        totalExpensesUSD:         d.totalExpensesUSD         ?? 0,
        netMarginUSD:             d.netMarginUSD             ?? 0,
        netProfitUSD:             d.netProfitUSD             ?? 0,
        totalFrais:               d.totalFrais               ?? 0,
        totalFactures:            d.totalFactures            ?? 0,
        facturesValidees:         d.facturesValidees         ?? 0,
        facturesEnAttente:        d.facturesEnAttente        ?? 0,
        activeClients:            d.activeClients            ?? 0,
        currencyBreakdown:        d.currencyBreakdown        ?? [],
        dailyStats:               d.dailyStats               ?? [],
        topTransactions:          d.topTransactions          ?? [],
        revenueChange:            d.revenueChange            ?? { value: 0, isPositive: true },
        expenseChange:            d.expenseChange            ?? { value: 0, isPositive: true },
        profitChange:             d.profitChange             ?? { value: 0, isPositive: true },
        marginChange:             d.marginChange             ?? { value: 0, isPositive: true },
        dataWarning:              d.dataWarning              ?? null,
        incompleteTransactionsCount: d.incompleteTransactionsCount ?? 0,
        incompleteAmountUSD:      d.incompleteAmountUSD      ?? 0,
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
    refetch: fetchAnalytics,
  };
};