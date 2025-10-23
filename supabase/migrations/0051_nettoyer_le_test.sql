DELETE FROM user_profiles WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'testuser@coxipay.com'
);
DELETE FROM auth.users WHERE email = 'testuser@coxipay.com';