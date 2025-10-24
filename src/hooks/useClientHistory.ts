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
      let query = supabase
        .from('transactions')
        .select(`
          *,
          client:clients(*)
        `, { count: 'exact' })
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .range((page - 1) * pagination.pageSize, page * pagination.pageSize - 1);

      // Appliquer les filtres
      if (filters.search) {
        query = query.or(`
          reference.ilike.%${filters.search}%
          ,montant.ilike.%${filters.search}%
          ,motif.ilike.%${filters.search}%
        `);
      }

      if (filters.status && filters.status !== 'all') {
        query = query.eq('statut', filters.status);
      }

      if (filters.currency && filters.currency !== 'all') {
        query = query.eq('devise', filters.currency);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('useClientHistory: Query error', error);
        throw error;
      }

      console.log('useClientHistory: Fetched', data?.length, 'transactions, total:', count);
      setHistory(data || []);
      setPagination(prev => ({
        ...prev,
        count: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / prev.pageSize)
      }));

      // Calculer les statistiques
      const stats = data?.reduce((acc, transaction) => {
        acc.totalTransactions++;
        
        if (transaction.devise === 'USD') {
          acc.totalUSD += transaction.montant;
        } else {
          acc.totalCDF += transaction.montant;
        }
        
        acc.totalBenefice += transaction.benefice || 0;
        
        return acc;
      }, {
        totalTransactions: 0,
        totalUSD: 0,
        totalCDF: 0,
        totalBenefice: 0
      });

      setStats(stats);

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