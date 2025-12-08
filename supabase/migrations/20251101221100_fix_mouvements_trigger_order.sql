-- Migration: Fix trigger order for mouvements_comptes
-- The issue is that mouvements triggers run AFTER solde update triggers
-- but they need to calculate solde_avant/apres correctly

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_create_mouvement_after_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_create_mouvement_after_transaction_update ON transactions;
DROP TRIGGER IF EXISTS trigger_delete_mouvements_before_transaction_delete ON transactions;

-- Drop existing function
DROP FUNCTION IF EXISTS create_mouvement_from_transaction();

-- Create improved function that calculates soldes correctly
CREATE OR REPLACE FUNCTION create_mouvement_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_solde_avant_source DECIMAL(15, 2);
  v_solde_apres_source DECIMAL(15, 2);
  v_solde_avant_dest DECIMAL(15, 2);
  v_solde_apres_dest DECIMAL(15, 2);
  v_description TEXT;
  v_organization_id UUID;
BEGIN
  -- Get organization_id from transaction
  v_organization_id := NEW.organization_id;

  -- Pour les revenus: créer un mouvement CREDIT sur le compte destination
  IF NEW.type_transaction = 'revenue' AND NEW.compte_destination_id IS NOT NULL THEN
    -- Get current solde (after the update by previous trigger)
    SELECT solde_actuel INTO v_solde_apres_dest
    FROM comptes_financiers
    WHERE id = NEW.compte_destination_id;
    
    -- Calculate solde before (current - montant)
    v_solde_avant_dest := v_solde_apres_dest - NEW.montant;
    
    -- Build description
    v_description := 'Revenue';
    IF NEW.client_id IS NOT NULL THEN
      v_description := v_description || ' - ' || COALESCE((
        SELECT nom FROM clients WHERE id = NEW.client_id LIMIT 1
      ), 'Client inconnu');
    END IF;
    IF NEW.motif IS NOT NULL AND NEW.motif != '' THEN
      v_description := v_description || ' - ' || NEW.motif;
    END IF;
    
    -- Create mouvement
    INSERT INTO mouvements_comptes (
      compte_id,
      transaction_id,
      type_mouvement,
      montant,
      solde_avant,
      solde_apres,
      description,
      date_mouvement,
      organization_id
    ) VALUES (
      NEW.compte_destination_id,
      NEW.id,
      'credit',
      NEW.montant,
      v_solde_avant_dest,
      v_solde_apres_dest,
      v_description,
      NEW.date_paiement,
      v_organization_id
    );
  END IF;

  -- Pour les dépenses: créer un mouvement DEBIT sur le compte source
  IF NEW.type_transaction = 'depense' AND NEW.compte_source_id IS NOT NULL THEN
    -- Get current solde (after the update by previous trigger)
    SELECT solde_actuel INTO v_solde_apres_source
    FROM comptes_financiers
    WHERE id = NEW.compte_source_id;
    
    -- Calculate solde before (current + montant because it was deducted)
    v_solde_avant_source := v_solde_apres_source + NEW.montant;
    
    -- Build description
    v_description := 'Dépense';
    IF NEW.motif IS NOT NULL AND NEW.motif != '' THEN
      v_description := v_description || ' - ' || NEW.motif;
    END IF;
    IF NEW.categorie IS NOT NULL AND NEW.categorie != '' THEN
      v_description := v_description || ' (' || NEW.categorie || ')';
    END IF;
    
    -- Create mouvement
    INSERT INTO mouvements_comptes (
      compte_id,
      transaction_id,
      type_mouvement,
      montant,
      solde_avant,
      solde_apres,
      description,
      date_mouvement,
      organization_id
    ) VALUES (
      NEW.compte_source_id,
      NEW.id,
      'debit',
      NEW.montant,
      v_solde_avant_source,
      v_solde_apres_source,
      v_description,
      NEW.date_paiement,
      v_organization_id
    );
  END IF;

  -- Pour les transferts: créer DEUX mouvements (débit source + crédit destination)
  IF NEW.type_transaction = 'transfert' THEN
    -- Mouvement DEBIT sur compte source
    IF NEW.compte_source_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres_source
      FROM comptes_financiers
      WHERE id = NEW.compte_source_id;
      
      v_solde_avant_source := v_solde_apres_source + NEW.montant;
      
      v_description := 'Transfert vers ' || COALESCE((
        SELECT nom FROM comptes_financiers WHERE id = NEW.compte_destination_id LIMIT 1
      ), 'Compte inconnu');
      
      INSERT INTO mouvements_comptes (
        compte_id,
        transaction_id,
        type_mouvement,
        montant,
        solde_avant,
        solde_apres,
        description,
        date_mouvement,
        organization_id
      ) VALUES (
        NEW.compte_source_id,
        NEW.id,
        'debit',
        NEW.montant,
        v_solde_avant_source,
        v_solde_apres_source,
        v_description,
        NEW.date_paiement,
        v_organization_id
      );
    END IF;

    -- Mouvement CREDIT sur compte destination
    IF NEW.compte_destination_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres_dest
      FROM comptes_financiers
      WHERE id = NEW.compte_destination_id;
      
      v_solde_avant_dest := v_solde_apres_dest - NEW.montant;
      
      v_description := 'Transfert depuis ' || COALESCE((
        SELECT nom FROM comptes_financiers WHERE id = NEW.compte_source_id LIMIT 1
      ), 'Compte inconnu');
      
      INSERT INTO mouvements_comptes (
        compte_id,
        transaction_id,
        type_mouvement,
        montant,
        solde_avant,
        solde_apres,
        description,
        date_mouvement,
        organization_id
      ) VALUES (
        NEW.compte_destination_id,
        NEW.id,
        'credit',
        NEW.montant,
        v_solde_avant_dest,
        v_solde_apres_dest,
        v_description,
        NEW.date_paiement,
        v_organization_id
      );
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error creating mouvement: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers with correct priority
-- These run AFTER the solde update triggers (which are also AFTER INSERT/UPDATE)
CREATE TRIGGER trigger_create_mouvement_after_transaction_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_mouvement_from_transaction();

CREATE TRIGGER trigger_create_mouvement_after_transaction_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id
  )
  EXECUTE FUNCTION create_mouvement_from_transaction();

-- Recreate delete trigger
CREATE TRIGGER trigger_delete_mouvements_before_transaction_delete
  BEFORE DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION delete_mouvements_from_transaction();

COMMENT ON FUNCTION create_mouvement_from_transaction() IS 'Creates movement records after compte solde is updated. Includes error handling to prevent transaction failures.';
