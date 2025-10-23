-- Création du bucket 'avatars' pour stocker les photos de profil
-- Ce script crée le bucket et configure les politiques RLS appropriées

-- Étape 1 : Créer le bucket
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types, created_at)
VALUES (
  'avatars', 
  'avatars', 
  (SELECT id FROM auth.users WHERE email = 'admin@coxipay.com' LIMIT 1),
  false, 
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  NOW()
) ON CONFLICT DO NOTHING;

-- Étape 2 : Accorder l'accès au bucket pour tous les utilisateurs authentifiés
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Étape 3 : Permettre aux utilisateurs de mettre à jour leurs propres avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated' AND 
  (auth.uid()::text = storage.buckets.name::text OR storage.buckets.name::text LIKE (auth.uid()::text || '/%'))
);

-- Étape 4 : Permettre aux utilisateurs de lire leurs propres avatars
CREATE POLICY "Users can read their own avatars" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  (auth.uid()::text = storage.buckets.name::text OR storage.buckets.name::text LIKE (auth.uid()::text || '/%'))
);

-- Étape 5 : Permettre aux utilisateurs de supprimer leurs propres avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  (auth.uid()::text = storage.buckets.name::text OR storage.buckets.name::text LIKE (auth.uid()::text || '/%'))
);

-- Étape 6 : Permettre à tous les utilisateurs authentifiés de lister les objets du bucket
CREATE POLICY "Authenticated users can list avatars" ON storage.buckets
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Étape 7 : Permettre à tous les utilisateurs authentifiés de créer des objets dans le bucket
CREATE POLICY "Authenticated users can create objects in avatars" ON storage.buckets
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);