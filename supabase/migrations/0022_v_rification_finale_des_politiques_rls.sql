-- Vérifier l'état actuel des politiques
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'transactions'
ORDER BY policyname;