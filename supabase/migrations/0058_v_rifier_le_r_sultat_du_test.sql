SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.role,
    up.is_active,
    au.email
FROM user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE au.email = 'trigger-test-2@example.com';