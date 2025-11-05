import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { permissionsService } from '@/services/permissionsService';
import { adminService } from '@/services/adminService';
import { permissionConsolidationService } from '@/lib/security/permission-consolidation';
import type { UserPermissionsMap, ModuleType, PermissionRole } from '@/types';
import { PREDEFINED_ROLES, MODULES_INFO } from '@/types';
import { useAuth } from '@/components/auth/AuthProvider';
import { showSuccess, showError } from '@/utils/toast';

// Cache global pour les permissions (évite les rechargements inutiles)
const permissionsCache = new Map<string, { permissions: UserPermissionsMap; isAdmin: boolean; timestamp: number }>();
const CACHE_DURATION = 60 * 1000; // 60s to reduce perceived staleness after role changes

export const usePermissions = () => {
  const { user, isAdmin: authIsAdmin } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissionsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Charger les permissions de l'utilisateur actuel
  useEffect(() => {
    const loadPermissions = async () => {

      if (!user?.id) {
        setLoading(false);
        return;
      }
      
      // Vérifier le cache d'abord
      const cached = permissionsCache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setPermissions(cached.permissions);
        setIsAdmin(cached.isAdmin);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // SECURITY: Use consolidated permission service for single source of truth
        const consolidatedPerms = await permissionConsolidationService.getUserPermissions(user.id);
        
        setPermissions(consolidatedPerms.permissions);
        setIsAdmin(consolidatedPerms.is_admin);
        
        // Mettre en cache
        permissionsCache.set(user.id, {
          permissions: consolidatedPerms.permissions,
          isAdmin: consolidatedPerms.is_admin,
          timestamp: Date.now()
        });
        
        // Validation en arrière-plan (ne bloque pas l'UI)
        permissionConsolidationService.validatePermissionConsistency(user.id).then(({ isConsistent, issues }) => {
          if (!isConsistent) {
            console.warn('Permission inconsistency detected:', issues);
            // Auto-sync en arrière-plan
            permissionConsolidationService.syncPermissions(user.id).then(() => {
              // Invalider le cache pour forcer un rechargement au prochain accès
              permissionsCache.delete(user.id);
            });
          }
        });
        
        setError(null);
      } catch (err: any) {
        console.error('Error loading permissions:', err);
        setError(err.message);
        // SECURITY: Fail secure - deny admin access on error
        setIsAdmin(false);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user?.id]);

  // Realtime: listen to permission changes for current user and invalidate cache + reload
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to both admin_roles and user_permissions for this user
    const channel = supabase
      .channel(`permissions:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_roles', filter: `user_id=eq.${user.id}` },
        () => {
          permissionsCache.delete(user.id);
          // Soft reload in background
          permissionConsolidationService.getUserPermissions(user.id).then((consolidatedPerms) => {
            setPermissions(consolidatedPerms.permissions);
            setIsAdmin(consolidatedPerms.is_admin);
          }).catch(() => {/* ignore */});
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_permissions', filter: `user_id=eq.${user.id}` },
        () => {
          permissionsCache.delete(user.id);
          permissionConsolidationService.getUserPermissions(user.id).then((consolidatedPerms) => {
            setPermissions(consolidatedPerms.permissions);
            setIsAdmin(consolidatedPerms.is_admin);
          }).catch(() => {/* ignore */});
        }
      )
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user?.id]);

  // Vérifier une permission spécifique
  const checkPermission = useCallback((
    module: ModuleType, 
    action: 'read' | 'create' | 'update' | 'delete'
  ): boolean => {
    // Les admins ont toutes les permissions (vérification sécurisée via adminService)
    if (isAdmin) return true;
    
    // SECURITY: Si les permissions ne sont pas encore chargées, refuser l'accès aux actions sensibles
    // Seule la lecture peut être autorisée pendant le chargement
    if (loading) {
      return action === 'read';
    }
    
    const modulePermissions = permissions[module];
    return modulePermissions?.[`can_${action}`] || false;
  }, [permissions, loading, isAdmin]);

  // Vérifier si l'utilisateur peut accéder à un module
  const canAccessModule = useCallback((module: ModuleType): boolean => {
    // Les admins ont tous les accès (vérification sécurisée)
    if (isAdmin) return true;
    
    // Pendant le chargement, autoriser uniquement la lecture
    if (loading) return true;
    
    return checkPermission(module, 'read');
  }, [checkPermission, loading, isAdmin]);

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
      
      // Invalider le cache pour cet utilisateur
      permissionsCache.delete(userId);
      
      // Si c'est l'utilisateur actuel, recharger ses permissions via le service de consolidation
      if (userId === user?.id) {
        const consolidatedPerms = await permissionConsolidationService.getUserPermissions(userId);
        setPermissions(consolidatedPerms.permissions);
        setIsAdmin(consolidatedPerms.is_admin);
      }
    } catch (error: any) {
      console.error('Error updating permission:', error);
      showError(error.message || 'Erreur lors de la mise à jour de la permission');
      throw error;
    }
  }, [user?.id]);

  // Appliquer un rôle prédéfini
  const applyRole = useCallback(async (userId: string, roleName: string) => {
    try {
      await permissionsService.applyRole(userId, roleName);
      showSuccess(`Rôle "${roleName}" appliqué avec succès`);
      
      // Invalider le cache pour cet utilisateur
      permissionsCache.delete(userId);
      
      // Si c'est l'utilisateur actuel, recharger ses permissions via le service de consolidation
      if (userId === user?.id) {
        const consolidatedPerms = await permissionConsolidationService.getUserPermissions(userId);
        setPermissions(consolidatedPerms.permissions);
        setIsAdmin(consolidatedPerms.is_admin);
      }
    } catch (error: any) {
      console.error('Error applying role:', error);
      showError(error.message || 'Erreur lors de l\'application du rôle');
    }
  }, [user?.id]);

  // Obtenir les modules accessibles pour le menu
  const getAccessibleModules = useCallback(() => {
    // Les admins ont tous les accès (vérification sécurisée)
    if (isAdmin) return MODULES_INFO;
    
    // Si les permissions ne sont pas encore chargées, retourner tous les modules pour éviter les flashs
    if (loading) return MODULES_INFO;
    
    return MODULES_INFO.filter(module => {
      // Si le module est admin-only et l'utilisateur n'est pas admin
      if (module.adminOnly && !isAdmin) {
        return false;
      }
      
      // Vérifier la permission de lecture
      return canAccessModule(module.id);
    });
  }, [canAccessModule, loading, isAdmin]);

  return {
    permissions,
    loading,
    error,
    isAdmin,
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
      // Invalider le cache
      permissionsCache.delete(userId);
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