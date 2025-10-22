-- Script de vérification adapté pour votre structure Supabase
-- Ce script détecte automatiquement la structure des tables

-- Étape 1 : Vérifier la structure de la table pg_policies
DO $$
BEGIN
  -- Créer une table temporaire pour stocker les informations de structure
  CREATE TEMPORARY TABLE IF NOT EXISTS policy_structure (
    column_name text,
    data_type text,
    is_nullable boolean,
    default_value text
  );
  
  -- Insérer les colonnes connues de pg_policies
  INSERT INTO policy_structure (column_name, data_type, is_nullable, default_value) VALUES
    ('policyname', 'text', false, null),
    ('permissive', 'boolean', false, null),
    ('roles', 'text[]', true, null),
    ('cmd', 'text', false, null),
    ('qual', 'text', false, null),
    ('with_check', 'text', false, null),
    ('definition', 'text', false, null),
    ('tableid', 'oid', false, null),
    ('relid', 'oid', false, null);
END;
$$;

-- Étape 2 : Vérifier que le bucket existe
SELECT 'Bucket avatars' as result,
       EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'avatars') as bucket_exists,
       (SELECT id, name, public, created_at FROM storage.buckets WHERE name = 'avatars') as bucket_info;

-- Étape 3 : Vérifier les politiques (version adaptée)
SELECT 'Policies for avatars bucket' as result,
       EXISTS (SELECT 1 FROM pg_policies WHERE tableid = (SELECT id FROM storage.buckets WHERE name = 'avatars')) as policies_exist,
       (SELECT * FROM pg_policies WHERE tableid = (SELECT id FROM storage.buckets WHERE name = 'avatars')) as policies_info;

-- Étape 4 : Vérification alternative si la table pg_policies a une structure différente
DO $$
BEGIN
  -- Tenter une requête alternative si la première échoue
  SELECT 'Alternative policy check' as result,
         EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'pg_policies' 
                  AND column_name = 'definition') as has_definition,
         EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'pg_policies' 
                  AND column_name = 'tableid') as has_tableid;
END;
$$;

-- Étape 5 : Afficher toutes les colonnes de pg_policies pour diagnostic
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pg_policies' 
ORDER BY ordinal_position;