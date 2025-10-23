import { supabase } from '@/integrations/supabase/client';
import type { ActivityLog, UserProfile } from '@/types';

export class ActivityLogger {
  // Logger une activité dans la base de données
  async logActivity(action: string, entityType?: string, entityId?: string, details?: any): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const logData = {
        user_id: user.id,
        action,
        cible: entityType,
        cible_id: entityId,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          page: window.location.pathname,
          sessionId: this.getSessionId()
        },
        date: new Date().toISOString()
      };

      const { error } = await supabase
        .from('activity_logs')
        .insert([logData]);

      if (error) {
        console.error('Error logging activity:', error);
      }
    } catch (error) {
      console.error('Error in logActivity:', error);
    }
  }

  // Logger une activité avec détails avant/après
  async logActivityWithChanges(
    action: string, 
    entityType: string, 
    entityId: string, 
    changes: { before?: any; after?: any }
  ): Promise<void> {
    await this.logActivity(action, entityType, entityId, {
      changes,
      timestamp: new Date().toISOString()
    });
  }

  // Logger une activité avec message personnalisé
  async logCustomActivity(
    message: string,
    level: 'info' | 'warning' | 'error' | 'success' = 'info',
    details?: any
  ): Promise<void> {
    await this.logActivity(message, 'custom', undefined, {
      level,
      ...details
    });
  }

  // Obtenir l'ID de session unique
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('activity_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('activity_session_id', sessionId);
    }
    return sessionId;
  }

  // Logger les activités de base automatiquement
  async logAuthActivity(action: string, user: UserProfile, details?: any): Promise<void> {
    await this.logActivity(`Auth: ${action}`, 'auth', user.id, {
      userEmail: user.email,
      userRole: user.role,
      ...details
    });
  }

  // Logger les activités CRUD
  async logCRUDActivity(
    operation: 'create' | 'update' | 'delete',
    entity: string,
    entityId: string,
    entityName?: string,
    details?: any
  ): Promise<void> {
    const actionMap = {
      create: `Création ${entity}`,
      update: `Modification ${entity}`,
      delete: `Suppression ${entity}`
    };

    await this.logActivity(actionMap[operation], entity, entityId, {
      entityName,
      operation,
      ...details
    });
  }

  // Logger les activités de paramètres
  async logSettingsActivity(
    action: string,
    category: string,
    oldValue?: any,
    newValue?: any
  ): Promise<void> {
    await this.logActivity(`Settings: ${action}`, 'settings', undefined, {
      category,
      oldValue,
      newValue,
      timestamp: new Date().toISOString()
    });
  }
}

export const activityLogger = new ActivityLogger();

// Helper function pour un accès direct
export const logActivity = (params: {
  action: string;
  cible?: string;
  cible_id?: string;
  details?: any;
}) => {
  return activityLogger.logActivity(params.action, params.cible, params.cible_id, params.details);
};
