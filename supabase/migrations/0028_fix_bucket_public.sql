-- Corriger le bucket avatars pour le rendre public
-- Exécutez ce script si le bucket n'est pas public

UPDATE storage.buckets 
SET public = true 
WHERE name = 'avatars';

-- Vérifier la correction
SELECT name, public FROM storage.buckets WHERE name = 'avatars';