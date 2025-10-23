import { supabase } from '@/integrations/supabase/client';
import type { UserPermission, UserPermissionsMap, ModuleType, PermissionRole } from '@/types';
import { PREDEFINED_ROLES } from '@/types';

export class PermissionsService {
  // Récupérer toutes les permissions d'un utilisateur
  async getUserPermissions(userId: string): Promise<UserPermissionsMap> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const permissions: UserPermissionsMap = {};
      data?.forEach(permission => {
        permissions[permission.module] = {
          can_read: permission.can_read,
          can_create: permission.can_create,
          can_update: permission.can_update,
          can_delete: permission.can_delete
        };
      });

      return permissions;
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
  async applyRole(userId: string, roleName: string): Promise<void> {
    try {
      const role = PREDEFINED_ROLES.find(r => r.name === roleName);
      if (!role) throw new Error(`Rôle ${roleName} non trouvé`);

      // Supprimer d'abord toutes les permissions existantes pour cet utilisateur
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Appliquer les nouvelles permissions
      const permissions = Object.entries(role.permissions).map(([module, perms]) => ({
        user_id: userId,
        module,
        ...perms
      }));

      const { error: insertError } = await supabase
        .from('user_permissions')
        .insert(permissions);

      if (insertError) throw insertError;
    } catch (error: any) {
      console.error('Error applying role:', error);
      throw error;
    }
  }

  // Vérifier si un utilisateur a une permission spécifique
  async checkPermission(
    userId: string, 
    module: ModuleType, 
    action: 'read' | 'create' | 'update' | 'delete'
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_permissions')
        .select(`can_${action}`)
        .eq('user_id', userId)
        .eq('module', module)
        .single();

      if (error) {
        // Si la permission n'existe pas, vérifier si c'est un admin
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        
        return profile?.role === 'admin';
      }

      return data?.[`can_${action}`] || false;
    } catch (error: any) {
      console.error('Error checking permission:', error);
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