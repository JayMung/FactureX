SELECT 
    id,
    email,
    first_name,
    last_name,
    role,
    phone,
    is_active,
    created_at,
    updated_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 5;