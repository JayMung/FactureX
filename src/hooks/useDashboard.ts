"use client";

import { useState, useEffect } from 'react';
import { supabaseService } from '@/services/supabase';

export const useDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        const response = await supabaseService.getDashboardStats();
        
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
  }, []);

  return { stats, isLoading, error };
};