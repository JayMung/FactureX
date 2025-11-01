import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FieldLevelSecurityService } from '@/lib/security/field-level-security';
import { usePermissions } from './usePermissions';

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
  const { permissions, loading: permissionsLoading } = usePermissions();

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
      // Wait for permissions to load
      if (permissionsLoading) return;
      
      // Use secure RPC function instead of direct table access
      const userRole = permissions?.role || 'operateur';
      
      const { data: analyticsData, error: rpcError } = await supabase
        .rpc('get_dashboard_analytics_secure', {
          p_period: period,
          p_user_role: userRole
        });

      if (rpcError) throw rpcError;

      // Parse the JSON response
      const parsedData = analyticsData as any;
      
      setAnalytics({
        totalRevenue: parsedData.totalRevenue || 0,
        totalTransactions: parsedData.totalTransactions || 0,
        activeClients: parsedData.activeClients || 0,
        netProfit: parsedData.netProfit || 0,
        revenueChange: parsedData.revenueChange || { value: 0, isPositive: true },
        transactionChange: parsedData.transactionChange || { value: 0, isPositive: true },
        clientChange: parsedData.clientChange || { value: 0, isPositive: true },
        profitChange: parsedData.profitChange || { value: 0, isPositive: true },
        currencyBreakdown: parsedData.currencyBreakdown || { USD: 0, CDF: 0 },
        dailyStats: parsedData.dailyStats || [],
        topTransactions: parsedData.topTransactions || []
      });

    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  }, [period, permissions, permissionsLoading]);

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