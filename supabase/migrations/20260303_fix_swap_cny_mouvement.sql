-- ============================================================
-- Fix: Swap USD->CNY - montant_converti not used in mouvement creation
-- Migration: fix_swap_cny_mouvement
-- Applied: 2026-03-03
-- ============================================================
-- Problem: create_mouvement_from_transaction_for_row uses
--   COALESCE(NULLIF(montant_cny, 0), montant)
-- but the solde trigger already uses
--   COALESCE(NULLIF(montant_converti, 0), NULLIF(montant_cny, 0), montant)
-- This means mouvements_comptes shows ¥145 instead of ¥1044.75
-- when doing a 145 USD → CNY swap.
-- Fix: align the mouvement creation to also prioritise montant_converti.
-- Also fix the description to show montant_converti when available.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_mouvement_from_transaction_for_row(tx_row transactions)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_solde_avant DECIMAL(15, 2);
  v_solde_apres DECIMAL(15, 2);
  v_description TEXT;
  v_organization_id UUID;
  v_montant_credit DECIMAL(15, 2);
  v_compte_nom TEXT;
BEGIN
  v_organization_id := tx_row.organization_id;

  -- REVENUE
  IF tx_row.type_transaction = 'revenue' AND tx_row.compte_destination_id IS NOT NULL THEN
    SELECT solde_actuel INTO v_solde_apres
    FROM comptes_financiers
    WHERE id = tx_row.compte_destination_id;
    v_solde_avant := v_solde_apres - tx_row.montant;
    v_description := 'Revenue';
    IF tx_row.client_id IS NOT NULL THEN
      v_description := v_description || ' - ' || (SELECT nom FROM clients WHERE id = tx_row.client_id LIMIT 1);
    END IF;
    INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
    VALUES (tx_row.compte_destination_id, tx_row.id, 'credit', tx_row.montant, v_solde_avant, v_solde_apres, v_description, tx_row.date_paiement, v_organization_id);
  END IF;

  -- DEPENSE
  IF tx_row.type_transaction = 'depense' AND tx_row.compte_source_id IS NOT NULL THEN
    SELECT solde_actuel INTO v_solde_apres
    FROM comptes_financiers
    WHERE id = tx_row.compte_source_id;
    v_solde_avant := v_solde_apres + tx_row.montant;
    v_description := 'Dépense';
    IF tx_row.motif IS NOT NULL THEN v_description := v_description || ' - ' || tx_row.motif; END IF;
    INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
    VALUES (tx_row.compte_source_id, tx_row.id, 'debit', tx_row.montant, v_solde_avant, v_solde_apres, v_description, tx_row.date_paiement, v_organization_id);
  END IF;

  -- TRANSFERT (including cross-currency swaps)
  IF tx_row.type_transaction = 'transfert' THEN
    -- SOURCE: debit
    IF tx_row.compte_source_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = tx_row.compte_source_id;
      
      v_solde_avant := v_solde_apres + tx_row.montant + COALESCE(tx_row.frais, 0);
      v_description := 'Transfert vers ' || (SELECT nom FROM comptes_financiers WHERE id = tx_row.compte_destination_id LIMIT 1);
      IF tx_row.frais > 0 THEN v_description := v_description || ' (Frais: ' || tx_row.frais || ')'; END IF;
      
      INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
      VALUES (tx_row.compte_source_id, tx_row.id, 'debit', tx_row.montant + COALESCE(tx_row.frais, 0), v_solde_avant, v_solde_apres, v_description, tx_row.date_paiement, v_organization_id);
    END IF;

    -- DESTINATION: credit
    -- FIX: Use COALESCE(montant_converti, montant_cny, montant) — same priority as the solde trigger
    IF tx_row.compte_destination_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = tx_row.compte_destination_id;
      
      -- Priority: montant_converti > montant_cny > montant (fallback for same-currency)
      v_montant_credit := COALESCE(
        NULLIF(tx_row.montant_converti, 0),
        NULLIF(tx_row.montant_cny, 0),
        tx_row.montant
      );
      v_solde_avant := v_solde_apres - v_montant_credit;
      v_description := 'Transfert depuis ' || (SELECT nom FROM comptes_financiers WHERE id = tx_row.compte_source_id LIMIT 1);
      
      -- Add swap info to description when converting currencies
      IF tx_row.montant_converti > 0 AND tx_row.montant_converti IS DISTINCT FROM tx_row.montant THEN
        -- Use montant_converti for description (most accurate)
        v_description := v_description || ' (Swap: ' || tx_row.montant || ' ' || tx_row.devise || ' → ' || tx_row.montant_converti || ')';
      ELSIF tx_row.montant_cny > 0 AND tx_row.montant_cny IS DISTINCT FROM tx_row.montant THEN
        v_description := v_description || ' (Swap ' || tx_row.montant || ' ' || tx_row.devise || ' -> ' || tx_row.montant_cny || ' CNY)';
      END IF;

      INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
      VALUES (tx_row.compte_destination_id, tx_row.id, 'credit', v_montant_credit, v_solde_avant, v_solde_apres, v_description, tx_row.date_paiement, v_organization_id);
    END IF;
  END IF;

  -- BALANCE ADJUSTMENT
  IF tx_row.type_transaction = 'balance_adjustment' THEN
    IF tx_row.compte_destination_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres FROM comptes_financiers WHERE id = tx_row.compte_destination_id;
      v_solde_avant := v_solde_apres - tx_row.montant;
      SELECT nom INTO v_compte_nom FROM comptes_financiers WHERE id = tx_row.compte_destination_id;
      v_description := 'Ajustement solde ouverture 2026 - ' || COALESCE(v_compte_nom, 'Compte');
      INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
      VALUES (tx_row.compte_destination_id, tx_row.id, 'credit', tx_row.montant, v_solde_avant, v_solde_apres, v_description, tx_row.date_paiement, v_organization_id);
    END IF;
    IF tx_row.compte_source_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres FROM comptes_financiers WHERE id = tx_row.compte_source_id;
      v_solde_avant := v_solde_apres + tx_row.montant;
      SELECT nom INTO v_compte_nom FROM comptes_financiers WHERE id = tx_row.compte_source_id;
      v_description := 'Ajustement solde ouverture 2026 - ' || COALESCE(v_compte_nom, 'Compte');
      INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
      VALUES (tx_row.compte_source_id, tx_row.id, 'debit', tx_row.montant, v_solde_avant, v_solde_apres, v_description, tx_row.date_paiement, v_organization_id);
    END IF;
  END IF;
END;
$$;
