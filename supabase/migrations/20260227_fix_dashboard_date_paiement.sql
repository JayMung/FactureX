-- Migration to fix dashboard analytics using date_paiement instead of created_at
-- This ensures that backdated transactions (e.g. reconciliation in 2025) are correctly correctly placed in their respective periods
-- regardless of when they were technically inserted into the database.

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
  v_incomplete_count INTEGER;
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

  -- Count incomplete transactions for warning logic (using date_paiement)
  SELECT COUNT(*) INTO v_incomplete_count
  FROM transactions
  WHERE organization_id = p_organization_id
    AND is_complete = false
    AND type_transaction != 'balance_adjustment'
    AND date_paiement >= p_start_date
    AND date_paiement <= p_end_date;

  -- Data warning: pre-2026 or incomplete transactions
  IF p_start_date < '2026-01-01T00:00:00Z'::TIMESTAMPTZ AND v_incomplete_count > 0 THEN
    v_data_warning := 'Les données avant le 1er janvier 2026 ne sont pas entièrement auditées. ' || v_incomplete_count || ' transaction(s) incomplète(s) nécessitent validation.';
  ELSIF p_start_date < '2026-01-01T00:00:00Z'::TIMESTAMPTZ THEN
    v_data_warning := 'Les données avant le 1er janvier 2026 ne sont pas entièrement auditées';
  ELSIF v_incomplete_count > 0 THEN
    v_data_warning := 'Certaines transactions sont marquées comme incomplètes';
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
    'dataWarning',                    v_data_warning,
    'incompleteTransactionsCount',    COALESCE(inc.incomplete_count, 0),
    'incompleteAmountUSD',            COALESCE(inc.incomplete_amount_usd, 0)
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
      -- CHANGE: date_paiement instead of created_at
      AND date_paiement >= p_start_date
      AND date_paiement <= p_end_date
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
      -- KEEP: created_at for factures (usually tracked by emission date)
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
        -- CHANGE: date_paiement
        AND date_paiement >= p_start_date AND date_paiement <= p_end_date
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
        -- CHANGE: date_trunc on date_paiement
        date_trunc('day', date_paiement)::DATE AS day_date,
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
        -- CHANGE: date_paiement
        AND date_paiement >= p_start_date AND date_paiement <= p_end_date
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
        AND type_transaction != 'balance_adjustment'
      GROUP BY day_date
    ) sub
  ) AS ds

  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object(
        'id',          sub.id,
        'montant',     sub.montant,
        'devise',      sub.devise,
        'motif',       sub.motif,
        'client_name', sub.client_name,
        'created_at',  sub.created_at -- Keep created_at for display or switch to date_paiement? Let's keep structure but sort by date_paiement
      )),
      '[]'::json
    ) AS top_list
    FROM (
      SELECT
        t.id,
        t.montant,
        t.devise,
        t.motif,
        COALESCE(c.nom, 'Client inconnu') AS client_name,
        t.created_at
      FROM transactions t
      LEFT JOIN clients c ON c.id = t.client_id
      WHERE t.organization_id = p_organization_id
        AND t.type_transaction = 'revenue'
        -- CHANGE: date_paiement
        AND t.date_paiement >= p_start_date
        AND t.date_paiement <= p_end_date
        AND COALESCE(t.statut, '') NOT IN ('Remboursé', 'Annulé')
      ORDER BY t.montant DESC
      LIMIT 5
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
        COALESCE(SUM(
          CASE WHEN type_transaction = 'revenue' THEN
            CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
          ELSE 0 END
        ), 0) AS prev_revenue,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'depense' THEN
            CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
          ELSE 0 END
        ), 0) AS prev_total_expenses,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'revenue' THEN
            CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
          ELSE 0 END
        ), 0)
        -
        COALESCE(SUM(
          CASE WHEN type_transaction = 'depense' THEN
            CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
          ELSE 0 END
        ), 0) AS prev_profit,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'revenue' THEN
            CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
          ELSE 0 END
        ), 0)
        -
        COALESCE(SUM(
          CASE WHEN type_transaction = 'depense'
                AND is_supplier_expense(categorie, motif, devise, compte_destination_id)
          THEN
            CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
          ELSE 0 END
        ), 0) AS prev_margin

      FROM transactions
      WHERE organization_id = p_organization_id
        -- CHANGE: date_paiement
        AND date_paiement >= v_prev_start
        AND date_paiement < v_prev_end
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
    ) AS prev
  ) AS chg

  -- Inc Stats
  CROSS JOIN LATERAL (
    SELECT
      COUNT(*) AS incomplete_count,
      COALESCE(SUM(
        CASE devise WHEN 'USD' THEN montant WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1) WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1) ELSE montant END
      ), 0) AS incomplete_amount_usd
    FROM transactions
    WHERE organization_id = p_organization_id
      AND is_complete = false
      AND type_transaction != 'balance_adjustment'
      -- CHANGE: date_paiement
      AND date_paiement >= p_start_date
      AND date_paiement <= p_end_date
  ) AS inc;

  RETURN v_result;
END;
$$;
