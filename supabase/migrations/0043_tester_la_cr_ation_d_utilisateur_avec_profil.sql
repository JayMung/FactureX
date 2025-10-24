-- Créer un utilisateur de test
INSERT INTO auth.users (
    id,
    email,
    email_confirmed_at,
    phone,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'test@example.com',
    NOW(),
    '+243123456789',
    '{"first_name": "Test", "last_name": "User", "role": "operateur"}',
    NOW(),
    NOW()
) RETURNING id;