SELECT 
    up.id,
    up.user_id,
    up.full_name,
    up.role,
    up.is_active,
    au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
ORDER BY up.created_at DESC
LIMIT 5;