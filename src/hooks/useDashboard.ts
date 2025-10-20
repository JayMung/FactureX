import { useQuery } from '@tanstack/react-query';
import { supabaseService } from '@/services/supabase';
import type { DashboardStats, ExchangeRates } from '@/types';

export const useDashboardStats = () => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => supabaseService.getDashboardStats(),
    staleTime: 1000 * 60 * 1, // 1 minute
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });

  return {
    stats: data?.data,
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};

export const useRecentTransactions = (limit: number = 5) => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['recentTransactions', limit],
    queryFn: () => supabaseService.getRecentTransactions(limit),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    transactions: data?.data || [],
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};

export const useExchangeRates = () => {
  const {
    data,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['exchangeRates'],
    queryFn: () => supabaseService.getExchangeRates(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  return {
    rates: data?.data,
    isLoading,
    error: error?.message || data?.error,
    refetch
  };
};