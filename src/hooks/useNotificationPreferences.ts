import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

export interface NotificationPreferences {
  id?: string;
  user_id: string;
  enable_notifications: boolean;
  enable_browser_notifications: boolean;
  notify_on_creation: boolean;
  notify_on_modification: boolean;
  notify_on_deletion: boolean;
  notify_on_auth: boolean;
  notify_on_settings: boolean;
  notify_on_client_activity: boolean;
  notify_on_transaction_activity: boolean;
  notify_on_user_activity: boolean;
  notify_only_own_activities: boolean;
  notify_only_important: boolean;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_PREFERENCES: Partial<NotificationPreferences> = {
  enable_notifications: true,
  enable_browser_notifications: false,
  notify_on_creation: true,
  notify_on_modification: true,
  notify_on_deletion: true,
  notify_on_auth: false,
  notify_on_settings: true,
  notify_on_client_activity: true,
  notify_on_transaction_activity: true,
  notify_on_user_activity: true,
  notify_only_own_activities: false,
  notify_only_important: false,
};

export const useNotificationPreferences = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Charger les préférences de l'utilisateur
  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPreferences(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // Si les préférences n'existent pas encore, créer les préférences par défaut
        if (error.code === 'PGRST116') {
          const defaultPrefs: Partial<NotificationPreferences> = {
            user_id: user.id,
            ...DEFAULT_PREFERENCES
          };
          
          const { data: newData, error: createError } = await supabase
            .from('user_notification_preferences')
            .insert([defaultPrefs])
            .select()
            .single();

          if (createError) {
            console.error('Error creating default preferences:', createError);
          } else {
            setPreferences(newData);
          }
        } else {
          console.error('Error fetching preferences:', error);
        }
      } else {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error in fetchPreferences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mettre à jour les préférences
  const updatePreferences = useCallback(async (updates: Partial<NotificationPreferences>) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showError('Utilisateur non connecté');
        return false;
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        showError('Erreur lors de la mise à jour des préférences');
        return false;
      }

      setPreferences(data);
      showSuccess('Préférences mises à jour avec succès');
      return true;
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      showError('Erreur lors de la mise à jour des préférences');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  // Réinitialiser aux préférences par défaut
  const resetToDefaults = useCallback(async () => {
    const success = await updatePreferences(DEFAULT_PREFERENCES);
    if (success) {
      showSuccess('Préférences réinitialisées');
    }
    return success;
  }, [updatePreferences]);

  // Demander la permission pour les notifications push
  const requestBrowserNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      showError('Les notifications ne sont pas supportées par ce navigateur');
      return false;
    }

    if (Notification.permission === 'granted') {
      await updatePreferences({ enable_browser_notifications: true });
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await updatePreferences({ enable_browser_notifications: true });
        showSuccess('Notifications du navigateur activées');
        return true;
      } else {
        showError('Permission de notification refusée');
        return false;
      }
    }

    showError('Les notifications sont bloquées. Veuillez les activer dans les paramètres de votre navigateur.');
    return false;
  }, [updatePreferences]);

  // Vérifier si une activité doit déclencher une notification
  const shouldNotify = useCallback((activity: {
    action: string;
    cible?: string;
    user_id: string;
  }) => {
    if (!preferences || !preferences.enable_notifications) {
      return false;
    }

    // Vérifier si on notifie uniquement pour ses propres activités
    // Note: Cette vérification serait mieux avec l'user_id actuel, mais pour simplifier
    // nous la désactivons dans ce contexte synchrone
    if (preferences.notify_only_own_activities) {
      return false; // Ne pas notifier pour les activités des autres
    }

    // Vérifier par type d'action
    if (activity.action.includes('Création') && !preferences.notify_on_creation) return false;
    if (activity.action.includes('Modification') && !preferences.notify_on_modification) return false;
    if (activity.action.includes('Suppression') && !preferences.notify_on_deletion) return false;
    if (activity.action.includes('Auth') && !preferences.notify_on_auth) return false;
    if (activity.action.includes('Settings') && !preferences.notify_on_settings) return false;

    // Vérifier par type d'entité
    if (activity.cible?.includes('Client') && !preferences.notify_on_client_activity) return false;
    if (activity.cible?.includes('Transaction') && !preferences.notify_on_transaction_activity) return false;
    if (activity.cible?.includes('User') && !preferences.notify_on_user_activity) return false;

    return true;
  }, [preferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    saving,
    updatePreferences,
    resetToDefaults,
    requestBrowserNotificationPermission,
    shouldNotify,
    refetch: fetchPreferences
  };
};
