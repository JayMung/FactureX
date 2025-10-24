-- Créer un utilisateur de test avec toutes les métadonnées nécessaires
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
    'testuser@coxipay.com',
    NOW(),
    '+243987654321',
    '{"first_name": "Test", "last_name": "User", "role": "operateur", "phone": "+243987654321"}',
    NOW(),
    NOW()
) RETURNING id;