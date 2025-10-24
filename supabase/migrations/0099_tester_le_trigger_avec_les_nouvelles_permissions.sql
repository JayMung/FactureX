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
    'rls-test@example.com',
    NOW(),
    '+243123456789',
    '{"first_name": "RLS", "last_name": "Test", "role": "admin", "phone": "+243123456789"}',
    NOW(),
    NOW()
) RETURNING id;