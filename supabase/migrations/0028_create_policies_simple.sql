-- Création des politiques RLS simplifiée et garanties
-- Utilisez ce script si les politiques précédentes ne fonctionnent pas

-- Supprimer toutes les politiques existantes pour le bucket avatars
DROP POLICY IF EXISTS ON storage.objects FOR ALL;

-- Créer une politique permissive qui autorise tout pour les utilisateurs authentifiés
CREATE POLICY "Allow all for authenticated users" ON storage.objects
FOR ALL USING (
  auth.role() = 'authenticated'
);

-- Alternative : Politiques spécifiques par opération
CREATE POLICY "Insert policy" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Select policy" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Update policy" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Delete policy" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated'
);