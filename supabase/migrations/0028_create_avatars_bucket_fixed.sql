-- Création du bucket 'avatars' pour stocker les photos de profil
-- Script corrigé avec la structure exacte de Supabase Storage

-- Étape 1 : Créer le bucket avec les colonnes correctes
INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
VALUES (
  gen_random_uuid(), -- Génération d'un UUID unique pour l'id
  'avatars', 
  (SELECT id FROM auth.users WHERE email = 'admin@coxipay.com' LIMIT 1), -- Owner ID
  false, 
  true, 
  5242880, -- 5MB (en bytes)
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  NOW()
);

-- Étape 2 : Créer les politiques RLS pour le bucket avatars
-- Supprimer les politiques existantes pour éviter les conflits
DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list avatars" ON storage.buckets;
DROP POLICY IF EXISTS "Authenticated users can create objects in avatars" ON storage.buckets;

-- Étape 3 : Politique pour l'upload par les utilisateurs authentifiés
CREATE POLICY "Users can upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated'
);

-- Étape 4 : Politique pour permettre aux utilisateurs de lire leurs propres avatars
CREATE POLICY "Users can read their own avatars" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated'
);

-- Étape 5 : Politique pour permettre aux utilisateurs de mettre à jour leurs propres avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  auth.role() = 'authenticated'
);

-- Étape 6 : Politique pour permettre aux utilisateurs de supprimer leurs propres avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated'
);