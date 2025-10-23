-- Corriger les politiques pour qu'elles soient permissives
-- Exécutez ce script si les politiques bloquent l'accès

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS ON storage.objects FOR ALL;

-- Créer une politique permissive qui autorise tout
CREATE POLICY "Allow all for authenticated users" ON storage.objects
FOR ALL USING (
  auth.role() = 'authenticated'
);

-- Vérifier la création
SELECT policyname, permissive FROM pg_policies 
WHERE tableid = (SELECT id FROM storage.buckets WHERE name = 'avatars');