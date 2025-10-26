# Diagnostic du problème d'affichage de l'avatar

## Problème
La photo de profil ne s'affiche pas après l'upload, même si le bucket est configuré.

## Vérifications à faire

### 1. Vérifier que le bucket `avatars` est bien public
Dans Supabase Dashboard:
- Storage → avatars → Settings
- **Public bucket** doit être ✅ coché

### 2. Vérifier les politiques RLS (Row Level Security)
Les politiques actuelles utilisent `auth.role() = 'authenticated'` mais il faut peut-être utiliser une politique plus permissive pour SELECT:

```sql
-- Pour permettre la lecture publique des avatars
CREATE POLICY "Allow public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Pour l'upload/update/delete (authentifié seulement)
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated updates"  
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
);
```

### 3. Vérifier l'URL générée
L'URL doit ressembler à:
```
https://[project-ref].supabase.co/storage/v1/object/public/avatars/avatar_[user-id]_[timestamp].[ext]
```

### 4. Vérifier la console du navigateur
Ouvrir les DevTools (F12) et vérifier:
- L'URL de l'image dans l'onglet Network
- Les erreurs CORS ou 404
- Le statut HTTP de la requête

## Solution recommandée

### Option 1: Recréer les politiques avec la bonne syntaxe

1. Dans Supabase Dashboard, allez sur **Storage** → **avatars** → **Policies**
2. Supprimez toutes les politiques existantes
3. Créez une nouvelle politique pour **SELECT** (lecture):
   - Policy name: `Public Access`
   - Policy definition: `true` (sans condition)
   - Allowed operation: SELECT

4. Créez une politique pour **INSERT** (upload):
   - Policy name: `Authenticated Upload`
   - Policy definition: `(auth.role() = 'authenticated')`
   - Allowed operation: INSERT

5. Créez une politique pour **UPDATE**:
   - Policy name: `Authenticated Update`
   - Policy definition: `(auth.role() = 'authenticated')`
   - Allowed operation: UPDATE

6. Créez une politique pour **DELETE**:
   - Policy name: `Authenticated Delete`
   - Policy definition: `(auth.role() = 'authenticated')`
   - Allowed operation: DELETE

### Option 2: Utiliser SQL directement

Allez dans **SQL Editor** et exécutez:

```sql
-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;

-- Créer les nouvelles politiques
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid() IS NOT NULL
);
```

## Test après correction

1. Uploadez une nouvelle photo
2. Vérifiez dans Storage que le fichier apparaît bien
3. Copiez l'URL publique depuis Storage
4. Testez l'URL dans un nouvel onglet du navigateur
5. Si l'image s'affiche, le problème est résolu ✅

## Si le problème persiste

1. Vérifiez que le bucket est bien en mode **Public**
2. Essayez de vider le cache du navigateur (Ctrl+Shift+Delete)
3. Rechargez complètement la page (Ctrl+F5)
4. Vérifiez dans la console du navigateur si l'URL de l'avatar est bien présente
