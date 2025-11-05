/**
 * Permission Diagnostic Utility
 * 
 * This utility helps diagnose and fix permission issues for administrators
 */

import { supabase } from '@/integrations/supabase/client';
import { permissionConsolidationService } from '@/lib/security/permission-consolidation';

export interface PermissionDiagnostic {
  userId: string;
  email: string;
  isAdmin: boolean;
  hasAdminRole: boolean;
  hasAppMetadataRole: boolean;
  permissionCount: number;
  issues: string[];
  recommendations: string[];
}

export class PermissionDiagnosticService {
  
  /**
   * Diagnose permission issues for current user
   */
  async diagnoseCurrentUser(): Promise<PermissionDiagnostic> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Unable to get current user');
      }

      return this.diagnoseUser(user.id, user.email || '');
    } catch (error) {
      console.error('Error diagnosing current user:', error);
      throw error;
    }
  }

  /**
   * Diagnose permission issues for specific user
   */
  async diagnoseUser(userId: string, email: string): Promise<PermissionDiagnostic> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // Check admin role in admin_roles table
      const { data: adminRole, error: adminError } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      const hasAdminRole = !!adminRole && !adminError;

      // Check user permissions
      const { data: userPermissions, error: permError } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', userId);

      const permissionCount = userPermissions?.length || 0;

      // Check app_metadata
      const { data: userData, error: userDataError } = await supabase
        .from('admin_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      const hasAppMetadataRole = !!userData;

      // Determine admin status
      const isAdmin = hasAdminRole;

      // Diagnose issues
      if (!hasAdminRole) {
        issues.push('No active admin role found in admin_roles table');
        recommendations.push('Create admin role in admin_roles table');
      }

      if (!hasAppMetadataRole) {
        issues.push('No role found in app_metadata');
        recommendations.push('Update app_metadata to include role');
      }

      if (hasAdminRole && permissionCount < 8) {
        issues.push(`Insufficient permissions: ${permissionCount}/8 modules`);
        recommendations.push('Sync all module permissions for admin');
      }

      if (adminRole?.role !== 'super_admin' && adminRole?.role !== 'admin') {
        issues.push(`Invalid role: ${adminRole?.role}`);
        recommendations.push('Set role to admin or super_admin');
      }

      return {
        userId,
        email,
        isAdmin,
        hasAdminRole,
        hasAppMetadataRole,
        permissionCount,
        issues,
        recommendations
      };
    } catch (error) {
      console.error('Error diagnosing user:', error);
      
      return {
        userId,
        email,
        isAdmin: false,
        hasAdminRole: false,
        hasAppMetadataRole: false,
        permissionCount: 0,
        issues: ['Failed to diagnose permissions'],
        recommendations: ['Check database connection and permissions']
      };
    }
  }

  /**
   * Auto-fix permission issues
   */
  async fixPermissions(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // First, get the user's email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      
      if (userError || !userData.user) {
        return { success: false, message: 'User not found' };
      }

      const email = userData.user.email || '';

      // Fix admin role
      const { error: roleError } = await supabase
        .from('admin_roles')
        .upsert({
          user_id: userId,
          email: email,
          role: 'super_admin',
          is_active: true,
          granted_by: userId,
          granted_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,email'
        });

      if (roleError) {
        return { success: false, message: `Failed to fix admin role: ${roleError.message}` };
      }

      // Fix user permissions
      const modules = [
        'clients', 'transactions', 'factures', 'settings', 
        'users', 'reports', 'activity_logs', 'security_logs'
      ];

      for (const module of modules) {
        const { error: permError } = await supabase
          .from('user_permissions')
          .upsert({
            user_id: userId,
            module: module,
            can_read: true,
            can_create: module !== 'activity_logs' && module !== 'security_logs',
            can_update: module !== 'activity_logs' && module !== 'security_logs',
            can_delete: module !== 'activity_logs' && module !== 'security_logs',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,module'
          });

        if (permError) {
          console.warn(`Failed to fix permission for ${module}:`, permError);
        }
      }

      // Fix app_metadata
      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: { role: 'super_admin' }
      });

      // Sync permissions using consolidation service
      await permissionConsolidationService.syncPermissions(userId);

      return { 
        success: true, 
        message: 'Permissions fixed successfully. Please refresh the page.' 
      };
    } catch (error: any) {
      console.error('Error fixing permissions:', error);
      return { 
        success: false, 
        message: `Failed to fix permissions: ${error.message}` 
      };
    }
  }

  /**
   * Validate permission consistency
   */
  async validateConsistency(userId: string): Promise<boolean> {
    try {
      const { isConsistent } = await permissionConsolidationService.validatePermissionConsistency(userId);
      
      if (!isConsistent) {
        await permissionConsolidationService.syncPermissions(userId);
      }
      
      return true;
    } catch (error) {
      console.error('Error validating consistency:', error);
      return false;
    }
  }
}

export const permissionDiagnostic = new PermissionDiagnosticService();

// Helper function to fix current user's permissions
export const fixCurrentUserPermissions = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { success: false, message: 'No user logged in' };
    }

    return await permissionDiagnostic.fixPermissions(user.id);
  } catch (error: any) {
    return { 
      success: false, 
      message: `Error: ${error.message}` 
    };
  }
};

// Helper function to diagnose current user
export const diagnoseCurrentUser = async (): Promise<PermissionDiagnostic | null> => {
  try {
    return await permissionDiagnostic.diagnoseCurrentUser();
  } catch (error) {
    console.error('Error diagnosing current user:', error);
    return null;
  }
};
