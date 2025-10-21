-- Supprimer toutes les politiques existantes sur clients
DROP POLICY IF EXISTS "clients_select_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_insert_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_update_policy" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- Créer de nouvelles politiques RLS permissives pour clients
CREATE POLICY "clients_select_policy" ON clients 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "clients_insert_policy" ON clients 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "clients_update_policy" ON clients 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "clients_delete_policy" ON clients 
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
WHERE tablename = 'clients';