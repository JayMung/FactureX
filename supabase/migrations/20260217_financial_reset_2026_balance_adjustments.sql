-- ============================================================
-- Financial Reset Strategy 2026: balance_adjustment type
-- Migration: financial_reset_2026_balance_adjustments
-- Applied: 2026-02-17
-- ============================================================
-- Adds 'balance_adjustment' transaction type for creating clean
-- opening balances for 2026. Adjustments affect account balances
-- and create audit trail mouvements, but are excluded from all
-- dashboard KPIs (revenue, supplier, operational, margin, profit).
-- ============================================================

-- 1) DROP and recreate CHECK constraints to allow 'balance_adjustment'
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_type_transaction_valide;
ALTER TABLE transactions ADD CONSTRAINT check_type_transaction_valide
  CHECK (type_transaction = ANY (ARRAY['revenue','depense','transfert','balance_adjustment']));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_transaction_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_transaction_check
  CHECK (type_transaction = ANY (ARRAY['revenue','depense','transfert','balance_adjustment']));

-- 2) Update validate_transaction_data to accept balance_adjustment
CREATE OR REPLACE FUNCTION public.validate_transaction_data(
  p_montant NUMERIC,
  p_devise TEXT,
  p_type_transaction TEXT,
  p_motif TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_montant <= 0 OR p_montant > 999999999.99 THEN
    RETURN false;
  END IF;
  
  IF p_devise NOT IN ('USD', 'CDF', 'CNY') THEN
    RETURN false;
  END IF;
  
  IF p_type_transaction NOT IN ('revenue', 'depense', 'transfert', 'balance_adjustment') THEN
    RETURN false;
  END IF;
  
  IF p_motif IS NULL OR LENGTH(TRIM(p_motif)) = 0 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 3) Update validate_transaction_before_insert: skip frais/benefice/cny calc for adjustments
CREATE OR REPLACE FUNCTION public.validate_transaction_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT validate_transaction_data(NEW.montant, NEW.devise, NEW.type_transaction, NEW.motif) THEN
    RAISE EXCEPTION 'Données de transaction invalides';
  END IF;

  IF NEW.type_transaction = 'balance_adjustment' THEN
    NEW.frais := 0;
    NEW.benefice := 0;
    NEW.montant_cny := 0;
    NEW.taux_usd_cny := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCny' AND categorie = 'taux_change');
    NEW.taux_usd_cdf := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCdf' AND categorie = 'taux_change');
    RETURN NEW;
  END IF;

  -- Original logic for other types
  NEW.frais := COALESCE(NEW.frais, calculate_transaction_frais(NEW.montant, NEW.motif, NEW.type_transaction));
  NEW.benefice := calculate_transaction_benefice(NEW.montant, NEW.frais, NEW.motif, NEW.type_transaction);
  NEW.montant_cny := COALESCE(NEW.montant_cny, calculate_montant_cny(NEW.montant, NEW.frais, NEW.devise));
  NEW.taux_usd_cny := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCny' AND categorie = 'taux_change');
  NEW.taux_usd_cdf := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCdf' AND categorie = 'taux_change');

  RETURN NEW;
END;
$$;

-- 4) Update solde trigger: handle balance_adjustment (credit dest OR debit source)
CREATE OR REPLACE FUNCTION public.update_compte_solde_after_transaction_with_fees()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type_transaction = 'revenue' AND NEW.compte_destination_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel + NEW.montant,
        updated_at = NOW()
    WHERE id = NEW.compte_destination_id;
  END IF;

  IF NEW.type_transaction = 'depense' AND NEW.compte_source_id IS NOT NULL THEN
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel - NEW.montant,
        updated_at = NOW()
    WHERE id = NEW.compte_source_id;
  END IF;

  IF NEW.type_transaction = 'transfert' THEN
    IF NEW.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - NEW.montant - COALESCE(NEW.frais, 0),
          updated_at = NOW()
      WHERE id = NEW.compte_source_id;
    END IF;
    IF NEW.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + COALESCE(
            NULLIF(NEW.montant_converti, 0),
            NULLIF(NEW.montant_cny, 0),
            NEW.montant
          ),
          updated_at = NOW()
      WHERE id = NEW.compte_destination_id;
    END IF;
  END IF;

  -- balance_adjustment: credit destination OR debit source
  IF NEW.type_transaction = 'balance_adjustment' THEN
    IF NEW.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + NEW.montant,
          updated_at = NOW()
      WHERE id = NEW.compte_destination_id;
    END IF;
    IF NEW.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - NEW.montant,
          updated_at = NOW()
      WHERE id = NEW.compte_source_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 5) Update revert on UPDATE trigger
CREATE OR REPLACE FUNCTION public.revert_compte_solde_before_update_with_fees()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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

  IF OLD.type_transaction = 'transfert' THEN
    IF OLD.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + OLD.montant + COALESCE(OLD.frais, 0),
          updated_at = NOW()
      WHERE id = OLD.compte_source_id;
    END IF;
    IF OLD.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - COALESCE(
            NULLIF(OLD.montant_converti, 0),
            NULLIF(OLD.montant_cny, 0),
            OLD.montant
          ),
          updated_at = NOW()
      WHERE id = OLD.compte_destination_id;
    END IF;
  END IF;

  -- Revert balance_adjustment
  IF OLD.type_transaction = 'balance_adjustment' THEN
    IF OLD.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_destination_id;
    END IF;
    IF OLD.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_source_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6) Update revert on DELETE trigger
CREATE OR REPLACE FUNCTION public.revert_compte_solde_after_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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

  IF OLD.type_transaction = 'transfert' THEN
    IF OLD.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + OLD.montant + COALESCE(OLD.frais, 0),
          updated_at = NOW()
      WHERE id = OLD.compte_source_id;
    END IF;
    IF OLD.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - COALESCE(
            NULLIF(OLD.montant_converti, 0),
            NULLIF(OLD.montant_cny, 0),
            OLD.montant
          ),
          updated_at = NOW()
      WHERE id = OLD.compte_destination_id;
    END IF;
  END IF;

  -- Revert balance_adjustment on delete
  IF OLD.type_transaction = 'balance_adjustment' THEN
    IF OLD.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_destination_id;
    END IF;
    IF OLD.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + OLD.montant,
          updated_at = NOW()
      WHERE id = OLD.compte_source_id;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- 7) Update validate_compte_solde_before_debit: role-based check for balance_adjustment
--    Allows negative balance ONLY if caller is super_admin
CREATE OR REPLACE FUNCTION public.validate_compte_solde_before_debit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_solde_actuel DECIMAL(15,2);
  v_montant_total DECIMAL(15,2);
  v_solde_apres DECIMAL(15,2);
  v_caller_role TEXT;
BEGIN
  -- Balance adjustments: allow if result >= 0, or if caller is super_admin
  IF NEW.type_transaction = 'balance_adjustment' THEN
    IF NEW.compte_source_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_actuel
      FROM comptes_financiers
      WHERE id = NEW.compte_source_id;

      v_solde_apres := COALESCE(v_solde_actuel, 0) - NEW.montant;

      IF v_solde_apres < 0 THEN
        SELECT raw_app_meta_data->>'role' INTO v_caller_role
        FROM auth.users
        WHERE id = auth.uid();

        IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
          RAISE EXCEPTION 'Solde négatif interdit pour balance_adjustment. Seul un super_admin peut créer un ajustement résultant en solde négatif. Solde actuel: %, Montant: %, Résultat: %',
            v_solde_actuel, NEW.montant, v_solde_apres;
        END IF;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Original logic for depense/transfert
  IF (NEW.type_transaction = 'depense' OR NEW.type_transaction = 'transfert') 
     AND NEW.compte_source_id IS NOT NULL THEN
    
    SELECT solde_actuel INTO v_solde_actuel
    FROM comptes_financiers
    WHERE id = NEW.compte_source_id;
    
    v_montant_total := NEW.montant;
    IF NEW.type_transaction = 'transfert' AND NEW.frais IS NOT NULL THEN
      v_montant_total := v_montant_total + NEW.frais;
    END IF;
    
    IF v_solde_actuel < v_montant_total THEN
      RAISE EXCEPTION 'Solde insuffisant. Solde actuel: %, Montant requis: %', 
        v_solde_actuel, v_montant_total;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 8) Update mouvement creation: handle balance_adjustment
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

  -- TRANSFERT
  IF tx_row.type_transaction = 'transfert' THEN
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

    IF tx_row.compte_destination_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = tx_row.compte_destination_id;
      
      v_montant_credit := COALESCE(NULLIF(tx_row.montant_cny, 0), tx_row.montant);
      v_solde_avant := v_solde_apres - v_montant_credit;
      v_description := 'Transfert depuis ' || (SELECT nom FROM comptes_financiers WHERE id = tx_row.compte_source_id LIMIT 1);
      IF tx_row.montant_cny > 0 AND tx_row.montant_cny IS DISTINCT FROM tx_row.montant THEN
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

-- 9) Create the create_opening_balance RPC (Option A: target balance)
--    Security: negative target requires super_admin role
CREATE OR REPLACE FUNCTION public.create_opening_balance(
  p_account_id UUID,
  p_target_balance NUMERIC,
  p_effective_date TIMESTAMPTZ DEFAULT '2026-01-01T00:00:00Z'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_devise TEXT;
  v_org_id UUID;
  v_delta NUMERIC;
  v_txn_id UUID;
  v_direction TEXT;
  v_caller_role TEXT;
BEGIN
  -- Get account info
  SELECT solde_actuel, devise, organization_id
  INTO v_current_balance, v_devise, v_org_id
  FROM comptes_financiers
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compte financier introuvable: %', p_account_id;
  END IF;

  -- Verify caller belongs to org
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not belong to this organization';
  END IF;

  -- Security: negative target requires super_admin
  IF p_target_balance < 0 THEN
    SELECT raw_app_meta_data->>'role' INTO v_caller_role
    FROM auth.users
    WHERE id = auth.uid();

    IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
      RAISE EXCEPTION 'Solde cible négatif interdit. Seul un super_admin peut définir un solde d''ouverture négatif. Cible demandée: %', p_target_balance;
    END IF;
  END IF;

  v_delta := p_target_balance - v_current_balance;

  -- No-op if already at target
  IF v_delta = 0 THEN
    RETURN json_build_object(
      'status', 'no_change',
      'account_id', p_account_id,
      'current_balance', v_current_balance,
      'target_balance', p_target_balance,
      'message', 'Le solde est déjà au montant cible'
    );
  END IF;

  IF v_delta > 0 THEN
    v_direction := 'credit';
    INSERT INTO transactions (
      montant, devise, type_transaction, motif, categorie,
      compte_destination_id, compte_source_id,
      statut, date_paiement, frais, benefice, montant_cny
    ) VALUES (
      ABS(v_delta), v_devise, 'balance_adjustment',
      'Ajustement solde d''ouverture 2026',
      'Balance Adjustment',
      p_account_id, NULL,
      'En attente', p_effective_date, 0, 0, 0
    ) RETURNING id INTO v_txn_id;
  ELSE
    v_direction := 'debit';
    INSERT INTO transactions (
      montant, devise, type_transaction, motif, categorie,
      compte_source_id, compte_destination_id,
      statut, date_paiement, frais, benefice, montant_cny
    ) VALUES (
      ABS(v_delta), v_devise, 'balance_adjustment',
      'Ajustement solde d''ouverture 2026',
      'Balance Adjustment',
      p_account_id, NULL,
      'En attente', p_effective_date, 0, 0, 0
    ) RETURNING id INTO v_txn_id;
  END IF;

  RETURN json_build_object(
    'status', 'created',
    'transaction_id', v_txn_id,
    'account_id', p_account_id,
    'previous_balance', v_current_balance,
    'adjustment', v_delta,
    'direction', v_direction,
    'new_target_balance', p_target_balance,
    'devise', v_devise,
    'effective_date', p_effective_date
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_opening_balance(UUID, NUMERIC, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.create_opening_balance IS
  'Creates a balance_adjustment transaction to set a financial account to a target balance. Used for 2026 opening balances. Calculates delta automatically. Org-scoped, SECURITY DEFINER.';

-- 10) Update get_dashboard_overview_secure: exclude balance_adjustment + add dataWarning
-- See separate migration file: 20260217_update_dashboard_overview_4_categories.sql for base version.
-- This migration adds:
--   - AND type_transaction != 'balance_adjustment' to all subqueries
--   - 'dataWarning' key for pre-2026 periods
CREATE OR REPLACE FUNCTION public.get_dashboard_overview_secure(
  p_organization_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_prev_start TIMESTAMPTZ;
  v_prev_end   TIMESTAMPTZ;
  v_data_warning TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not belong to this organization';
  END IF;

  v_prev_end   := p_start_date;
  v_prev_start := p_start_date - (p_end_date - p_start_date);

  -- Data warning for pre-2026 periods
  IF p_start_date < '2026-01-01T00:00:00Z'::TIMESTAMPTZ THEN
    v_data_warning := 'Les données avant le 1er janvier 2026 ne sont pas entièrement auditées';
  ELSE
    v_data_warning := NULL;
  END IF;

  SELECT json_build_object(
    'totalRevenueUSD',          COALESCE(curr.revenue_usd, 0),
    'supplierCostUSD',          COALESCE(curr.supplier_cost_usd, 0),
    'operationalExpensesUSD',   COALESCE(curr.operational_expenses_usd, 0),
    'totalExpensesUSD',         COALESCE(curr.supplier_cost_usd, 0) + COALESCE(curr.operational_expenses_usd, 0),
    'netMarginUSD',             COALESCE(curr.revenue_usd, 0) - COALESCE(curr.supplier_cost_usd, 0),
    'netProfitUSD',             COALESCE(curr.revenue_usd, 0) - COALESCE(curr.supplier_cost_usd, 0) - COALESCE(curr.operational_expenses_usd, 0),
    'totalFrais',               COALESCE(curr.total_frais, 0),
    'totalFactures',            COALESCE(fct.total_factures, 0),
    'facturesValidees',         COALESCE(fct.factures_validees, 0),
    'facturesEnAttente',        COALESCE(fct.factures_en_attente, 0),
    'activeClients',            COALESCE(curr.active_clients, 0),
    'currencyBreakdown',        COALESCE(cb.breakdown, '[]'::json),
    'dailyStats',               COALESCE(ds.stats, '[]'::json),
    'topTransactions',          COALESCE(tt.top_list, '[]'::json),
    'revenueChange',  json_build_object(
      'value',      COALESCE(chg.revenue_change_pct, 0),
      'isPositive', COALESCE(chg.revenue_change_pct, 0) >= 0
    ),
    'expenseChange', json_build_object(
      'value',      COALESCE(chg.expense_change_pct, 0),
      'isPositive', COALESCE(chg.expense_change_pct, 0) >= 0
    ),
    'profitChange',  json_build_object(
      'value',      COALESCE(chg.profit_change_pct, 0),
      'isPositive', COALESCE(chg.profit_change_pct, 0) >= 0
    ),
    'marginChange',  json_build_object(
      'value',      COALESCE(chg.margin_change_pct, 0),
      'isPositive', COALESCE(chg.margin_change_pct, 0) >= 0
    ),
    'dataWarning', v_data_warning
  ) INTO v_result

  FROM (
    SELECT
      MAX(CASE WHEN cle = 'usdToCdf' THEN valeur::NUMERIC END) AS usd_to_cdf,
      MAX(CASE WHEN cle = 'usdToCny' THEN valeur::NUMERIC END) AS usd_to_cny
    FROM settings
    WHERE categorie = 'taux_change'
      AND cle IN ('usdToCdf', 'usdToCny')
  ) AS rates

  CROSS JOIN LATERAL (
    SELECT
      COALESCE(SUM(
        CASE WHEN type_transaction = 'revenue' THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END
      ), 0) AS revenue_usd,
      COALESCE(SUM(
        CASE WHEN type_transaction = 'depense' AND is_supplier_expense(categorie, motif, devise, compte_destination_id) THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END
      ), 0) AS supplier_cost_usd,
      COALESCE(SUM(
        CASE WHEN type_transaction = 'depense' AND NOT is_supplier_expense(categorie, motif, devise, compte_destination_id) THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END
      ), 0) AS operational_expenses_usd,
      COALESCE(SUM(
        CASE WHEN type_transaction = 'revenue' THEN frais ELSE 0 END
      ), 0) AS total_frais,
      COUNT(DISTINCT CASE WHEN type_transaction = 'revenue' THEN client_id END) AS active_clients
    FROM transactions
    WHERE organization_id = p_organization_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
      AND type_transaction != 'balance_adjustment'
  ) AS curr

  CROSS JOIN LATERAL (
    SELECT
      COUNT(*) AS total_factures,
      COUNT(*) FILTER (WHERE statut = 'payee') AS factures_validees,
      COUNT(*) FILTER (WHERE statut = 'brouillon') AS factures_en_attente
    FROM factures
    WHERE organization_id = p_organization_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ) AS fct

  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object('currency', sub.devise, 'total', sub.total_amount, 'count', sub.txn_count)),
      '[]'::json
    ) AS breakdown
    FROM (
      SELECT devise, SUM(montant) AS total_amount, COUNT(*) AS txn_count
      FROM transactions
      WHERE organization_id = p_organization_id
        AND type_transaction = 'revenue'
        AND created_at >= p_start_date AND created_at <= p_end_date
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
        AND type_transaction != 'balance_adjustment'
      GROUP BY devise ORDER BY total_amount DESC
    ) sub
  ) AS cb

  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object(
        'date', sub.day_date,
        'revenueUSD', sub.day_revenue,
        'supplierCostUSD', sub.day_supplier,
        'operationalExpensesUSD', sub.day_operational,
        'netMarginUSD', sub.day_revenue - sub.day_supplier
      ) ORDER BY sub.day_date),
      '[]'::json
    ) AS stats
    FROM (
      SELECT
        date_trunc('day', created_at)::DATE AS day_date,
        COALESCE(SUM(CASE WHEN type_transaction = 'revenue' THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) AS day_revenue,
        COALESCE(SUM(CASE WHEN type_transaction = 'depense' AND is_supplier_expense(categorie, motif, devise, compte_destination_id) THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) AS day_supplier,
        COALESCE(SUM(CASE WHEN type_transaction = 'depense' AND NOT is_supplier_expense(categorie, motif, devise, compte_destination_id) THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) AS day_operational
      FROM transactions
      WHERE organization_id = p_organization_id
        AND created_at >= p_start_date AND created_at <= p_end_date
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
        AND type_transaction != 'balance_adjustment'
      GROUP BY day_date
    ) sub
  ) AS ds

  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object(
        'id', sub.id, 'montant', sub.montant, 'devise', sub.devise,
        'motif', sub.motif, 'client_name', sub.client_name, 'created_at', sub.created_at
      )),
      '[]'::json
    ) AS top_list
    FROM (
      SELECT t.id, t.montant, t.devise, t.motif,
        COALESCE(c.nom, 'Client inconnu') AS client_name, t.created_at
      FROM transactions t LEFT JOIN clients c ON c.id = t.client_id
      WHERE t.organization_id = p_organization_id
        AND t.type_transaction = 'revenue'
        AND t.created_at >= p_start_date AND t.created_at <= p_end_date
        AND COALESCE(t.statut, '') NOT IN ('Remboursé', 'Annulé')
      ORDER BY t.montant DESC LIMIT 5
    ) sub
  ) AS tt

  CROSS JOIN LATERAL (
    SELECT
      ROUND(CASE
        WHEN prev.prev_revenue = 0 AND curr.revenue_usd > 0 THEN 100
        WHEN prev.prev_revenue = 0 THEN 0
        ELSE ((curr.revenue_usd - prev.prev_revenue) / ABS(prev.prev_revenue)) * 100
      END, 1) AS revenue_change_pct,
      ROUND(CASE
        WHEN prev.prev_total_expenses = 0 AND (curr.supplier_cost_usd + curr.operational_expenses_usd) > 0 THEN 100
        WHEN prev.prev_total_expenses = 0 THEN 0
        ELSE (((curr.supplier_cost_usd + curr.operational_expenses_usd) - prev.prev_total_expenses) / ABS(prev.prev_total_expenses)) * 100
      END, 1) AS expense_change_pct,
      ROUND(CASE
        WHEN prev.prev_profit = 0 AND (curr.revenue_usd - curr.supplier_cost_usd - curr.operational_expenses_usd) > 0 THEN 100
        WHEN prev.prev_profit = 0 THEN 0
        ELSE (((curr.revenue_usd - curr.supplier_cost_usd - curr.operational_expenses_usd) - prev.prev_profit) / ABS(NULLIF(prev.prev_profit, 0))) * 100
      END, 1) AS profit_change_pct,
      ROUND(CASE
        WHEN prev.prev_margin = 0 AND (curr.revenue_usd - curr.supplier_cost_usd) > 0 THEN 100
        WHEN prev.prev_margin = 0 THEN 0
        ELSE (((curr.revenue_usd - curr.supplier_cost_usd) - prev.prev_margin) / ABS(NULLIF(prev.prev_margin, 0))) * 100
      END, 1) AS margin_change_pct
    FROM (
      SELECT
        COALESCE(SUM(CASE WHEN type_transaction = 'revenue' THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) AS prev_revenue,
        COALESCE(SUM(CASE WHEN type_transaction = 'depense' THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) AS prev_total_expenses,
        COALESCE(SUM(CASE WHEN type_transaction = 'revenue' THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type_transaction = 'depense' THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) AS prev_profit,
        COALESCE(SUM(CASE WHEN type_transaction = 'revenue' THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type_transaction = 'depense' AND is_supplier_expense(categorie, motif, devise, compte_destination_id) THEN
          CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
        ELSE 0 END), 0) AS prev_margin
      FROM transactions
      WHERE organization_id = p_organization_id
        AND created_at >= v_prev_start AND created_at < v_prev_end
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
        AND type_transaction != 'balance_adjustment'
    ) AS prev
  ) AS chg;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_overview_secure(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

COMMENT ON FUNCTION public.get_dashboard_overview_secure IS
  'V2.2 Dashboard RPC — 4-category financial model. Excludes balance_adjustment transactions from all KPIs. Includes dataWarning for pre-2026 periods. Organization-scoped, SECURITY DEFINER.';
