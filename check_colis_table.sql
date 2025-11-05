-- Script de vérification de la table colis
-- À exécuter dans Supabase SQL Editor

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'colis'
) AS table_exists;

-- 2. Vérifier la structure de la table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'colis'
ORDER BY ordinal_position;

-- 3. Compter le nombre total de colis
SELECT COUNT(*) as total_colis FROM colis;

-- 4. Compter par statut
SELECT statut, COUNT(*) as count
FROM colis
GROUP BY statut
ORDER BY count DESC;

-- 5. Vérifier les RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'colis';

-- 6. Vérifier les permissions
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'colis';
