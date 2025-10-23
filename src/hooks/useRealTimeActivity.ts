import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityLog } from '@/types';

export const useRealTimeActivity = (limit: number = 10) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(0);

  // Mettre à jour le compteur de notifications non lues
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    // Marquer comme lues dans le localStorage
    localStorage.setItem('last_read_activity', Date.now().toString());
  }, []);

  // Charger les activités récentes au démarrage
  const fetchRecentActivities = useCallback(async () => {
    // Débouncing - ne pas faire plus d'une requête par seconde
    const now = Date.now();
    if (isLoading || (now - lastFetch < 1000)) {
      return;
    }
    
    setIsLoading(true);
    setLastFetch(now);
    
    try {
      // Récupérer les activity logs
      const { data: activityData, error: activityError } = await supabase
        .from('activity_logs')
        .select('*')
        .order('date', { ascending: false })
        .limit(limit);

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
        created_at: log.created_at || log.date, // Support both column names
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
  }, [limit, isLoading, lastFetch]);

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
            created_at: newActivity.created_at || newActivity.date, // Support both
            user: userData
          };

          setActivities(prev => [activityWithUser, ...prev.slice(0, limit - 1)]);
          setUnreadCount(prev => prev + 1);

          // Notification optionnelle
          if ('Notification' in window && 'permission' in window.Notification) {
            if (Notification.permission === 'granted') {
              new Notification('Nouvelle activité', {
                body: `${activityWithUser.user?.first_name} ${activityWithUser.action}`,
                icon: '/favicon.ico'
              });
            }
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      channel.unsubscribe();
    };
  }, [limit, fetchRecentActivities]);

  return {
    activities,
    unreadCount,
    isConnected,
    markAsRead,
    refetch: fetchRecentActivities
  };
};