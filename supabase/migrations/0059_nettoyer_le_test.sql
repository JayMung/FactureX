DELETE FROM user_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'trigger-test-2@example.com'
);
DELETE FROM auth.users WHERE email = 'trigger-test-2@example.com';