-- Supprimer le trigger qui utilise user_profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Supprimer la table user_profiles
DROP TABLE IF EXISTS user_profiles;