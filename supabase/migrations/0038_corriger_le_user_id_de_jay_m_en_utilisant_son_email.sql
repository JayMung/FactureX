UPDATE public.user_profiles up
SET user_id = (
  SELECT au.id 
  FROM auth.users au 
  WHERE au.email = 'jaymiptv@gmail.com'
)
WHERE up.full_name LIKE '%Jay M%' AND up.user_id = 'e5e5e5e5-e5e5-e5e5-e5e5-e5e5e5e5e5e5';