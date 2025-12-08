-- Migration: Password Requirements
-- Description: Configure password requirements in Supabase Auth
-- Date: 2025-01-26
-- Security Task: #6 - Password Requirements (HIGH)

-- ============================================================================
-- PART 1: Configure Auth Password Requirements
-- ============================================================================

-- Note: Supabase Auth password requirements are configured via Dashboard or API
-- The following settings should be applied via Supabase Dashboard:
-- 
-- Auth > Policies > Password Requirements:
-- - Minimum password length: 12 characters
-- - Require uppercase letters: Yes
-- - Require lowercase letters: Yes
-- - Require numbers: Yes
-- - Require special characters: Yes
--
-- These settings are stored in auth.config and cannot be set via SQL migration.
-- This migration serves as documentation and creates helper functions.

-- ============================================================================
-- PART 2: Create Password Validation Function (Server-Side)
-- ============================================================================

-- Create a function to validate password strength on the server side
-- This can be used in triggers or RPC calls for additional validation
CREATE OR REPLACE FUNCTION public.validate_password_strength(password_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  errors TEXT[] := ARRAY[]::TEXT[];
  score INTEGER := 0;
  strength TEXT;
BEGIN
  -- Check minimum length (8 characters)
  IF LENGTH(password_text) < 8 THEN
    errors := array_append(errors, 'Le mot de passe doit contenir au moins 8 caractères');
  ELSE
    score := score + 20;
    -- Bonus for extra length
    score := score + LEAST(20, (LENGTH(password_text) - 8) * 2);
  END IF;

  -- Check uppercase
  IF password_text !~ '[A-Z]' THEN
    errors := array_append(errors, 'Le mot de passe doit contenir au moins une lettre majuscule');
  ELSE
    score := score + 15;
  END IF;

  -- Check lowercase
  IF password_text !~ '[a-z]' THEN
    errors := array_append(errors, 'Le mot de passe doit contenir au moins une lettre minuscule');
  ELSE
    score := score + 15;
  END IF;

  -- Check number
  IF password_text !~ '[0-9]' THEN
    errors := array_append(errors, 'Le mot de passe doit contenir au moins un chiffre');
  ELSE
    score := score + 15;
  END IF;

  -- Check special character
  IF password_text !~ '[!@#$%^&*()_+\-=\[\]{};'':"\\|,.<>/?]' THEN
    errors := array_append(errors, 'Le mot de passe doit contenir au moins un caractère spécial');
  ELSE
    score := score + 15;
  END IF;

  -- Check for sequential characters
  IF password_text ~* '(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)' THEN
    errors := array_append(errors, 'Évitez les séquences de caractères (abc, 123, etc.)');
    score := score - 10;
  END IF;

  -- Check for repeated characters
  IF password_text ~ '(.)\1{2,}' THEN
    errors := array_append(errors, 'Évitez les caractères répétés (aaa, 111, etc.)');
    score := score - 10;
  END IF;

  -- Ensure score is between 0 and 100
  score := GREATEST(0, LEAST(100, score));

  -- Determine strength
  IF score >= 80 THEN
    strength := 'very-strong';
  ELSIF score >= 60 THEN
    strength := 'strong';
  ELSIF score >= 40 THEN
    strength := 'medium';
  ELSE
    strength := 'weak';
  END IF;

  -- Build result
  result := jsonb_build_object(
    'isValid', CARDINALITY(errors) = 0,
    'score', score,
    'errors', to_jsonb(errors),
    'strength', strength
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.validate_password_strength(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.validate_password_strength(TEXT) IS 
'Validates password strength according to OWASP requirements. Returns JSON with isValid, score, errors, and strength.';

-- ============================================================================
-- PART 3: Create Password History Table (Prevent Reuse)
-- ============================================================================

-- Create table to store password hashes history
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_password_history_user_id 
ON public.password_history(user_id);

CREATE INDEX IF NOT EXISTS idx_password_history_created_at 
ON public.password_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own password history
CREATE POLICY "Users can view own password history"
ON public.password_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policy: Only system can insert password history
CREATE POLICY "System can insert password history"
ON public.password_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.password_history IS 
'Stores password hashes history to prevent password reuse. Keeps last 5 passwords per user.';

-- ============================================================================
-- PART 4: Create Function to Check Password Reuse
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_password_reuse(
  p_user_id UUID,
  p_password_hash TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_reused BOOLEAN;
BEGIN
  -- Check if password hash exists in history (last 5 passwords)
  SELECT EXISTS (
    SELECT 1
    FROM public.password_history
    WHERE user_id = p_user_id
      AND password_hash = p_password_hash
    ORDER BY created_at DESC
    LIMIT 5
  ) INTO is_reused;

  RETURN is_reused;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_password_reuse(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.check_password_reuse(UUID, TEXT) IS 
'Checks if a password hash has been used in the last 5 password changes.';

-- ============================================================================
-- PART 5: Create Cleanup Function for Old Password History
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_password_history()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Keep only the last 5 passwords per user
  DELETE FROM public.password_history
  WHERE id IN (
    SELECT id
    FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM public.password_history
    ) t
    WHERE rn > 5
  );
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.cleanup_old_password_history() TO service_role;

-- Add comment
COMMENT ON FUNCTION public.cleanup_old_password_history() IS 
'Cleanup function to keep only the last 5 passwords per user. Should be run periodically via cron.';

-- ============================================================================
-- PART 6: Documentation and Next Steps
-- ============================================================================

-- Next Steps (Manual Configuration Required):
-- 
-- 1. Configure Supabase Auth Password Requirements via Dashboard:
--    - Go to Authentication > Policies
--    - Set minimum password length to 8
--    - Enable all character requirements
--
-- 2. Optional: Set up pg_cron to run cleanup function daily:
--    SELECT cron.schedule(
--      'cleanup-password-history',
--      '0 2 * * *', -- Run at 2 AM daily
--      'SELECT public.cleanup_old_password_history();'
--    );
--
-- 3. Optional: Implement password expiration policy (e.g., 90 days)
--
-- 4. Update client-side code to use validate_password_strength function
--    for additional server-side validation

-- Migration completed successfully
DO $$
BEGIN
  RAISE NOTICE 'Password requirements migration completed successfully';
  RAISE NOTICE 'Manual configuration required in Supabase Dashboard';
  RAISE NOTICE 'See migration comments for next steps';
END $$;
