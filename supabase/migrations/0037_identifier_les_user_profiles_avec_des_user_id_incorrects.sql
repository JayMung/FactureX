SELECT 
  up.id,
  up.user_id,
  up.full_name,
  up.role,
  p.email,
  CASE 
    WHEN up.user_id = 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5' THEN 'FAKE_ID'
    ELSE 'OK'
  END as status
FROM public.user_profiles up
LEFT JOIN public.profiles p ON up.user_id = p.id
ORDER BY up.created_at DESC;