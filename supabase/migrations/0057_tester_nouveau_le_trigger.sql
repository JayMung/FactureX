-- Nettoyer le test précédent
DELETE FROM user_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'trigger-test@example.com'
);
DELETE FROM auth.users WHERE email = 'trigger-test@example.com';

-- Nouveau test
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
    'trigger-test-2@example.com',
    NOW(),
    '+243123456789',
    '{"first_name": "Trigger", "last_name": "Test2", "role": "admin", "phone": "+243123456789"}',
    NOW(),
    NOW()
) RETURNING id;