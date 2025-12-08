-- Fix trigger to use profile instead of JWT for organization_id
-- JWT may not be accessible in all contexts

DROP TRIGGER IF EXISTS set_organization_on_transactions_insert ON transactions;
DROP FUNCTION IF EXISTS auto_set_organization_on_transactions();

-- Create improved trigger function using profile
CREATE OR REPLACE FUNCTION auto_set_organization_on_transactions()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get organization_id from user's profile
  SELECT organization_id INTO user_org_id
  FROM profiles
  WHERE id = auth.uid();
  
  -- If user has no profile or no organization, raise error
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization assigned';
  END IF;
  
  -- Auto-set organization_id if not provided
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := user_org_id;
  END IF;
  
  -- Validate that organization_id matches user's organization
  IF NEW.organization_id != user_org_id THEN
    RAISE EXCEPTION 'Cannot create transaction for different organization';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER set_organization_on_transactions_insert
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_organization_on_transactions();

-- Add comment
COMMENT ON FUNCTION auto_set_organization_on_transactions() IS 
  'Auto-sets organization_id from user profile and validates it matches. Uses profile table instead of JWT for reliability.';
