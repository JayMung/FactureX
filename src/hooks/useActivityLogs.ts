import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabase';
import type { ActivityLog, PaginatedResponse } from '@/types';

export const useActivityLogs = (page: number = 1, pageSize: number = 10) => {
  const [logs, setLogs] = useState<PaginatedResponse<ActivityLog & { user: { email: string } }>>({
    data: [],
    count: 0,
    page,
    pageSize,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async (pageNum: number = page, pageSizeNum: number = pageSize) => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await supabaseService.getActivityLogs(pageNum, pageSizeNum);
      
      if (response.error) {
        setError(response.error);
      } else {
        setLogs(response.data || logs);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, pageSize]);

  return {
    logs,
    isLoading,
    error,
    refetch: fetchLogs
  };
};