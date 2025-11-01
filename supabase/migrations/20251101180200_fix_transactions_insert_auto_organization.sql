-- Fix transactions INSERT policy to auto-set organization_id
-- This ensures all new transactions automatically get the user's organization_id

-- Drop existing INSERT policy
DROP POLICY IF EXISTS transactions_insert_policy ON transactions;

-- Create trigger function to auto-set organization_id
CREATE OR REPLACE FUNCTION auto_set_organization_on_transactions()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set organization_id from JWT if not provided
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (auth.jwt() ->> 'organization_id')::uuid;
  END IF;
  
  -- Validate that organization_id matches user's organization
  IF NEW.organization_id != (auth.jwt() ->> 'organization_id')::uuid THEN
    RAISE EXCEPTION 'Cannot create transaction for different organization';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_organization_on_transactions_insert ON transactions;

-- Create trigger to auto-set organization_id before insert
CREATE TRIGGER set_organization_on_transactions_insert
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_organization_on_transactions();

-- Recreate INSERT policy (simplified since trigger handles organization_id)
CREATE POLICY transactions_insert_policy ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Add comment
COMMENT ON TRIGGER set_organization_on_transactions_insert ON transactions IS 
  'Auto-sets organization_id from JWT and validates it matches user organization';
