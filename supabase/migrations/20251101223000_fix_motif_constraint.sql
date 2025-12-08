-- Migration: Fix motif constraint to allow all transaction types
-- Remove the restrictive CHECK constraint on motif field

-- Drop the existing constraint
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_motif_check;

-- Add a more flexible constraint (or no constraint at all)
-- The motif field can now be any text value
ALTER TABLE transactions ALTER COLUMN motif DROP NOT NULL;

COMMENT ON COLUMN transactions.motif IS 'Description or reason for the transaction. Can be: Commande, Transfert, or any custom text for internal operations.';
