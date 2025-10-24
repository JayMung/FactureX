CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Attendre un peu pour s'assurer que l'utilisateur est complètement créé
    -- Puis créer le profil dans user_profiles
    INSERT INTO public.user_profiles (
        user_id, 
        full_name, 
        role, 
        phone, 
        is_active
    )
    VALUES (
        new.id, 
        COALESCE(new.raw_user_meta_data ->> 'full_name', 
                CONCAT(new.raw_user_meta_data ->> 'first_name', ' ', new.raw_user_meta_data ->> 'last_name'),
                new.email),
        COALESCE(new.raw_user_meta_data ->> 'role', 'operateur'),
        COALESCE(new.raw_user_meta_data ->> 'phone', ''),
        true
    );
    
    RETURN new;
END;
$$;