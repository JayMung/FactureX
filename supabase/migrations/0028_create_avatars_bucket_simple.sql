-- Version simplifiée du script pour créer le bucket avatars

-- Étape 1 : Créer le bucket (version simplifiée)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, owner, public, file_size_limit, allowed_mime_types)
  VALUES (
    gen_random_uuid(),
    'avatars',
    (SELECT id FROM auth.users WHERE email = 'admin@coxipay.com' LIMIT 1),
    false,
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  );
END;

-- Étape 2 : Créer les politiques RLS (version simplifiée)
DO $$
BEGIN
  -- Supprimer les anciennes politiques
  DROP POLICY IF EXISTS "Users can upload avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read their own avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

  -- Créer les nouvelles politiques
  CREATE POLICY "Users can upload avatars" ON storage.objects
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

  CREATE POLICY "Users can update their own avatars" ON storage.objects
  FOR UPDATE USING (auth.role() = 'authenticated');

  CREATE POLICY "Users can read their own avatars" ON storage.objects
  FOR SELECT USING (auth.role() = 'authenticated');

  CREATE POLICY "Users can delete their own avatars" ON storage.objects
  FOR DELETE USING (auth.role() = 'authenticated');
END;
$$;