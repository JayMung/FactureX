-- Migration: Create function to chronologically recalculate account balance history

CREATE OR REPLACE FUNCTION recalculate_compte_mouvements_soldes(p_compte_id UUID)
RETURNS VOID AS $$
DECLARE
  v_mouvement RECORD;
  v_solde_courant DECIMAL(15,2) := 0;
BEGIN
  -- Parcourir tous les mouvements de ce compte dans l'ordre chronologique exact
  FOR v_mouvement IN 
    SELECT id, type_mouvement, montant 
    FROM mouvements_comptes
    WHERE compte_id = p_compte_id
    ORDER BY date_mouvement ASC, created_at ASC
  LOOP
    -- Calculer le nouveau solde_avant et solde_apres
    IF v_mouvement.type_mouvement = 'credit' THEN
      UPDATE mouvements_comptes
      SET solde_avant = v_solde_courant,
          solde_apres = v_solde_courant + v_mouvement.montant
      WHERE id = v_mouvement.id;
      
      v_solde_courant := v_solde_courant + v_mouvement.montant;
    ELSIF v_mouvement.type_mouvement = 'debit' THEN
      UPDATE mouvements_comptes
      SET solde_avant = v_solde_courant,
          solde_apres = v_solde_courant - v_mouvement.montant
      WHERE id = v_mouvement.id;
      
      v_solde_courant := v_solde_courant - v_mouvement.montant;
    END IF;
  END LOOP;
  
  -- Mettre à jour le solde final du compte après recalcul complet
  UPDATE comptes_financiers
  SET solde_actuel = v_solde_courant,
      updated_at = NOW()
  WHERE id = p_compte_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Créer (ou remplacer) les triggers sur les transactions pour appeler automatiquement cette fonction
-- Ce trigger s'exécutera après les triggers existants qui créent ou suppriment les mouvements_comptes
CREATE OR REPLACE FUNCTION trigger_recalculate_soldes_after_transaction()
RETURNS TRIGGER AS $$
BEGIN
  -- Re-calcul pour le compte source (Dépenses, Transferts)
  IF (TG_OP = 'DELETE' OR TG_OP = 'UPDATE') THEN
    IF OLD.compte_source_id IS NOT NULL THEN
      PERFORM recalculate_compte_mouvements_soldes(OLD.compte_source_id);
    END IF;
    IF OLD.compte_destination_id IS NOT NULL THEN
      PERFORM recalculate_compte_mouvements_soldes(OLD.compte_destination_id);
    END IF;
  END IF;

  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    IF NEW.compte_source_id IS NOT NULL THEN
      PERFORM recalculate_compte_mouvements_soldes(NEW.compte_source_id);
    END IF;
    IF NEW.compte_destination_id IS NOT NULL THEN
      PERFORM recalculate_compte_mouvements_soldes(NEW.compte_destination_id);
    END IF;
  END IF;
  
  RETURN NULL; -- Pour les triggers AFTER
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- S'assurer qu'il est exécuté en dernier
DROP TRIGGER IF EXISTS z_trigger_recalculate_after_transaction ON transactions;
CREATE TRIGGER z_trigger_recalculate_after_transaction
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_soldes_after_transaction();

-- On lance la passe initiale sur tous les comptes pour nettoyer l'existant
DO $$
DECLARE
  v_compte RECORD;
BEGIN
  FOR v_compte IN SELECT id FROM comptes_financiers LOOP
    PERFORM recalculate_compte_mouvements_soldes(v_compte.id);
  END LOOP;
END $$;
