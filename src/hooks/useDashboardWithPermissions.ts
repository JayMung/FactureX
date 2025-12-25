import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabase';
import type { ApiResponse } from '@/types';
import { showSuccess, showError } from '@/utils/toast';

export const useDashboardWithPermissions = (filters?: { dateFrom?: string; dateTo?: string }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await supabaseService.getDashboardStats(filters);

        if (response.error) {
          setError(response.error);
        } else {
          setStats(response.data);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [filters?.dateFrom, filters?.dateTo]);

  return { stats, isLoading, error };
};