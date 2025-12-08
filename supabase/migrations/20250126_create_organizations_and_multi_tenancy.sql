-- Migration: Create Organizations and Multi-Tenancy
-- Date: 2025-01-26
-- Description: Add organization support for data isolation between tenants

-- ============================================================================
-- STEP 1: Create organizations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "organizations_select_policy" ON public.organizations 
FOR SELECT TO authenticated 
USING (
  id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "organizations_update_policy" ON public.organizations 
FOR UPDATE TO authenticated 
USING (
  id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  ) AND
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ============================================================================
-- STEP 2: Add organization_id to profiles table
-- ============================================================================

-- Add organization_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Create default organization for existing users
-- ============================================================================

-- Insert default organization if it doesn't exist
INSERT INTO public.organizations (id, name) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
ON CONFLICT (id) DO NOTHING;

-- Update existing profiles without organization
UPDATE public.profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- Make organization_id NOT NULL after migration
ALTER TABLE public.profiles 
ALTER COLUMN organization_id SET NOT NULL;

-- ============================================================================
-- STEP 4: Add organization_id to all data tables
-- ============================================================================

-- Clients table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'clients' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.clients 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    
    -- Set default organization for existing records
    UPDATE public.clients 
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
    
    ALTER TABLE public.clients 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Transactions table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.transactions 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    
    UPDATE public.transactions 
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
    
    ALTER TABLE public.transactions 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Factures table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'factures' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.factures 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    
    UPDATE public.factures 
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
    
    ALTER TABLE public.factures 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Settings table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'settings' 
    AND column_name = 'organization_id'
  ) THEN
    ALTER TABLE public.settings 
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id);
    
    UPDATE public.settings 
    SET organization_id = '00000000-0000-0000-0000-000000000001'
    WHERE organization_id IS NULL;
    
    ALTER TABLE public.settings 
    ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_organization_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_factures_organization_id ON public.factures(organization_id);
CREATE INDEX IF NOT EXISTS idx_settings_organization_id ON public.settings(organization_id);

-- ============================================================================
-- STEP 6: Update RLS policies for data isolation
-- ============================================================================

-- Helper function to get user's organization_id
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- CLIENTS TABLE POLICIES
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
CREATE POLICY "clients_select_policy" ON public.clients 
FOR SELECT TO authenticated 
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
CREATE POLICY "clients_insert_policy" ON public.clients 
FOR INSERT TO authenticated 
WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
CREATE POLICY "clients_update_policy" ON public.clients 
FOR UPDATE TO authenticated 
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;
CREATE POLICY "clients_delete_policy" ON public.clients 
FOR DELETE TO authenticated 
USING (
  organization_id = public.get_user_organization_id() AND
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- TRANSACTIONS TABLE POLICIES
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
CREATE POLICY "transactions_select_policy" ON public.transactions 
FOR SELECT TO authenticated 
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
CREATE POLICY "transactions_insert_policy" ON public.transactions 
FOR INSERT TO authenticated 
WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
CREATE POLICY "transactions_update_policy" ON public.transactions 
FOR UPDATE TO authenticated 
USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;
CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated 
USING (
  organization_id = public.get_user_organization_id() AND
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- FACTURES TABLE POLICIES
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.factures;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.factures;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.factures;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.factures;

CREATE POLICY "factures_select_policy" ON public.factures 
FOR SELECT TO authenticated 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "factures_insert_policy" ON public.factures 
FOR INSERT TO authenticated 
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "factures_update_policy" ON public.factures 
FOR UPDATE TO authenticated 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "factures_delete_policy" ON public.factures 
FOR DELETE TO authenticated 
USING (
  organization_id = public.get_user_organization_id() AND
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- SETTINGS TABLE POLICIES
DROP POLICY IF EXISTS "settings_select_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_update_policy" ON public.settings;

CREATE POLICY "settings_select_policy" ON public.settings 
FOR SELECT TO authenticated 
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "settings_insert_policy" ON public.settings 
FOR INSERT TO authenticated 
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY "settings_update_policy" ON public.settings 
FOR UPDATE TO authenticated 
USING (organization_id = public.get_user_organization_id());

-- ============================================================================
-- STEP 7: Update trigger to set organization for new profiles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_with_organization()
RETURNS TRIGGER AS $$
DECLARE
  default_org_id UUID;
BEGIN
  -- Get or create default organization
  SELECT id INTO default_org_id 
  FROM public.organizations 
  WHERE id = '00000000-0000-0000-0000-000000000001';
  
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (id, name) 
    VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization')
    RETURNING id INTO default_org_id;
  END IF;
  
  -- Insert profile with default organization
  INSERT INTO public.profiles (id, email, organization_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    default_org_id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_with_organization();

-- ============================================================================
-- STEP 8: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE public.organizations IS 'Organizations table for multi-tenancy support';
COMMENT ON FUNCTION public.get_user_organization_id() IS 'Helper function to get the current user organization ID for RLS policies';
COMMENT ON FUNCTION public.handle_new_user_with_organization() IS 'Automatically creates profile with default organization for new users';
