-- Fix: Allow cascade delete for colis with related payments
-- This ensures that when a colis is deleted, related paiements are also removed

-- Option 1: Add ON DELETE CASCADE to existing foreign key (if not already set)
-- First, check current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'paiements'::regclass AND confrelid = 'colis'::regclass;

-- Option 2: Create a trigger to handle cascade delete manually
CREATE OR REPLACE FUNCTION handle_colis_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete related paiements_colis
  DELETE FROM paiements_colis WHERE colis_id = OLD.id;
  
  -- Delete related paiements
  DELETE FROM paiements WHERE colis_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_cascade_colis_delete ON colis;
CREATE TRIGGER trigger_cascade_colis_delete
  BEFORE DELETE ON colis
  FOR EACH ROW
  EXECUTE FUNCTION handle_colis_delete();

-- Also ensure RLS allows delete for authorized users
-- Check if delete policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'colis' 
    AND policyname = 'Users can delete their own organization colis'
  ) THEN
    CREATE POLICY "Users can delete their own organization colis" ON colis
      FOR DELETE
      USING (
        organization_id IN (
          SELECT organization_id FROM profiles 
          WHERE id = auth.uid()
        )
      );
  END IF;
END $$;
