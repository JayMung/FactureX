-- Vérifier les utilisateurs dans auth.users et leurs profils
SELECT 
    u.id as user_id,
    u.email,
    u.created_at as auth_created_at,
    p.id as profile_id,
    p.first_name,
    p.last_name,
    p.role,
    p.is_active,
    CASE 
        WHEN p.id IS NULL THEN 'PROFIL MANQUANT'
        ELSE 'OK'
    END as status
FROM auth.users u
LEFT JOIN profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- Créer les profils manquants pour les utilisateurs authentifiés
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT u.id, u.email, u.raw_user_meta_data
        FROM auth.users u
        LEFT JOIN profiles p ON u.id = p.id
        WHERE p.id IS NULL
    LOOP
        INSERT INTO profiles (
            id, 
            email, 
            first_name, 
            last_name, 
            role, 
            is_active
        )
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(user_record.raw_user_meta_data->>'first_name', ''),
            COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
            COALESCE(user_record.raw_user_meta_data->>'role', 'admin'),
            true
        );
        RAISE NOTICE 'Profil créé pour: %', user_record.email;
    END LOOP;
END $$;

-- Afficher le résultat final
SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at
FROM profiles
ORDER BY created_at DESC;
