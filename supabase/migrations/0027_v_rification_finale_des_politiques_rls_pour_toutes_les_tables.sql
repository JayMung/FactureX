-- Vérifier toutes les politiques RLS actives
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual = 'true' THEN 'Permissive (allow all)'
        WHEN qual IS NOT NULL THEN 'Restrictive'
        ELSE 'No condition'
    END as policy_type
FROM pg_policies 
WHERE tablename IN ('clients', 'transactions')
ORDER BY tablename, policyname;