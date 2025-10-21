-- Supprimer toutes les politiques existantes sur transactions
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- Créer de nouvelles politiques RLS permissives pour transactions
CREATE POLICY "transactions_select_policy" ON transactions 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert_policy" ON transactions 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_update_policy" ON transactions 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "transactions_delete_policy" ON transactions 
FOR DELETE TO authenticated USING (true);

-- Vérifier que les politiques ont été créées correctement
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
WHERE tablename = 'transactions';