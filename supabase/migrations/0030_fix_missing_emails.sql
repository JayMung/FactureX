-- Diagnostiquer le problème : voir les utilisateurs sans email
SELECT 
  p.id,
  p.email as profile_email,
  p.first_name,
  p.last_name,
  p.role,
  au.email as auth_email
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id;

-- Corriger : forcer la synchronisation des emails pour TOUS les utilisateurs
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id;

-- Vérifier que c'est corrigé
SELECT 
  p.id,
  p.email,
  p.first_name,
  p.last_name,
  p.role
FROM public.profiles p
ORDER BY p.role DESC;
