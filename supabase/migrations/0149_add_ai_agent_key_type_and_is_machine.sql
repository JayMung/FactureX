-- Migration: Add ai_agent key type and is_machine flag to api_keys
-- This extends the API key system to support AI agent integrations.

-- 1. Add is_machine column (defaults to false for existing keys)
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS is_machine boolean NOT NULL DEFAULT false;

-- 2. Drop the existing type CHECK constraint
ALTER TABLE public.api_keys
  DROP CONSTRAINT IF EXISTS api_keys_type_check;

-- 3. Recreate with ai_agent included
ALTER TABLE public.api_keys
  ADD CONSTRAINT api_keys_type_check
  CHECK (type = ANY (ARRAY['public'::text, 'secret'::text, 'admin'::text, 'ai_agent'::text]));

-- 4. Add a partial index for quick lookup of active machine keys
CREATE INDEX IF NOT EXISTS idx_api_keys_machine_active
  ON public.api_keys (organization_id, type)
  WHERE is_machine = true AND is_active = true;

-- 5. Add comment for documentation
COMMENT ON COLUMN public.api_keys.is_machine IS 'True for non-human API consumers (ai_agent keys). Enforces additional restrictions: no DELETE, no update of validated transactions, no approval bypass.';
