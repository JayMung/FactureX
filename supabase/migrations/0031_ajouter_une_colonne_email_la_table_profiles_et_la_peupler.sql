-- Ajouter la colonne email si elle n'existe pas
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Mettre à jour les emails existants en utilisant les métadonnées
UPDATE public.profiles 
SET email = (
  SELECT email 
  FROM auth.users 
  WHERE auth.users.id = profiles.id
)
WHERE email IS NULL;

-- Ajouter une contrainte unique sur l'email
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_key UNIQUE (email);