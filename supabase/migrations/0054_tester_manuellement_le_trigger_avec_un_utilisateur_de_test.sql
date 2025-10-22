-- Créer un utilisateur de test pour voir si le trigger se déclenche
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
    'trigger-test@example.com',
    NOW(),
    '+243123456789',
    '{"first_name": "Trigger", "last_name": "Test", "role": "operateur", "phone": "+243123456789"}',
    NOW(),
    NOW()
) RETURNING id;