-- =====================================================
-- VÉRIFICATION DES POLITIQUES RLS SUR TRANSACTIONS
-- =====================================================
-- 
-- Exécutez ce script dans le SQL Editor de Supabase pour voir
-- l'état actuel des politiques de sécurité sur la table transactions
-- 
-- =====================================================

-- Voir toutes les politiques sur la table transactions
SELECT 
    schemaname AS schema,
    tablename AS table,
    policyname AS policy_name,
    permissive AS permissive_type,
    roles AS allowed_roles,
    cmd AS command_type,
    qual AS using_clause,
    with_check AS with_check_clause
FROM pg_policies 
WHERE tablename = 'transactions'
ORDER BY cmd, policyname;

-- Si vous voyez pour la politique DELETE :
-- 
-- using_clause contient "auth.jwt() ->> 'role' = 'admin'" 
-- => C'EST LE PROBLÈME ! Il faut le corriger avec fix_delete_policy.sql
-- 
-- using_clause contient juste "true"
-- => C'EST BON ! La politique permet la suppression

-- =====================================================
-- TEST OPTIONNEL : Vérifier votre JWT actuel
-- =====================================================
-- Décommentez la ligne suivante pour voir le contenu de votre JWT
-- SELECT auth.jwt();

-- Pour voir spécifiquement le rôle dans votre JWT :
-- SELECT auth.jwt() ->> 'role' AS my_role;
-- 
-- Si le résultat est NULL ou vide, c'est pour ça que la suppression échoue !
