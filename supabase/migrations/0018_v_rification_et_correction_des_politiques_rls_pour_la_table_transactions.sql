-- Vérifier les politiques existantes sur la table transactions
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

-- Supprimer toutes les politiques existantes sur transactions
DROP POLICY IF EXISTS "transactions_select_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON transactions;

-- Créer de nouvelles politiques RLS correctes pour transactions
CREATE POLICY "transactions_select_policy" ON transactions 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert_policy" ON transactions 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_update_policy" ON transactions 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "transactions_delete_policy" ON transactions 
FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');