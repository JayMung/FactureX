import { supabase } from '@/integrations/supabase/client';

export interface AdminRole {
  id: string;
  user_id: string;
  email: string;
  role: 'admin' | 'super_admin';
  granted_by: string;
  granted_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminInvitation {
  id: string;
  email: string;
  invitation_token: string;
  expires_at: string;
  accepted_at?: string;
  is_used: boolean;
  created_at: string;
}

export class AdminService {
  // Check if current user is admin
  async isCurrentUserAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // First check app_metadata (server-controlled, most reliable)
      const userRole = user.app_metadata?.role;
      if (userRole === 'admin' || userRole === 'super_admin') {
        return true;
      }

      // Fallback: Check secure admin_roles table
      const { data, error } = await supabase
        .from('admin_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('Error checking admin status:', error);
      }

      return !!data;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  // Get all admin roles (admin only)
  async getAllAdmins(): Promise<AdminRole[]> {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('is_active', true)
        .order('granted_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching admins:', error);
      throw error;
    }
  }

  // Grant admin role to a user (admin only)
  async grantAdminRole(email: string, role: 'admin' | 'super_admin' = 'admin'): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('grant_admin_role', {
        target_email: email,
        role_name: role
      });

      if (error) throw error;
      
      if (!data) {
        throw new Error('Failed to grant admin role');
      }
    } catch (error: any) {
      console.error('Error granting admin role:', error);
      throw error;
    }
  }

  // Revoke admin role from a user (admin only)
  async revokeAdminRole(userId: string): Promise<void> {
    try {
      const { data, error } = await supabase.rpc('revoke_admin_role', {
        target_user_id: userId
      });

      if (error) throw error;
      
      if (!data) {
        throw new Error('Failed to revoke admin role');
      }
    } catch (error: any) {
      console.error('Error revoking admin role:', error);
      throw error;
    }
  }

  // Create admin invitation (admin only)
  async createAdminInvitation(email: string): Promise<string> {
    try {
      const { data, error } = await supabase.rpc('create_admin_invitation', {
        target_email: email
      });

      if (error) throw error;
      
      if (!data) {
        throw new Error('Failed to create admin invitation');
      }

      return data;
    } catch (error: any) {
      console.error('Error creating admin invitation:', error);
      throw error;
    }
  }

  // Get admin invitations for current user
  async getUserInvitations(): Promise<AdminInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  }

  // Accept admin invitation
  async acceptAdminInvitation(token: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('invitation_token', token)
        .eq('is_used', false)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Verify email matches
      if (invitation.email !== user.email) {
        throw new Error('Invitation email does not match your email');
      }

      // Grant admin role
      await this.grantAdminRole(user.email, 'admin');

      // Mark invitation as used
      const { error: updateError } = await supabase
        .from('admin_invitations')
        .update({ 
          is_used: true, 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

    } catch (error: any) {
      console.error('Error accepting admin invitation:', error);
      throw error;
    }
  }

  // Get admin role details for a user
  async getAdminRole(userId: string): Promise<AdminRole | null> {
    try {
      const { data, error } = await supabase
        .from('admin_roles')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        throw error;
      }

      return data;
    } catch (error: any) {
      console.error('Error fetching admin role:', error);
      throw error;
    }
  }

  // Check if any admins exist (for first-time setup)
  async hasAnyAdmins(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('admin_roles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      if (error) throw error;
      
      return (count || 0) > 0;
    } catch (error: any) {
      console.error('Error checking admin existence:', error);
      return false;
    }
  }
}

export const adminService = new AdminService();
