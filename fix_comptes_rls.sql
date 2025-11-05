-- FIX RLS POLICIES FOR comptes_financiers
-- Execute this in Supabase SQL Editor

-- 1. Drop all existing policies
DROP POLICY IF EXISTS "Allow authenticated users to insert comptes" ON public.comptes_financiers;
DROP POLICY IF EXISTS "Users can view their organization comptes" ON public.comptes_financiers;
DROP POLICY IF EXISTS "Users can update their organization comptes" ON public.comptes_financiers;
DROP POLICY IF EXISTS "Users can delete their organization comptes" ON public.comptes_financiers;

-- 2. Disable RLS temporarily (OPTION A - for testing)
-- ALTER TABLE public.comptes_financiers DISABLE ROW LEVEL SECURITY;

-- OR

-- 3. Create very permissive policies (OPTION B - recommended)
ALTER TABLE public.comptes_financiers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view all comptes (for now)
CREATE POLICY "Allow authenticated users to view comptes"
  ON public.comptes_financiers
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to insert comptes
CREATE POLICY "Allow authenticated users to insert comptes"
  ON public.comptes_financiers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update comptes
CREATE POLICY "Allow authenticated users to update comptes"
  ON public.comptes_financiers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to delete comptes
CREATE POLICY "Allow authenticated users to delete comptes"
  ON public.comptes_financiers
  FOR DELETE
  TO authenticated
  USING (true);

-- 4. Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'comptes_financiers';

-- 5. Test query (should work now)
SELECT * FROM public.comptes_financiers LIMIT 5;
