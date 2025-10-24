-- Supprimer tout ce qui existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recréer la fonction avec une gestion robuste
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Log pour debug
    RAISE LOG 'Trigger déclenché pour l''utilisateur %', new.id;
    
    -- Insérer dans user_profiles
    INSERT INTO public.user_profiles (
        user_id, 
        full_name, 
        role, 
        phone, 
        is_active
    )
    VALUES (
        new.id, 
        COALESCE(
            new.raw_user_meta_data ->> 'full_name',
            CONCAT(
                COALESCE(new.raw_user_meta_data ->> 'first_name', ''), 
                ' ', 
                COALESCE(new.raw_user_meta_data ->> 'last_name', '')
            ),
            new.email
        ),
        COALESCE(new.raw_user_meta_data ->> 'role', 'operateur'),
        COALESCE(new.raw_user_meta_data ->> 'phone', ''),
        true
    );
    
    RAISE LOG 'Profil créé pour l''utilisateur %', new.id;
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Logger l'erreur mais ne pas bloquer
        RAISE LOG 'Erreur dans handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();