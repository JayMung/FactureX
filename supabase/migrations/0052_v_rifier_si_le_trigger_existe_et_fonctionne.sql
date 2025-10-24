SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_condition,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';