SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.role,
    up.phone,
    up.is_active,
    au.email,
    au.created_at as user_created_at,
    up.created_at as profile_created_at
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'testuser@coxipay.com';