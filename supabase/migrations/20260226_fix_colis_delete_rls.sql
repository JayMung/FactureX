-- Fix RLS policy for colis deletion
-- The current policy blocks deletes because organization_id check fails

-- Drop the existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own organization colis" ON colis;

-- Create a more permissive delete policy that allows deletion if user can see the record
-- This uses the same logic as SELECT policy
CREATE POLICY "Users can delete their own organization colis" ON colis
  FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Alternative: Allow admin users to delete any colis
-- This can be uncommented if needed
-- CREATE POLICY "Admin users can delete any colis" ON colis
--   FOR DELETE
--   TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM profiles 
--       WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
--     )
--   );

-- Verify RLS is enabled
ALTER TABLE colis ENABLE ROW LEVEL SECURITY;

-- Add comment
COMMENT ON POLICY "Users can delete their own organization colis" ON colis IS 
  'Allows users to delete colis from their own organization';
