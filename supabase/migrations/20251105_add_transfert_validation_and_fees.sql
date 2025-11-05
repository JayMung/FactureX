-- Migration: Add validation for negative balances and handle transfer fees

-- Function to validate compte solde before debit
CREATE OR REPLACE FUNCTION validate_compte_solde_before_debit()
RETURNS TRIGGER AS $$
DECLARE
  v_solde_actuel DECIMAL(15,2);
  v_montant_total DECIMAL(15,2);
BEGIN
  -- Pour les dépenses et transferts, vérifier que le solde est suffisant
  IF (NEW.type_transaction = 'depense' OR NEW.type_transaction = 'transfert') 
     AND NEW.compte_source_id IS NOT NULL THEN
    
    -- Récupérer le solde actuel du compte source
    SELECT solde_actuel INTO v_solde_actuel
    FROM comptes_financiers
    WHERE id = NEW.compte_source_id;
    
    -- Calculer le montant total (montant + frais pour les transferts)
    v_montant_total := NEW.montant;
    IF NEW.type_transaction = 'transfert' AND NEW.frais IS NOT NULL THEN
      v_montant_total := v_montant_total + NEW.frais;
    END IF;
    
    -- Vérifier que le solde est suffisant
    IF v_solde_actuel < v_montant_total THEN
      RAISE EXCEPTION 'Solde insuffisant. Solde actuel: %, Montant requis: %', 
        v_solde_actuel, v_montant_total;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update compte solde with transfer fees
CREATE OR REPLACE FUNCTION update_compte_solde_after_transaction_with_fees()
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

  -- Pour les transferts: diminuer source (montant + frais) et augmenter destination (montant seulement)
  IF NEW.type_transaction = 'transfert' THEN
    IF NEW.compte_source_id IS NOT NULL THEN
      -- Déduire le montant + les frais du compte source
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - NEW.montant - COALESCE(NEW.frais, 0),
          updated_at = NOW()
      WHERE id = NEW.compte_source_id;
    END IF;

    IF NEW.compte_destination_id IS NOT NULL THEN
      -- Ajouter seulement le montant au compte destination (pas les frais)
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + NEW.montant,
          updated_at = NOW()
      WHERE id = NEW.compte_destination_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to revert compte solde with fees
CREATE OR REPLACE FUNCTION revert_compte_solde_before_update_with_fees()
RETURNS TRIGGER AS $$
BEGIN
  -- Annuler l'ancien impact sur les comptes
  IF OLD.type_transaction = 'revenue' AND OLD.compte_destination_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel - OLD.montant,
        updated_at = NOW()
    WHERE id = OLD.compte_destination_id;
  END IF;

  IF OLD.type_transaction = 'depense' AND OLD.compte_source_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel + OLD.montant,
        updated_at = NOW()
    WHERE id = OLD.compte_source_id;
  END IF;

  -- Pour les transferts: annuler les deux mouvements avec frais
  IF OLD.type_transaction = 'transfert' THEN
    IF OLD.compte_source_id IS NOT NULL THEN
      -- Remettre le montant + les frais au compte source
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + OLD.montant + COALESCE(OLD.frais, 0),
          updated_at = NOW()
      WHERE id = OLD.compte_source_id;
    END IF;

    IF OLD.compte_destination_id IS NOT NULL THEN
      -- Retirer le montant du compte destination
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_destination_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old triggers
DROP TRIGGER IF EXISTS trigger_validate_solde_before_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_update_compte_after_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_revert_compte_before_update ON transactions;
DROP TRIGGER IF EXISTS trigger_update_compte_after_update ON transactions;

-- Create new triggers with validation
CREATE TRIGGER trigger_validate_solde_before_insert
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION validate_compte_solde_before_debit();

CREATE TRIGGER trigger_update_compte_after_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_compte_solde_after_transaction_with_fees();

CREATE TRIGGER trigger_revert_compte_before_update
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id OR
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.frais IS DISTINCT FROM NEW.frais OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction
  )
  EXECUTE FUNCTION revert_compte_solde_before_update_with_fees();

CREATE TRIGGER trigger_update_compte_after_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id OR
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.frais IS DISTINCT FROM NEW.frais OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction
  )
  EXECUTE FUNCTION update_compte_solde_after_transaction_with_fees();

-- Comments
COMMENT ON FUNCTION validate_compte_solde_before_debit() IS 'Validates that compte has sufficient balance before debit (including fees for transfers)';
COMMENT ON FUNCTION update_compte_solde_after_transaction_with_fees() IS 'Updates compte solde after transaction, handling transfer fees correctly';
COMMENT ON FUNCTION revert_compte_solde_before_update_with_fees() IS 'Reverts compte solde before transaction update, handling transfer fees correctly';
