import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityLog } from '@/types';

export const useRealTimeActivity = (limit: number = 10) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use refs to avoid circular dependencies and stabilize references
  const isLoadingRef = useRef(isLoading);
  const limitRef = useRef(limit);
  
  useEffect(() => {
    isLoadingRef.current = isLoading;
    limitRef.current = limit;
  }, [isLoading, limit]);

  // Mettre à jour le compteur de notifications non lues
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    localStorage.setItem('last_read_activity', Date.now().toString());
  }, []);

  // Charger les activités récentes au démarrage
  const fetchRecentActivities = useCallback(async () => {
    // Débouncing - ne pas faire plus d'une requête par seconde
    if (isLoadingRef.current) return;
    
    setIsLoading(true);
    
    try {
      const currentLimit = limitRef.current;
      
      // Récupérer les activity logs
      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(currentLimit);

      if (activityError) throw activityError;

      // Récupérer les infos des utilisateurs pour chaque activité
      const userIds = [...new Set(activityData?.map(log => log.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', userIds);

      // Mapper les profils par ID
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const activitiesWithUsers = activityData?.map(log => ({
        ...log,
        created_at: log.created_at || log.date,
        user: profilesMap.get(log.user_id)
      })) || [];

      setActivities(activitiesWithUsers);

      // Calculer les notifications non lues
      const lastRead = localStorage.getItem('last_read_activity');
      if (lastRead) {
        const unreadActivities = activitiesWithUsers.filter(
          activity => new Date(activity.created_at).getTime() > parseInt(lastRead)
        );
        setUnreadCount(unreadActivities.length);
      } else {
        setUnreadCount(activitiesWithUsers.length);
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies - uses refs instead

  // Écouter les nouvelles activités en temps réel
  useEffect(() => {
    fetchRecentActivities();

    const channel = supabase
      .channel('activity_logs')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'activity_logs' },
        async (payload) => {
          const newActivity = payload.new as ActivityLog;
          
          // Récupérer les infos utilisateur
          const { data: userData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', newActivity.user_id)
            .single();

          const activityWithUser = {
            ...newActivity,
            created_at: newActivity.created_at || newActivity.date,
            user: userData
          };

          setActivities(prev => [activityWithUser, ...prev.slice(0, limitRef.current - 1)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, [fetchRecentActivities]); // Stable dependency

  return {
    activities,
    unreadCount,
    isConnected,
    markAsRead,
    refetch: fetchRecentActivities
  };
};