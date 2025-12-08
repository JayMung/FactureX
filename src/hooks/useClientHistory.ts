import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ClientHistoryFilters {
  search?: string;
  status?: string;
  currency?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface ClientHistoryStats {
  totalTransactions: number;
  totalUSD: number;
  totalCDF: number;
  totalBenefice: number;
}

interface Pagination {
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const useClientHistory = (
  clientId: string, 
  page: number = 1, 
  filters: ClientHistoryFilters = {}
) => {
  const [history, setHistory] = useState<any[]>([]);
  const [stats, setStats] = useState<ClientHistoryStats>({
    totalTransactions: 0,
    totalUSD: 0,
    totalCDF: 0,
    totalBenefice: 0
  });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    count: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0
  });

  const fetchClientHistory = useCallback(async () => {
    if (!clientId) {
      console.log('useClientHistory: No clientId provided');
      return;
    }

    console.log('useClientHistory: Fetching for client', clientId);
    setLoading(true);
    try {
      // Use secure RPC function instead of dynamic query building
      const { data: result, error: rpcError } = await supabase
        .rpc('search_client_history_secure', {
          p_client_id: clientId,
          p_search_term: filters.search || null,
          p_status: filters.status || null,
          p_currency: filters.currency || null,
          p_date_from: filters.dateFrom || null,
          p_date_to: filters.dateTo || null,
          p_page: page,
          p_page_size: pagination.pageSize
        });

      if (rpcError) {
        console.error('useClientHistory: RPC error', rpcError);
        throw rpcError;
      }

      // Parse the secure response
      const transactions = result?.[0]?.transactions || [];
      const totalCount = result?.[0]?.total_count || 0;
      const statsData = result?.[0]?.stats || {};

      console.log('useClientHistory: Fetched', transactions?.length, 'transactions, total:', totalCount);
      setHistory(transactions);
      setPagination(prev => ({
        ...prev,
        count: totalCount,
        page,
        totalPages: Math.ceil(totalCount / prev.pageSize)
      }));

      // Set statistics from secure RPC
      setStats({
        totalTransactions: statsData.totalTransactions || 0,
        totalUSD: statsData.totalUSD || 0,
        totalCDF: statsData.totalCDF || 0,
        totalBenefice: statsData.totalBenefice || 0
      });

    } catch (error) {
      console.error('Error fetching client history:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, page, filters.search, filters.status, filters.currency, pagination.pageSize]);

  useEffect(() => {
    fetchClientHistory();
  }, [fetchClientHistory]);

  return {
    history,
    stats,
    loading,
    pagination,
    refetch: fetchClientHistory
  };
};