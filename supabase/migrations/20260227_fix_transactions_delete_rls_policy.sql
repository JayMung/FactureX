-- Fix RLS policy DELETE for transactions to properly check app_metadata.role
-- The current policy only checks auth.jwt() ->> 'role' but the role is in app_metadata

DROP POLICY IF EXISTS transactions_delete_secure_policy ON transactions;

CREATE POLICY transactions_delete_secure_policy ON transactions
  FOR DELETE
  TO authenticated
  USING (
    organization_id = (SELECT profiles.organization_id FROM profiles WHERE profiles.id = auth.uid())
    AND (
      -- Check both app_metadata.role and direct role claim
      ((auth.jwt() -> 'app_metadata' ->> 'role') = ANY (ARRAY['super_admin'::text, 'admin'::text]))
      OR
      ((auth.jwt() ->> 'role') = ANY (ARRAY['super_admin'::text, 'admin'::text]))
    )
  );
