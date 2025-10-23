import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityLog } from '@/types';

export const useRealTimeActivity = (limit: number = 10) => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Mettre à jour le compteur de notifications non lues
  const markAsRead = useCallback(() => {
    setUnreadCount(0);
    // Marquer comme lues dans le localStorage
    localStorage.setItem('last_read_activity', Date.now().toString());
  }, []);

  // Charger les activités récentes au démarrage
  const fetchRecentActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profiles!inner(
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const activitiesWithUsers = data?.map(log => ({
        ...log,
        user: log.profiles
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
    }
  }, [limit]);

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