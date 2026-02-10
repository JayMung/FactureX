-- Migration: Fix mouvements_comptes to properly sync on transaction updates/deletes
-- This fixes the issue where movement history shows duplicate or stale entries
-- when transactions are modified or when accounts are swapped

-- Drop the old UPDATE trigger that was creating duplicate mouvements
DROP TRIGGER IF EXISTS trigger_create_mouvement_after_transaction_update ON transactions;

-- Enhanced function to delete old mouvements before creating new ones on UPDATE
CREATE OR REPLACE FUNCTION update_mouvements_on_transaction_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete ALL old mouvements linked to this transaction
  -- This ensures we don't have stale/duplicate entries when accounts are swapped
  DELETE FROM mouvements_comptes
  WHERE transaction_id = NEW.id;
  
  -- Now create fresh mouvements based on the NEW transaction state
  -- (We reuse the same logic as insert)
  PERFORM create_mouvement_from_transaction_for_row(NEW);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to create mouvements for a given transaction row
-- This allows us to reuse the same logic for INSERT and UPDATE
CREATE OR REPLACE FUNCTION create_mouvement_from_transaction_for_row(tx_row transactions)
RETURNS VOID AS $$
DECLARE
  v_solde_avant DECIMAL(15, 2);
  v_solde_apres DECIMAL(15, 2);
  v_description TEXT;
  v_organization_id UUID;
BEGIN
  -- Get organization_id from transaction
  v_organization_id := tx_row.organization_id;

  -- Pour les revenus: créer un mouvement CREDIT sur le compte destination
  IF tx_row.type_transaction = 'revenue' AND tx_row.compte_destination_id IS NOT NULL THEN
    -- Get solde after (already updated by previous trigger)
    SELECT solde_actuel INTO v_solde_apres
    FROM comptes_financiers
    WHERE id = tx_row.compte_destination_id;
    
    v_solde_avant := v_solde_apres - tx_row.montant;
    
    -- Build description
    v_description := 'Revenue';
    IF tx_row.client_id IS NOT NULL THEN
      v_description := v_description || ' - ' || (
        SELECT nom FROM clients WHERE id = tx_row.client_id LIMIT 1
      );
    END IF;
    IF tx_row.motif IS NOT NULL AND tx_row.motif != '' THEN
      v_description := v_description || ' - ' || tx_row.motif;
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
      tx_row.compte_destination_id,
      tx_row.id,
      'credit',
      tx_row.montant,
      v_solde_avant,
      v_solde_apres,
      v_description,
      tx_row.date_paiement,
      v_organization_id
    );
  END IF;

  -- Pour les dépenses: créer un mouvement DEBIT sur le compte source
  IF tx_row.type_transaction = 'depense' AND tx_row.compte_source_id IS NOT NULL THEN
    -- Get solde after (already updated by previous trigger)
    SELECT solde_actuel INTO v_solde_apres
    FROM comptes_financiers
    WHERE id = tx_row.compte_source_id;
    
    v_solde_avant := v_solde_apres + tx_row.montant;
    
    -- Build description
    v_description := 'Dépense';
    IF tx_row.motif IS NOT NULL AND tx_row.motif != '' THEN
      v_description := v_description || ' - ' || tx_row.motif;
    END IF;
    IF tx_row.categorie IS NOT NULL AND tx_row.categorie != '' THEN
      v_description := v_description || ' (' || tx_row.categorie || ')';
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
      tx_row.compte_source_id,
      tx_row.id,
      'debit',
      tx_row.montant,
      v_solde_avant,
      v_solde_apres,
      v_description,
      tx_row.date_paiement,
      v_organization_id
    );
  END IF;

  -- Pour les transferts: créer DEUX mouvements (débit source + crédit destination)
  IF tx_row.type_transaction = 'transfert' THEN
    -- Mouvement DEBIT sur compte source
    IF tx_row.compte_source_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = tx_row.compte_source_id;
      
      v_solde_avant := v_solde_apres + tx_row.montant;
      
      v_description := 'Transfert vers ' || (
        SELECT nom FROM comptes_financiers WHERE id = tx_row.compte_destination_id LIMIT 1
      );
      
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
        tx_row.compte_source_id,
        tx_row.id,
        'debit',
        tx_row.montant,
        v_solde_avant,
        v_solde_apres,
        v_description,
        tx_row.date_paiement,
        v_organization_id
      );
    END IF;

    -- Mouvement CREDIT sur compte destination
    IF tx_row.compte_destination_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = tx_row.compte_destination_id;
      
      v_solde_avant := v_solde_apres - tx_row.montant;
      
      v_description := 'Transfert depuis ' || (
        SELECT nom FROM comptes_financiers WHERE id = tx_row.compte_source_id LIMIT 1
      );
      
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
        tx_row.compte_destination_id,
        tx_row.id,
        'credit',
        tx_row.montant,
        v_solde_avant,
        v_solde_apres,
        v_description,
        tx_row.date_paiement,
        v_organization_id
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace the old INSERT trigger function with one that uses the helper
CREATE OR REPLACE FUNCTION create_mouvement_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_mouvement_from_transaction_for_row(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create NEW trigger for UPDATE that properly cleans up old mouvements
CREATE TRIGGER trigger_update_mouvements_after_transaction_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id
  )
  EXECUTE FUNCTION update_mouvements_on_transaction_change();

-- Add helpful comments
COMMENT ON FUNCTION update_mouvements_on_transaction_change() IS 'Deletes old mouvements and creates new ones when a transaction is updated (fixes duplicate movement history)';
COMMENT ON FUNCTION create_mouvement_from_transaction_for_row(transactions) IS 'Helper function to create mouvements for a specific transaction row (reusable logic)';
