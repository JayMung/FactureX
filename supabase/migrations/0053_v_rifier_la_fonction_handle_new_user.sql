SELECT 
    proname,
    prosrc
FROM pg_proc 
WHERE proname = 'handle_new_user';