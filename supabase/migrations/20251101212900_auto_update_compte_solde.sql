-- Migration: Auto-update compte financier solde when transactions are created/updated/deleted
-- This ensures that account balances are automatically synchronized with transactions

-- Function to update compte solde after transaction insert
CREATE OR REPLACE FUNCTION update_compte_solde_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour les revenus: augmenter le solde du compte destination
  IF NEW.type_transaction = 'revenue' AND NEW.compte_destination_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel + NEW.montant,
        updated_at = NOW()
    WHERE id = NEW.compte_destination_id;
  END IF;

  -- Pour les dépenses: diminuer le solde du compte source
  IF NEW.type_transaction = 'depense' AND NEW.compte_source_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel - NEW.montant,
        updated_at = NOW()
    WHERE id = NEW.compte_source_id;
  END IF;

  -- Pour les transferts: diminuer source et augmenter destination
  IF NEW.type_transaction = 'transfert' THEN
    IF NEW.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - NEW.montant,
          updated_at = NOW()
      WHERE id = NEW.compte_source_id;
    END IF;

    IF NEW.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + NEW.montant,
          updated_at = NOW()
      WHERE id = NEW.compte_destination_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revert compte solde before transaction update
CREATE OR REPLACE FUNCTION revert_compte_solde_before_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Annuler l'ancien impact sur les comptes
  -- Pour les revenus: diminuer le solde du compte destination
  IF OLD.type_transaction = 'revenue' AND OLD.compte_destination_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel - OLD.montant,
        updated_at = NOW()
    WHERE id = OLD.compte_destination_id;
  END IF;

  -- Pour les dépenses: augmenter le solde du compte source
  IF OLD.type_transaction = 'depense' AND OLD.compte_source_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel + OLD.montant,
        updated_at = NOW()
    WHERE id = OLD.compte_source_id;
  END IF;

  -- Pour les transferts: annuler les deux mouvements
  IF OLD.type_transaction = 'transfert' THEN
    IF OLD.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_source_id;
    END IF;

    IF OLD.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_destination_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revert compte solde after transaction delete
CREATE OR REPLACE FUNCTION revert_compte_solde_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Annuler l'impact de la transaction supprimée
  -- Pour les revenus: diminuer le solde du compte destination
  IF OLD.type_transaction = 'revenue' AND OLD.compte_destination_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel - OLD.montant,
        updated_at = NOW()
    WHERE id = OLD.compte_destination_id;
  END IF;

  -- Pour les dépenses: augmenter le solde du compte source
  IF OLD.type_transaction = 'depense' AND OLD.compte_source_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel + OLD.montant,
        updated_at = NOW()
    WHERE id = OLD.compte_source_id;
  END IF;

  -- Pour les transferts: annuler les deux mouvements
  IF OLD.type_transaction = 'transfert' THEN
    IF OLD.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_source_id;
    END IF;

    IF OLD.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_destination_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_compte_after_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_revert_compte_before_transaction_update ON transactions;
DROP TRIGGER IF EXISTS trigger_update_compte_after_transaction_update ON transactions;
DROP TRIGGER IF EXISTS trigger_revert_compte_after_transaction_delete ON transactions;

-- Create trigger for INSERT (new transaction)
CREATE TRIGGER trigger_update_compte_after_transaction_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_compte_solde_after_transaction();

-- Create trigger for UPDATE (modified transaction)
-- First revert the old values, then apply the new ones
CREATE TRIGGER trigger_revert_compte_before_transaction_update
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id
  )
  EXECUTE FUNCTION revert_compte_solde_before_update();

CREATE TRIGGER trigger_update_compte_after_transaction_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id
  )
  EXECUTE FUNCTION update_compte_solde_after_transaction();

-- Create trigger for DELETE (deleted transaction)
CREATE TRIGGER trigger_revert_compte_after_transaction_delete
  AFTER DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION revert_compte_solde_after_delete();

-- Add helpful comment
COMMENT ON FUNCTION update_compte_solde_after_transaction() IS 'Automatically updates compte financier balance when a transaction is created or updated';
COMMENT ON FUNCTION revert_compte_solde_before_update() IS 'Reverts the old compte financier balance before updating a transaction';
COMMENT ON FUNCTION revert_compte_solde_after_delete() IS 'Reverts the compte financier balance when a transaction is deleted';
