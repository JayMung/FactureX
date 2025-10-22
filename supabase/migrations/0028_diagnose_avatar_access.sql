-- Script de diagnostic pour les problèmes d'accès aux avatars
-- Exécutez ce script pour identifier le problème exact

-- Étape 1 : Vérifier que le bucket est public
SELECT 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types 
FROM storage.buckets 
WHERE name = 'avatars';

-- Étape 2 : Vérifier les politiques RLS
SELECT 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE tableid = (SELECT id FROM storage.buckets WHERE name = 'avatars');

-- Étape 3 : Vérifier un fichier uploadé récemment
SELECT 
  name, 
  bucket_id, 
  owner, 
  created_at, 
  updated_at,
  (SELECT storage.file_name FROM storage.objects WHERE id = storage.objects.id) as file_name
FROM storage.objects 
WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'avatars')
ORDER BY created_at DESC
LIMIT 5;

-- Étape 4 : Tester l'URL publique d'un fichier
SELECT 
  'Test URL generation' as test,
  (SELECT storage.file_name FROM storage.objects 
   WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'avatars') 
   LIMIT 1) as file_name,
  (SELECT storage.file_path FROM storage.objects 
   WHERE bucket_id = (SELECT id FROM storage.buckets WHERE name = 'avatars') 
   LIMIT 1) as file_path;