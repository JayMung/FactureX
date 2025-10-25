-- Migration: Fix Admin Role Security
-- Date: 2025-01-26
-- Description: Update RLS policies to use app_metadata instead of user_metadata for admin role

-- ============================================================================
-- STEP 1: Update all RLS policies to use app_metadata for admin checks
-- ============================================================================

-- Profiles table policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles 
FOR SELECT TO authenticated 
USING (
  auth.uid() = id OR 
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles 
FOR UPDATE TO authenticated 
USING (
  auth.uid() = id OR 
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;
CREATE POLICY "profiles_delete_policy" ON public.profiles 
FOR DELETE TO authenticated 
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Clients table policies
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;
CREATE POLICY "clients_delete_policy" ON public.clients 
FOR DELETE TO authenticated 
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- Transactions table policies
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;
CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated 
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);

-- ============================================================================
-- STEP 2: Create function to set default role for new users
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Set default role to 'operateur' in app_metadata (server-controlled)
  -- Admin role must be set manually via SQL or Supabase Dashboard
  NEW.raw_app_meta_data = COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', 'operateur');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created_set_role ON auth.users;

-- Create trigger to set default role for new users
CREATE TRIGGER on_auth_user_created_set_role
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================================================
-- STEP 3: Instructions for creating admin user
-- ============================================================================

-- To create an admin user, run this command in Supabase SQL Editor:
-- Replace 'your-admin@email.com' with the actual admin email

/*
UPDATE auth.users 
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'mungedijeancy@gmail.com';
*/

-- To verify admin role:
/*
SELECT 
  id,
  email,
  raw_app_meta_data ->> 'role' as role
FROM auth.users
WHERE email = 'your-admin@email.com';
*/

-- ============================================================================
-- STEP 4: Add comments for documentation
-- ============================================================================

COMMENT ON FUNCTION public.handle_new_user_role() IS 
'Automatically sets default role to operateur for new users in app_metadata (server-controlled). Admin role must be set manually for security.';
