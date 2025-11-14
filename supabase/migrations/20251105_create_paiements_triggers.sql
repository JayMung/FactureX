-- Migration: Create triggers for paiements to auto-update compte solde and create mouvements
-- This ensures that encaissements are synchronized with comptes and mouvements

-- ============================================
-- FUNCTION: Update compte solde after paiement insert
-- ============================================
CREATE OR REPLACE FUNCTION update_compte_solde_after_paiement()
RETURNS TRIGGER AS $$
BEGIN
  -- Un paiement est toujours un crédit sur le compte
  UPDATE comptes_financiers
  SET solde_actuel = solde_actuel + NEW.montant_paye,
      updated_at = NOW()
  WHERE id = NEW.compte_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Revert compte solde before paiement update
-- ============================================
CREATE OR REPLACE FUNCTION revert_compte_solde_before_paiement_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Annuler l'ancien impact (retirer le crédit)
  UPDATE comptes_financiers
  SET solde_actuel = solde_actuel - OLD.montant_paye,
      updated_at = NOW()
  WHERE id = OLD.compte_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Revert compte solde after paiement delete
-- ============================================
CREATE OR REPLACE FUNCTION revert_compte_solde_after_paiement_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Annuler le crédit
  UPDATE comptes_financiers
  SET solde_actuel = solde_actuel - OLD.montant_paye,
      updated_at = NOW()
  WHERE id = OLD.compte_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Create mouvement from paiement
-- ============================================
CREATE OR REPLACE FUNCTION create_mouvement_from_paiement()
RETURNS TRIGGER AS $$
DECLARE
  v_solde_avant DECIMAL(15,2);
  v_solde_apres DECIMAL(15,2);
  v_description TEXT;
BEGIN
  -- Récupérer le solde actuel du compte (qui a déjà été mis à jour)
  SELECT solde_actuel INTO v_solde_apres
  FROM comptes_financiers
  WHERE id = NEW.compte_id;

  -- Calculer le solde avant
  v_solde_avant := v_solde_apres - NEW.montant_paye;

  -- Construire la description
  v_description := 'Encaissement - ';
  IF NEW.type_paiement = 'facture' THEN
    v_description := v_description || 'Paiement facture';
  ELSIF NEW.type_paiement = 'colis' THEN
    v_description := v_description || 'Paiement colis';
  END IF;

  -- Créer le mouvement de compte (toujours un crédit)
  INSERT INTO mouvements_comptes (
    compte_id,
    type_mouvement,
    montant,
    solde_avant,
    solde_apres,
    description,
    date_mouvement,
    organization_id
  ) VALUES (
    NEW.compte_id,
    'credit',
    NEW.montant_paye,
    v_solde_avant,
    v_solde_apres,
    v_description,
    NEW.date_paiement,
    NEW.organization_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Delete mouvements from paiement
-- ============================================
CREATE OR REPLACE FUNCTION delete_mouvements_from_paiement()
RETURNS TRIGGER AS $$
BEGIN
  -- Supprimer les mouvements associés à ce paiement
  -- Note: On ne peut pas lier directement car il n'y a pas de paiement_id dans mouvements_comptes
  -- On supprime les mouvements qui correspondent au compte, montant et date
  DELETE FROM mouvements_comptes
  WHERE compte_id = OLD.compte_id
    AND montant = OLD.montant_paye
    AND date_mouvement = OLD.date_paiement
    AND type_mouvement = 'credit'
    AND description LIKE 'Encaissement%';

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DROP EXISTING TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_compte_after_paiement_insert ON paiements;
DROP TRIGGER IF EXISTS trigger_revert_compte_before_paiement_update ON paiements;
DROP TRIGGER IF EXISTS trigger_update_compte_after_paiement_update ON paiements;
DROP TRIGGER IF EXISTS trigger_revert_compte_after_paiement_delete ON paiements;
DROP TRIGGER IF EXISTS trigger_create_mouvement_after_paiement_insert ON paiements;
DROP TRIGGER IF EXISTS trigger_create_mouvement_after_paiement_update ON paiements;
DROP TRIGGER IF EXISTS trigger_delete_mouvements_before_paiement_delete ON paiements;

-- ============================================
-- CREATE TRIGGERS FOR INSERT
-- ============================================
-- 1. Update compte solde
CREATE TRIGGER trigger_update_compte_after_paiement_insert
  AFTER INSERT ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION update_compte_solde_after_paiement();

-- 2. Create mouvement (after solde is updated)
CREATE TRIGGER trigger_create_mouvement_after_paiement_insert
  AFTER INSERT ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION create_mouvement_from_paiement();

-- ============================================
-- CREATE TRIGGERS FOR UPDATE
-- ============================================
-- 1. Revert old solde
CREATE TRIGGER trigger_revert_compte_before_paiement_update
  BEFORE UPDATE ON paiements
  FOR EACH ROW
  WHEN (
    OLD.compte_id IS DISTINCT FROM NEW.compte_id OR
    OLD.montant_paye IS DISTINCT FROM NEW.montant_paye
  )
  EXECUTE FUNCTION revert_compte_solde_before_paiement_update();

-- 2. Apply new solde
CREATE TRIGGER trigger_update_compte_after_paiement_update
  AFTER UPDATE ON paiements
  FOR EACH ROW
  WHEN (
    OLD.compte_id IS DISTINCT FROM NEW.compte_id OR
    OLD.montant_paye IS DISTINCT FROM NEW.montant_paye
  )
  EXECUTE FUNCTION update_compte_solde_after_paiement();

-- 3. Delete old mouvements and create new ones
CREATE TRIGGER trigger_create_mouvement_after_paiement_update
  AFTER UPDATE ON paiements
  FOR EACH ROW
  WHEN (
    OLD.compte_id IS DISTINCT FROM NEW.compte_id OR
    OLD.montant_paye IS DISTINCT FROM NEW.montant_paye OR
    OLD.date_paiement IS DISTINCT FROM NEW.date_paiement
  )
  EXECUTE FUNCTION create_mouvement_from_paiement();

-- ============================================
-- CREATE TRIGGERS FOR DELETE
-- ============================================
-- 1. Delete mouvements first
CREATE TRIGGER trigger_delete_mouvements_before_paiement_delete
  BEFORE DELETE ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION delete_mouvements_from_paiement();

-- 2. Revert compte solde
CREATE TRIGGER trigger_revert_compte_after_paiement_delete
  AFTER DELETE ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION revert_compte_solde_after_paiement_delete();

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON FUNCTION update_compte_solde_after_paiement() IS 'Automatically updates compte financier balance when a paiement is created or updated';
COMMENT ON FUNCTION revert_compte_solde_before_paiement_update() IS 'Reverts the old compte financier balance before updating a paiement';
COMMENT ON FUNCTION revert_compte_solde_after_paiement_delete() IS 'Reverts the compte financier balance when a paiement is deleted';
COMMENT ON FUNCTION create_mouvement_from_paiement() IS 'Automatically creates mouvement_compte when a paiement is created or updated';
COMMENT ON FUNCTION delete_mouvements_from_paiement() IS 'Automatically deletes mouvements_comptes when a paiement is deleted';
