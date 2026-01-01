-- Migration: Fix trigger conditions to include date_paiement and other fields
-- Previously, the trigger only fired for amount or account changes, ignoring date changes.

DROP TRIGGER IF EXISTS trigger_update_mouvements_after_transaction_update ON transactions;

CREATE TRIGGER trigger_update_mouvements_after_transaction_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id OR
    OLD.date_paiement IS DISTINCT FROM NEW.date_paiement OR
    OLD.motif IS DISTINCT FROM NEW.motif OR
    OLD.client_id IS DISTINCT FROM NEW.client_id OR
    OLD.categorie IS DISTINCT FROM NEW.categorie
  )
  EXECUTE FUNCTION update_mouvements_on_transaction_change();
