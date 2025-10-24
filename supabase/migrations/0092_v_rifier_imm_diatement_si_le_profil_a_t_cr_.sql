SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_active,
    created_at
FROM profiles 
WHERE email = 'trigger-test-new@example.com';