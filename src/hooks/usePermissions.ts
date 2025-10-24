import { useState, useEffect, useCallback } from 'react';
import { permissionsService } from '@/services/permissionsService';
import type { UserPermissionsMap, ModuleType, PermissionRole } from '@/types';
import { PREDEFINED_ROLES, MODULES_INFO } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';

export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissionsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les permissions de l'utilisateur actuel
  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userPermissions = await permissionsService.getUserPermissions(user.id);
        setPermissions(userPermissions);
        setError(null);
      } catch (err: any) {
        console.error('Error loading permissions:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user?.id]);

  // Vérifier une permission spécifique
  const checkPermission = useCallback((
    module: ModuleType, 
    action: 'read' | 'create' | 'update' | 'delete'
  ): boolean => {
    // Les admins ont toutes les permissions
    if (user?.user_metadata?.role === 'admin') return true;
    
    // Si les permissions ne sont pas encore chargées, assumer l'accès pour éviter les flashs
    if (loading) return true;
    
    const modulePermissions = permissions[module];
    return modulePermissions?.[`can_${action}`] || false;
  }, [permissions, loading, user?.user_metadata?.role]);

  // Vérifier si l'utilisateur peut accéder à un module
  const canAccessModule = useCallback((module: ModuleType): boolean => {
    // Les admins ont tous les accès
    if (user?.user_metadata?.role === 'admin') return true;
    
    // Si les permissions ne sont pas encore chargées, assumer l'accès pour éviter les flashs
    if (loading) return true;
    
    return checkPermission(module, 'read');
  }, [permissions, loading, user?.user_metadata?.role]);

  // Mettre à jour une permission
  const updatePermission = useCallback(async (
    userId: string,
    module: ModuleType,
    newPermissions: {
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
    }
  ) => {
    try {
      await permissionsService.updatePermission(userId, module, newPermissions);
      showSuccess('Permission mise à jour avec succès');
      
      // Si c'est l'utilisateur actuel, recharger ses permissions
      if (userId === user?.id) {
        const updatedPermissions = await permissionsService.getUserPermissions(userId);
        setPermissions(updatedPermissions);
      }
    } catch (error: any) {
      console.error('Error updating permission:', error);
      showError(error.message || 'Erreur lors de la mise à jour de la permission');
    }
  }, [user?.id]);

  // Appliquer un rôle prédéfini
  const applyRole = useCallback(async (userId: string, roleName: string) => {
    try {
      await permissionsService.applyRole(userId, roleName);
      showSuccess(`Rôle "${roleName}" appliqué avec succès`);
      
      // Si c'est l'utilisateur actuel, recharger ses permissions
      if (userId === user?.id) {
        const updatedPermissions = await permissionsService.getUserPermissions(userId);
        setPermissions(updatedPermissions);
      }
    } catch (error: any) {
      console.error('Error applying role:', error);
      showError(error.message || 'Erreur lors de l\'application du rôle');
    }
  }, [user?.id]);

  // Obtenir les modules accessibles pour le menu
  const getAccessibleModules = useCallback(() => {
    // Les admins ont tous les accès
    if (user?.user_metadata?.role === 'admin') return MODULES_INFO;
    
    // Si les permissions ne sont pas encore chargées, retourner tous les modules pour éviter les flashs
    if (loading) return MODULES_INFO;
    
    return MODULES_INFO.filter(module => {
      // Si le module est admin-only et l'utilisateur n'est pas admin
      if (module.adminOnly && user?.user_metadata?.role !== 'admin') {
        return false;
      }
      
      // Vérifier la permission de lecture
      return canAccessModule(module.id);
    });
  }, [canAccessModule, loading, user?.user_metadata?.role]);

  return {
    permissions,
    loading,
    error,
    checkPermission,
    canAccessModule,
    updatePermission,
    applyRole,
    getAccessibleModules,
    modules: MODULES_INFO,
    predefinedRoles: PREDEFINED_ROLES
  };
};

// Hook pour gérer les permissions d'un autre utilisateur (pour les admins)
export const useUserPermissions = (userId: string) => {
  const [permissions, setPermissions] = useState<UserPermissionsMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        setLoading(true);
        const userPermissions = await permissionsService.getUserPermissions(userId);
        setPermissions(userPermissions);
      } catch (error: any) {
        console.error('Error loading user permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUserPermissions();
    }
  }, [userId]);

  const updatePermission = useCallback(async (
    module: ModuleType,
    newPermissions: {
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
    }
  ) => {
    try {
      await permissionsService.updatePermission(userId, module, newPermissions);
      setPermissions(prev => ({
        ...prev,
        [module]: newPermissions
      }));
    } catch (error: any) {
      throw error;
    }
  }, [userId]);

  const applyRole = useCallback(async (roleName: string) => {
    try {
      await permissionsService.applyRole(userId, roleName);
      const role = PREDEFINED_ROLES.find(r => r.name === roleName);
      if (role) {
        setPermissions(role.permissions);
      }
    } catch (error: any) {
      throw error;
    }
  }, [userId]);

  return {
    permissions,
    loading,
    updatePermission,
    applyRole
  };
};