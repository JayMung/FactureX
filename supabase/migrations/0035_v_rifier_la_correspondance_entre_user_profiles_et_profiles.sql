SELECT 
  up.id as user_profile_id,
  up.user_id,
  up.full_name,
  up.role as user_profile_role,
  p.id as profile_id,
  p.email,
  p.first_name,
  p.last_name,
  p.role as profile_role
FROM public.user_profiles up
LEFT JOIN public.profiles p ON up.user_id = p.id
ORDER BY up.created_at DESC;