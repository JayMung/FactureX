-- Cleanup duplicate organization triggers on transactions
-- Keep only the most recent and robust one

-- Drop old trigger
DROP TRIGGER IF EXISTS set_organization_id_on_transactions_insert ON transactions;

-- Drop old function if exists
DROP FUNCTION IF EXISTS set_organization_id_on_transactions();

-- Verify the current trigger and function are working
-- The trigger 'set_organization_on_transactions_insert' should remain
-- with function 'auto_set_organization_on_transactions()'

-- Add comment for clarity
COMMENT ON FUNCTION auto_set_organization_on_transactions() IS 
  'Auto-sets organization_id from JWT on INSERT and validates it matches user organization. Created 2025-11-01.';
