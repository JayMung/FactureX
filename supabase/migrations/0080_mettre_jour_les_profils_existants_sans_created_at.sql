UPDATE profiles 
SET created_at = NOW(), updated_at = NOW()
WHERE created_at IS NULL;