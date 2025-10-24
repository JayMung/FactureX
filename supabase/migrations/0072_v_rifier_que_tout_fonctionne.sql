SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_active
FROM profiles 
WHERE email = 'simple-test@example.com';