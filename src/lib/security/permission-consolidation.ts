/**
 * Permission System Consolidation - Single Source of Truth
 * 
 * Architecture unifiée (2026-02-21):
 * 1. app_metadata.role = source canonique (server-controlled, JWT)
 * 2. admin_roles table = audit trail uniquement (granted_by, granted_at)
 * 3. profiles.role = cache lecture seule (non-admin uniquement)
 * 4. set_user_role() RPC = seul point d'écriture de rôle
 *
 * Décisions d'autorisation: UNIQUEMENT via app_metadata (is_admin() SQL helper)
 */

import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/lib/security/error-handling';
import { PREDEFINED_ROLES } from '@/types';

export interface ConsolidatedPermission {
  user_id: string;
  is_admin: boolean;
  admin_role?: 'admin' | 'super_admin';
  permissions: Record<string, {
    can_read: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  }>;
  last_sync: string;
}

export class PermissionConsolidationService {
  
  /**
   * Get user permissions from single source of truth (admin_roles)
   * This eliminates inconsistencies between multiple permission tables
   */
  async getUserPermissions(userId: string): Promise<ConsolidatedPermission> {
    try {
      // PRIMARY SOURCE OF TRUTH: app_metadata via get_user_role() RPC
      // Falls back to admin_roles for audit trail cross-check
      const { data: { user } } = await supabase.auth.getUser();

      // For current user: read directly from JWT app_metadata (no DB round-trip)
      let effectiveRole: string | undefined;
      if (user?.id === userId) {
        effectiveRole = user.app_metadata?.role as string | undefined;
      } else {
        // For other users (admin viewing): use get_user_role RPC
        const { data: roleData } = await supabase.rpc('get_user_role', { p_user_id: userId });
        effectiveRole = roleData as string | undefined;
      }

      const isAdmin = effectiveRole === 'admin' || effectiveRole === 'super_admin';
      const adminRoleType = isAdmin ? effectiveRole as 'admin' | 'super_admin' : undefined;

      // If admin, return permissions based on PREDEFINED_ROLES
      if (isAdmin && adminRoleType) {
        const allPermissions = this.getAdminModulePermissions(adminRoleType);
        return {
          user_id: userId,
          is_admin: true,
          admin_role: adminRoleType,
          permissions: allPermissions,
          last_sync: new Date().toISOString()
        };
      }

      // If not admin, get specific permissions from user_permissions
      const { data: userPermissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      if (permError) throw permError;

      const permissions: Record<string, any> = {};
      userPermissions?.forEach(perm => {
        permissions[perm.module] = {
          can_read: perm.can_read,
          can_create: perm.can_create,
          can_update: perm.can_update,
          can_delete: perm.can_delete
        };
      });

      return {
        user_id: userId,
        is_admin: false,
        permissions,
        last_sync: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Error getting user permissions:', error);
      
      // Log security event for permission check failure
      logSecurityEvent(
        'PERMISSION_CHECK_FAILED',
        `Failed to check permissions for user ${userId}`,
        'medium',
        { userId, error: error.message }
      );
      
      throw error;
    }
  }

  /**
   * Check specific permission with single source of truth
   */
  async checkPermission(
    userId: string, 
    module: string, 
    action: 'read' | 'create' | 'update' | 'delete'
  ): Promise<boolean> {
    try {
      const userPerms = await this.getUserPermissions(userId);
      
      // Admins have all permissions
      if (userPerms.is_admin) {
        return true;
      }

      // Check specific permission
      return userPerms.permissions[module]?.[`can_${action}`] || false;
    } catch (error) {
      console.error('Error checking permission:', error);
      
      // Fail secure: deny access on error
      logSecurityEvent(
        'PERMISSION_CHECK_ERROR',
        `Permission check failed for ${userId}/${module}/${action}`,
        'high',
        { userId, module, action }
      );
      
      return false;
    }
  }

  /**
   * Atomic role application - prevents race conditions
   */
  async applyRoleAtomic(userId: string, roleName: string, grantedBy: string): Promise<void> {
    try {
      // UNIFIED: Use set_user_role RPC — updates app_metadata + profiles + admin_roles atomically
      const { data, error } = await supabase.rpc('set_user_role', {
        p_target_user_id: userId,
        p_role: roleName
      });

      if (error) throw error;

      // Force session refresh for the target user to prevent stale JWT
      await this.forceSessionRefresh(userId);

      logSecurityEvent(
        'ROLE_APPLIED',
        `Role ${roleName} applied to user ${userId}`,
        'medium',
        { userId, roleName, grantedBy }
      );
    } catch (error: any) {
      console.error('Error applying role atomically:', error);
      
      logSecurityEvent(
        'ROLE_APPLICATION_FAILED',
        `Failed to apply role ${roleName} to user ${userId}`,
        'high',
        { userId, roleName, error: error.message }
      );
      
      throw error;
    }
  }

  /**
   * Atomic role revocation - prevents race conditions
   */
  async revokeRoleAtomic(userId: string, revokedBy: string): Promise<void> {
    try {
      // UNIFIED: Downgrade to operateur via set_user_role RPC
      const { data, error } = await supabase.rpc('set_user_role', {
        p_target_user_id: userId,
        p_role: 'operateur'
      });

      if (error) throw error;

      // Force session refresh for the target user to prevent stale JWT
      await this.forceSessionRefresh(userId);

      logSecurityEvent(
        'ROLE_REVOKED',
        `Role revoked from user ${userId}`,
        'medium',
        { userId, revokedBy }
      );
    } catch (error: any) {
      console.error('Error revoking role atomically:', error);
      
      logSecurityEvent(
        'ROLE_REVOCATION_FAILED',
        `Failed to revoke role from user ${userId}`,
        'high',
        { userId, error: error.message }
      );
      
      throw error;
    }
  }

  /**
   * Synchronize permissions across all tables
   * Ensures consistency and eliminates privilege escalation
   */
  async syncPermissions(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('sync_user_permissions', {
        target_user_id: userId
      });

      if (error) throw error;

      // Log synchronization
      logSecurityEvent(
        'PERMISSIONS_SYNCED',
        `Permissions synchronized for user ${userId}`,
        'low',
        { userId }
      );
    } catch (error: any) {
      console.error('Error syncing permissions:', error);
      
      logSecurityEvent(
        'PERMISSION_SYNC_FAILED',
        `Failed to sync permissions for user ${userId}`,
        'medium',
        { userId, error: error.message }
      );
      
      throw error;
    }
  }

  /**
   * Validate permission consistency across all tables
   */
  async validatePermissionConsistency(userId: string): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    try {
      const { data, error } = await supabase.rpc('validate_permission_consistency', {
        target_user_id: userId
      });

      if (error) throw error;

      const issues = data?.issues || [];
      const isConsistent = issues.length === 0;

      if (!isConsistent) {
        logSecurityEvent(
          'PERMISSION_INCONSISTENCY',
          `Permission inconsistency detected for user ${userId}`,
          'high',
          { userId, issues }
        );
      }

      return { isConsistent, issues };
    } catch (error: any) {
      console.error('Error validating permission consistency:', error);
      
      return {
        isConsistent: false,
        issues: [`Validation failed: ${error.message}`]
      };
    }
  }

  /**
   * Get all module permissions for admin users based on their specific role
   */
  private getAdminModulePermissions(role: 'admin' | 'super_admin'): Record<string, any> {
    const roleConfig = PREDEFINED_ROLES.find(r => r.name === role);
    if (roleConfig) {
      return roleConfig.permissions;
    }

    // Fallback to super_admin permissions if role not found (shouldn't happen)
    return {
      'clients': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'finances': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'factures': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'colis': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'settings': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'payment_methods': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'exchange_rates': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'transaction_fees': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'users': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'profile': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'reports': { can_read: true, can_create: true, can_update: true, can_delete: true },
      'activity_logs': { can_read: true, can_create: false, can_update: false, can_delete: false },
      'security_logs': { can_read: true, can_create: false, can_update: false, can_delete: false }
    };
  }

  /**
   * Remove admin role from profiles table (security cleanup)
   */
  async cleanupProfileRoles(): Promise<void> {
    try {
      // Remove admin roles from profiles table to eliminate privilege escalation
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'operateur' })
        .in('role', ['admin', 'super_admin']);

      if (error) throw error;

      logSecurityEvent(
        'PROFILE_ROLES_CLEANED',
        'Admin roles removed from profiles table',
        'medium',
        {}
      );
    } catch (error: any) {
      console.error('Error cleaning up profile roles:', error);
      
      logSecurityEvent(
        'PROFILE_CLEANUP_FAILED',
        'Failed to cleanup admin roles from profiles',
        'high',
        { error: error.message }
      );
      
      throw error;
    }
  }

  /**
   * Force session refresh for a user to prevent stale JWT issues
   */
  async forceSessionRefresh(userId: string): Promise<void> {
    try {
      // Call the RPC function to update app_metadata and trigger refresh
      const { error } = await supabase.rpc('force_session_refresh', {
        target_user_id: userId
      });

      if (error) {
        console.warn('Failed to force session refresh:', error);
        // Don't throw error - this is a best-effort operation
      }
    } catch (error: any) {
      console.warn('Error forcing session refresh:', error);
      // Don't throw error - this is a best-effort operation
    }
  }
}

export const permissionConsolidationService = new PermissionConsolidationService();
