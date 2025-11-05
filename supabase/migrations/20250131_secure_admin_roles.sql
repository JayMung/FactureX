-- Secure Admin Roles Management
-- This migration creates a secure system for managing admin roles
-- that cannot be manipulated by users and requires proper authorization

-- Create admin_roles table for secure role management
CREATE TABLE IF NOT EXISTS admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique user_id for active roles using unique index
    CONSTRAINT unique_admin_user UNIQUE (user_id, email)
);

-- Create admin_invitations table for secure admin account creation
CREATE TABLE IF NOT EXISTS admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    invited_by UUID REFERENCES auth.users(id),
    invitation_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_roles
-- Only existing admins can view admin roles
CREATE POLICY "Admins can view all admin roles" ON admin_roles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Only existing admins can insert new admin roles
CREATE POLICY "Admins can create admin roles" ON admin_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Only existing admins can update admin roles
CREATE POLICY "Admins can update admin roles" ON admin_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admin_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Only existing admins can delete admin roles (but not themselves)
CREATE POLICY "Admins can delete admin roles" ON admin_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM admin_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
        AND user_id != auth.uid() -- Cannot delete themselves
    );

-- RLS Policies for admin_invitations
-- Only existing admins can manage invitations
CREATE POLICY "Admins can manage invitations" ON admin_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_roles 
            WHERE user_id = auth.uid() 
            AND is_active = true
        )
    );

-- Users can view their own invitations
CREATE POLICY "Users can view own invitations" ON admin_invitations
    FOR SELECT USING (
        email = (
            SELECT email FROM auth.users 
            WHERE id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_email ON admin_roles(email);
CREATE INDEX IF NOT EXISTS idx_admin_roles_active ON admin_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_expires ON admin_invitations(expires_at);

-- Function to check if user is admin (for use in other RLS policies)
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM admin_roles 
        WHERE user_id = user_uuid 
        AND is_active = true
    );
$$;

-- Function to grant admin role (secure, requires existing admin)
CREATE OR REPLACE FUNCTION grant_admin_role(
    target_email TEXT,
    role_name TEXT DEFAULT 'admin',
    granted_by_uuid UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
    existing_admin BOOLEAN;
BEGIN
    -- Check if caller is admin
    SELECT EXISTS (
        SELECT 1 FROM admin_roles 
        WHERE user_id = granted_by_uuid 
        AND is_active = true
    ) INTO existing_admin;
    
    IF NOT existing_admin THEN
        RAISE EXCEPTION 'Only existing admins can grant admin roles';
    END IF;
    
    -- Validate role name
    IF role_name NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Invalid role name';
    END IF;
    
    -- Get target user ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % does not exist', target_email;
    END IF;
    
    -- Insert or update admin role
    INSERT INTO admin_roles (user_id, email, role, granted_by)
    VALUES (target_user_id, target_email, role_name, granted_by_uuid)
    ON CONFLICT (user_id, email)
    DO UPDATE SET 
        role = role_name,
        granted_by = granted_by_uuid,
        granted_at = NOW(),
        is_active = true;
    
    -- Update user's app_metadata for client-side checks
    UPDATE auth.users 
    SET app_metadata = COALESCE(app_metadata, '{}') || jsonb_build_object('role', role_name)
    WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- Function to revoke admin role (secure, requires existing admin)
CREATE OR REPLACE FUNCTION revoke_admin_role(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    caller_admin BOOLEAN;
BEGIN
    -- Check if caller is admin
    SELECT EXISTS (
        SELECT 1 FROM admin_roles 
        WHERE user_id = auth.uid() 
        AND is_active = true
    ) INTO caller_admin;
    
    IF NOT caller_admin THEN
        RAISE EXCEPTION 'Only existing admins can revoke admin roles';
    END IF;
    
    -- Cannot revoke yourself
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot revoke your own admin role';
    END IF;
    
    -- Deactivate admin role
    UPDATE admin_roles 
    SET is_active = false,
        updated_at = NOW()
    WHERE user_id = target_user_id AND is_active = true;
    
    -- Remove from app_metadata
    UPDATE auth.users 
    SET app_metadata = COALESCE(app_metadata, '{}') - 'role'
    WHERE id = target_user_id;
    
    RETURN TRUE;
END;
$$;

-- Function to create admin invitation
CREATE OR REPLACE FUNCTION create_admin_invitation(target_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_token TEXT;
    caller_admin BOOLEAN;
BEGIN
    -- Check if caller is admin
    SELECT EXISTS (
        SELECT 1 FROM admin_roles 
        WHERE user_id = auth.uid() 
        AND is_active = true
    ) INTO caller_admin;
    
    IF NOT caller_admin THEN
        RAISE EXCEPTION 'Only existing admins can create invitations';
    END IF;
    
    -- Generate secure token
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Insert invitation (expires in 7 days)
    INSERT INTO admin_invitations (email, invitation_token, expires_at, invited_by)
    VALUES (target_email, invitation_token, NOW() + INTERVAL '7 days', auth.uid())
    ON CONFLICT (email) DO UPDATE SET
        invitation_token = invitation_token,
        expires_at = NOW() + INTERVAL '7 days',
        invited_by = auth.uid(),
        is_used = false,
        created_at = NOW();
    
    RETURN invitation_token;
END;
$$;

-- Create initial admin if none exists (for first-time setup)
-- This should only be run once during initial deployment
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count FROM admin_roles WHERE is_active = true;
    
    IF admin_count = 0 THEN
        -- Create initial admin for the first super admin user
        -- This should be replaced with a secure manual process
        RAISE NOTICE 'No admin users found. Please create initial admin manually using grant_admin_role() function.';
    END IF;
END $$;
