import { supabase } from '@/integrations/supabase/client';
import { adminService } from '@/services/adminService';
import { permissionConsolidationService } from '@/lib/security/permission-consolidation';
import type { UserPermission, UserPermissionsMap, ModuleType, PermissionRole } from '@/types';
import { PREDEFINED_ROLES } from '@/types';

export class PermissionsService {
  // Récupérer toutes les permissions d'un utilisateur
  // SECURITY: Now uses single source of truth
  async getUserPermissions(userId: string): Promise<UserPermissionsMap> {
    try {
      // Use consolidated permission service for security
      const consolidatedPerms = await permissionConsolidationService.getUserPermissions(userId);
      return consolidatedPerms.permissions;
    } catch (error: any) {
      console.error('Error fetching user permissions:', error);
      throw error;
    }
  }

  // Mettre à jour les permissions d'un utilisateur pour un module
  async updatePermission(
    userId: string, 
    module: ModuleType, 
    permissions: {
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
    }
  ): Promise<void> {
    try {
      // Utiliser upsert pour mettre à jour ou insérer (pas d'erreur de duplicate)
      const { error } = await supabase
        .from('user_permissions')
        .upsert({
          user_id: userId,
          module,
          ...permissions,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,module', // Spécifier les colonnes pour la contrainte unique
          ignoreDuplicates: false // Mettre à jour les lignes existantes
        });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error updating permission:', error);
      throw error;
    }
  }

  // Appliquer un rôle prédéfini à un utilisateur
  // SECURITY: Now uses atomic operations to prevent race conditions
  async applyRole(userId: string, roleName: string): Promise<void> {
    try {
      // Get current user for audit trail
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Use atomic role application to prevent race conditions
      await permissionConsolidationService.applyRoleAtomic(userId, roleName, user.id);
    } catch (error: any) {
      console.error('Error applying role:', error);
      throw error;
    }
  }

  // Vérifier si un utilisateur a une permission spécifique
  // SECURITY: Now uses single source of truth, no fallback to insecure profiles.role
  async checkPermission(
    userId: string, 
    module: ModuleType, 
    action: 'read' | 'create' | 'update' | 'delete'
  ): Promise<boolean> {
    try {
      // Use consolidated permission service for security
      return await permissionConsolidationService.checkPermission(userId, module, action);
    } catch (error: any) {
      console.error('Error checking permission:', error);
      
      // SECURITY: Fail secure - deny access on error
      // No fallback to insecure profiles.role
      return false;
    }
  }

  // Récupérer toutes les permissions de tous les utilisateurs (pour les admins)
  async getAllUsersPermissions(): Promise<Array<{ user: any; permissions: UserPermissionsMap }>> {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      const result = [];
      
      for (const profile of profiles || []) {
        const permissions = await this.getUserPermissions(profile.id);
        result.push({
          user: profile,
          permissions
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error fetching all users permissions:', error);
      throw error;
    }
  }
}

export const permissionsService = new PermissionsService();