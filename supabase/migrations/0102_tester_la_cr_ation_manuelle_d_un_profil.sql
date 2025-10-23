-- Créer un utilisateur dans auth
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
    'manual-test@example.com',
    NOW(),
    '+243123456789',
    '{"first_name": "Manual", "last_name": "Test", "role": "operateur", "phone": "+243123456789"}',
    NOW(),
    NOW()
) RETURNING id;