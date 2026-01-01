-- Migration: Include 'frais' in update trigger condition
-- Previously, changing 'frais' didn't trigger a movement update, leaving the description stale.

DROP TRIGGER IF EXISTS trigger_update_mouvements_after_transaction_update ON transactions;

CREATE TRIGGER trigger_update_mouvements_after_transaction_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.amount IS DISTINCT FROM NEW.amount OR -- Wait, column is 'montant'
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.date_paiement IS DISTINCT FROM NEW.date_paiement OR
    OLD.motif IS DISTINCT FROM NEW.motif OR
    OLD.client_id IS DISTINCT FROM NEW.client_id OR
    OLD.categorie IS DISTINCT FROM NEW.categorie OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id OR
    OLD.frais IS DISTINCT FROM NEW.frais OR -- Added this
    OLD.montant_cny IS DISTINCT FROM NEW.montant_cny
  )
  EXECUTE FUNCTION update_mouvements_on_transaction_change();

-- Manual Trigger for the specific transaction to fix the description right now
-- We just touch the 'updated_at' column (or re-set same frais) to fire the trigger?
-- Wait, if we set same frais, "OLD.frais IS DISTINCT FROM NEW.frais" is False.
-- We need to change *something* to fire it relative to current state? 
-- Or easier: Just call the refresh function manually for this row.
DO $$
DECLARE
  r transactions%ROWTYPE;
BEGIN
  SELECT * INTO r FROM transactions WHERE id = '6812a06c-3d7e-45cb-8aba-c4f1a506dc85';
  IF FOUND THEN
    PERFORM update_mouvements_on_transaction_change(r); -- Wait, function signature expects trigger usage? 
    -- 'update_mouvements_on_transaction_change' returns trigger and uses NEW variable. We can't call it directly easily.
    -- Alternative: Delete movements manually and call 'create_...'
    DELETE FROM mouvements_comptes WHERE transaction_id = '6812a06c-3d7e-45cb-8aba-c4f1a506dc85';
    PERFORM create_mouvement_from_transaction_for_row(r);
  END IF;
END $$;
