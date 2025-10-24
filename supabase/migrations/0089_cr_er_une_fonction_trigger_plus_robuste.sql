CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Insérer ou mettre à jour le profil
    INSERT INTO public.profiles (
        id,
        email,
        first_name,
        last_name,
        role,
        phone,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data ->> 'first_name', ''),
        COALESCE(new.raw_user_meta_data ->> 'last_name', ''),
        COALESCE(new.raw_user_meta_data ->> 'role', 'operateur'),
        COALESCE(new.raw_user_meta_data ->> 'phone', ''),
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        role = COALESCE(EXCLUDED.role, profiles.role),
        phone = COALESCE(EXCLUDED.phone, profiles.phone),
        updated_at = NOW();
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Logger l'erreur mais ne pas bloquer
        RAISE LOG 'Erreur dans handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$;