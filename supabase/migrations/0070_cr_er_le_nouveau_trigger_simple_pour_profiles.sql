CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
    -- Mettre à jour le profil créé par Supabase avec les métadonnées
    UPDATE public.profiles 
    SET 
        role = COALESCE(new.raw_user_meta_data ->> 'role', 'operateur'),
        phone = COALESCE(new.raw_user_meta_data ->> 'phone', ''),
        is_active = true
    WHERE id = new.id;
    
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Logger l'erreur mais ne pas bloquer
        RAISE LOG 'Erreur dans handle_new_user: %', SQLERRM;
        RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();