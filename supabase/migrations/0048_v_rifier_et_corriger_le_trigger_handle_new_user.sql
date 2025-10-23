-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recréer la fonction avec une meilleure gestion des erreurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Insérer dans user_profiles avec les métadonnées de l'utilisateur
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
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- En cas d'erreur, logger sans bloquer la création de l'utilisateur
        RAISE WARNING 'Erreur lors de la création du profil pour l’utilisateur %: %', new.id, SQLERRM;
        RETURN new;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();