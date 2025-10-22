SELECT 
  up.id,
  up.user_id,
  up.full_name,
  up.role,
  p.email
FROM public.user_profiles up
LEFT JOIN public.profiles p ON up.user_id = p.id
ORDER BY up.created_at DESC;