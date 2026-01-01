-- 1. DROP DUPLICATE/LEGACY TRIGGERS
-- This one was causing double-revert (and likely didn't handle fees)
DROP TRIGGER IF EXISTS trigger_revert_compte_before_transaction_update ON transactions;

-- 2. ENSURE WE HAVE AN UPDATE TRIGGER TO ADD THE NEW AMOUNT
-- We reuse the existing function 'update_compte_solde_after_transaction_with_fees' which adds the amount.
-- We trigger it AFTER UPDATE.
DROP TRIGGER IF EXISTS trigger_update_compte_after_update ON transactions;

CREATE TRIGGER trigger_update_compte_after_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id OR
    OLD.frais IS DISTINCT FROM NEW.frais OR
    OLD.taux_usd_cny IS DISTINCT FROM NEW.taux_usd_cny
  )
  EXECUTE FUNCTION update_compte_solde_after_transaction_with_fees();

-- 3. MANUALLY FIX THE ACCOUNT BALANCE
-- Based on calculation: Start(1696.72) - OldTxn(2639.99) + NewTxn(2640.00) = 1696.73.
-- And we confirm the current balance (6416.74) is garbage due to 10000 boost and double reverts.
-- We forcefully set it to the correct value.
UPDATE comptes_financiers 
SET solde_actuel = 1696.73 
WHERE id = '3c2b8f47-f45f-4d0c-b0da-cda9edab0192';

-- 4. RECALCULATE HISTORY
-- Execute the function we defined earlier (it's safe to redefine or just call it)
SELECT recalculate_account_history('3c2b8f47-f45f-4d0c-b0da-cda9edab0192');
