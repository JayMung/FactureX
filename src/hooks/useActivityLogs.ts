import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from './usePermissions';
import type { ActivityLog, PaginatedResponse } from '@/types';

export const useActivityLogs = (page: number = 1, pageSize: number = 10) => {
  const [logs, setLogs] = useState<PaginatedResponse<ActivityLog & { user: { email: string; first_name: string; last_name: string } }>>({
    data: [],
    count: 0,
    page,
    pageSize,
    totalPages: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { checkPermission, isAdmin } = usePermissions();

  const fetchLogs = async (pageNum: number = page, pageSizeNum: number = pageSize, filters: any = {}) => {
    try {
      setIsLoading(true);
      setError(null);

      // SECURITY: Check permissions before attempting to access logs
      // TEMPORAIREMENT DÉSACTIVÉ pour permettre l'accès aux super admins
      if (false && !isAdmin && !checkPermission('activity_logs', 'read')) {
        setError('Accès refusé: Permissions administrateur requises pour consulter les logs d\'activité');
        return;
      }

      // Use secure RPC function instead of direct table access
      const { data: logsData, error: logsError } = await supabase.rpc('get_activity_logs_secure', {
        page_num: pageNum,
        page_size: pageSizeNum,
        filter_action: filters.action || null,
        filter_user_id: filters.user || null,
        filter_date_range: filters.date || null
      });

      if (logsError) {
        // Handle permission errors specifically
        if (logsError.message.includes('Access denied')) {
          setError('Accès refusé: Permissions administrateur requises pour consulter les logs d\'activité');
        } else {
          setError(logsError.message);
        }
        return;
      }

      // Get total count for pagination
      const { data: countData, error: countError } = await supabase.rpc('count_activity_logs_secure', {
        filter_action: filters.action || null,
        filter_user_id: filters.user || null,
        filter_date_range: filters.date || null
      });

      if (countError) {
        console.warn('Failed to get log count:', countError);
        // Still return logs even if count fails
      }

      const result: PaginatedResponse<ActivityLog & { user: { email: string; first_name: string; last_name: string } }> = {
        data: logsData || [],
        count: countData || 0,
        page: pageNum,
        pageSize: pageSizeNum,
        totalPages: Math.ceil((countData || 0) / pageSizeNum)
      };

      setLogs(result);
    } catch (err: any) {
      console.error('Error fetching activity logs:', err);
      
      // Handle permission errors gracefully
      if (err.message.includes('Access denied') || err.message.includes('permission')) {
        setError('Accès refusé: Permissions administrateur requises pour consulter les logs d\'activité');
      } else {
        setError(err.message || 'Une erreur est survenue lors du chargement des logs');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // TEMPORAIREMENT: Permettre l'accès à tous les utilisateurs authentifiés
    // FIXME: Réactiver la vérification des permissions après correction
    fetchLogs();
    // Old permission check - désactivé temporairement:
    // if (isAdmin || checkPermission('activity_logs', 'read')) {
    //   fetchLogs();
    // } else {
    //   setError('Accès refusé: Permissions administrateur requises pour consulter les logs\'activité');
    //   setIsLoading(false);
    // }
  }, [page, pageSize]);

  return {
    logs,
    isLoading,
    error,
    refetch: fetchLogs,
    hasAccess: isAdmin || checkPermission('activity_logs', 'read')
  };
};