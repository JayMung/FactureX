-- Création du bucket 'avatars' - Version compatible Supabase SQL Editor
-- Utilisez ce script dans le SQL Editor de Supabase Dashboard

-- Étape 1 : Créer le bucket (syntaxe Supabase compatible)
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars_' || substr(md5(random()::text), 1, 8), -- ID unique basé sur hash
  'avatars',
  (SELECT id FROM auth.users WHERE email = 'admin@coxipay.com' LIMIT 1),
  false,
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Étape 2 : Supprimer les anciennes policies (si elles existent)
DROP POLICY IF EXISTS ON storage.objects FOR ALL;

-- Étape 3 : Créer les politiques RLS pour le bucket avatars
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can read their own avatars" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated'
);

-- Étape 4 : Confirmer que tout est bien créé
SELECT 'Bucket avatars créé avec succès' as result;
SELECT 'Policies RLS créées avec succès' as result;