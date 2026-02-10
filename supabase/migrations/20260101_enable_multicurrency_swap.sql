-- Migration: Enable Multi-Currency Swap (USD -> CNY)
-- This updates the core financial triggers to respect 'montant_cny' for cross-currency transfers.

-- 1. Update Function: update_compte_solde_after_transaction_with_fees
CREATE OR REPLACE FUNCTION update_compte_solde_after_transaction_with_fees()
RETURNS TRIGGER AS $$
BEGIN
  -- Revenue: Add to Destination
  IF NEW.type_transaction = 'revenue' AND NEW.compte_destination_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel + NEW.montant,
        updated_at = NOW()
    WHERE id = NEW.compte_destination_id;
  END IF;

  -- Depense: Subtract from Source
  IF NEW.type_transaction = 'depense' AND NEW.compte_source_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel - NEW.montant,
        updated_at = NOW()
    WHERE id = NEW.compte_source_id;
  END IF;

  -- Transfert: Subtract from Source (inc. fees), Add to Destination
  IF NEW.type_transaction = 'transfert' THEN
    -- Source: Debit Amount + Fees (in Source Currency, typically USD)
    IF NEW.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - NEW.montant - COALESCE(NEW.frais, 0),
          updated_at = NOW()
      WHERE id = NEW.compte_source_id;
    END IF;

    -- Destination: Credit Amount (OR converted Amount)
    IF NEW.compte_destination_id IS NOT NULL THEN
      -- Logic: If montant_cny is set and > 0, use it. Otherwise use montant.
      -- Ideally we should check the account currency, but assuming the frontend fills montant_cny only for CNY accounts works too.
      -- To be safe, we rely on the payload.
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + COALESCE(NULLIF(NEW.montant_cny, 0), NEW.montant),
          updated_at = NOW()
      WHERE id = NEW.compte_destination_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update Function: create_mouvement_from_transaction_for_row
CREATE OR REPLACE FUNCTION create_mouvement_from_transaction_for_row(tx_row transactions)
RETURNS VOID AS $$
DECLARE
  v_solde_avant DECIMAL(15, 2);
  v_solde_apres DECIMAL(15, 2);
  v_description TEXT;
  v_organization_id UUID;
  v_montant_credit DECIMAL(15, 2); -- To hold the actual credited amount
BEGIN
  -- Get organization_id from transaction
  v_organization_id := tx_row.organization_id;

  -- ... (Revenue Logic Unchanged) ...
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

  -- ... (Depense Logic Unchanged) ...
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
      
      -- Solde Avant = Solde Apres + Montant + Frais
      v_solde_avant := v_solde_apres + tx_row.montant + COALESCE(tx_row.frais, 0);
      
      v_description := 'Transfert vers ' || (
        SELECT nom FROM comptes_financiers WHERE id = tx_row.compte_destination_id LIMIT 1
      );
      IF tx_row.frais > 0 THEN
         v_description := v_description || ' (Frais: ' || tx_row.frais || ')';
      END IF;
      
      -- Note: In 'mouvements_comptes', we currently store the PRINCIPAL amount in 'montant'.
      -- But the balance change includes fees.
      -- Should we store (mountant + frais) as the movement amount? Or just principal?
      -- Usually accounting splits Principal vs Fees.
      -- BUT 'mouvements_comptes' is a single ledger line. 
      -- Simplest: Store TOTAL debit (Principal + Fees) as the movement amount to maintain Solde integrity.
      
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
        tx_row.montant + COALESCE(tx_row.frais, 0), -- Total Debit
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
      
      -- Determine Credit Amount (CNY or USD)
      v_montant_credit := COALESCE(NULLIF(tx_row.montant_cny, 0), tx_row.montant);

      v_solde_avant := v_solde_apres - v_montant_credit;
      
      v_description := 'Transfert depuis ' || (
        SELECT nom FROM comptes_financiers WHERE id = tx_row.compte_source_id LIMIT 1
      );
      
      -- Append conversion info if applicable
      IF tx_row.montant_cny > 0 AND tx_row.montant_cny IS DISTINCT FROM tx_row.montant THEN
        v_description := v_description || ' (Swap ' || tx_row.montant || ' ' || tx_row.devise || ' -> ' || tx_row.montant_cny || ' CNY)';
      END IF;
      
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
        v_montant_credit,
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
