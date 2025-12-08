-- Fix RLS Policies to be more restrictive with organization-based access
-- This migration replaces permissive USING (true) with proper organization checks

-- Drop existing permissive policies for clients
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- Create restrictive policies for clients
CREATE POLICY "clients_select_policy" ON public.clients 
FOR SELECT TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "clients_insert_policy" ON public.clients 
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "clients_update_policy" ON public.clients 
FOR UPDATE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "clients_delete_policy" ON public.clients 
FOR DELETE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin'
);

-- Drop existing permissive policies for transactions
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- Create restrictive policies for transactions
CREATE POLICY "transactions_select_policy" ON public.transactions 
FOR SELECT TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "transactions_insert_policy" ON public.transactions 
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "transactions_update_policy" ON public.transactions 
FOR UPDATE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin'
);

-- Drop existing permissive policies for factures
DROP POLICY IF EXISTS "factures_select_policy" ON public.factures;
DROP POLICY IF EXISTS "factures_insert_policy" ON public.factures;
DROP POLICY IF EXISTS "factures_update_policy" ON public.factures;
DROP POLICY IF EXISTS "factures_delete_policy" ON public.factures;

-- Create restrictive policies for factures
CREATE POLICY "factures_select_policy" ON public.factures 
FOR SELECT TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "factures_insert_policy" ON public.factures 
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "factures_update_policy" ON public.factures 
FOR UPDATE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "factures_delete_policy" ON public.factures 
FOR DELETE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin'
);

-- Drop existing permissive policies for settings
DROP POLICY IF EXISTS "settings_select_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_insert_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_update_policy" ON public.settings;
DROP POLICY IF EXISTS "settings_delete_policy" ON public.settings;

-- Create restrictive policies for settings
CREATE POLICY "settings_select_policy" ON public.settings 
FOR SELECT TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "settings_insert_policy" ON public.settings 
FOR INSERT TO authenticated 
WITH CHECK (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "settings_update_policy" ON public.settings 
FOR UPDATE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "settings_delete_policy" ON public.settings 
FOR DELETE TO authenticated 
USING (
  organization_id = (
    SELECT organization_id FROM profiles 
    WHERE id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin'
);

-- Create helper function for organization validation
CREATE OR REPLACE FUNCTION user_organization_id(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM profiles 
    WHERE id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION user_organization_id IS 'Helper function to get user organization ID securely';
