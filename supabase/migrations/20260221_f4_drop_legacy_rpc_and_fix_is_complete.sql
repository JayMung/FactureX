-- F4-C2: DROP RPC legacy get_dashboard_analytics_secure
-- Plus aucun consommateur frontend après migration F4-C1
DROP FUNCTION IF EXISTS public.get_dashboard_analytics_secure(TEXT, TEXT);

-- F4-C3: Ajouter AND is_complete = true dans toutes les subqueries KPI
-- Décision comptable: les transactions incomplètes ne doivent PAS impacter les KPIs
-- Elles restent visibles via incompleteTransactionsCount / incompleteAmountUSD

CREATE OR REPLACE FUNCTION public.get_dashboard_overview_secure(
  p_organization_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  -- Count incomplete transactions for warning (excluded from KPIs)
  SELECT COUNT(*) INTO v_incomplete_count
  FROM transactions
  WHERE organization_id = p_organization_id
    AND is_complete = false
    AND type_transaction != 'balance_adjustment'
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- Data warning logic
  IF p_start_date < '2026-01-01T00:00:00Z'::TIMESTAMPTZ AND v_incomplete_count > 0 THEN
    v_data_warning := 'Les données avant le 1er janvier 2026 ne sont pas entièrement auditées. ' || v_incomplete_count || ' transaction(s) incomplète(s) exclues des KPIs.';
  ELSIF p_start_date < '2026-01-01T00:00:00Z'::TIMESTAMPTZ THEN
    v_data_warning := 'Les données avant le 1er janvier 2026 ne sont pas entièrement auditées';
  ELSIF v_incomplete_count > 0 THEN
    v_data_warning := v_incomplete_count || ' transaction(s) incomplète(s) exclues des KPIs';
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

  -- F4-C3: is_complete = true ajouté dans TOUTES les subqueries KPI
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
      AND is_complete = true  -- F4-C3: exclure transactions incomplètes des KPIs
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
        AND is_complete = true  -- F4-C3
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
        AND is_complete = true  -- F4-C3
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
        AND t.is_complete = true  -- F4-C3
      ORDER BY t.montant DESC LIMIT 5
    ) sub
  ) AS tt

  -- Incomplete transactions stats (toujours calculées, mais exclues des KPIs)
  CROSS JOIN LATERAL (
    SELECT
      COUNT(*) AS incomplete_count,
      COALESCE(SUM(
        CASE devise
          WHEN 'USD' THEN montant
          WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
          WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
          ELSE montant
        END
      ), 0) AS incomplete_amount_usd
    FROM transactions
    WHERE organization_id = p_organization_id
      AND is_complete = false
      AND type_transaction != 'balance_adjustment'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
  ) AS inc

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
        AND is_complete = true  -- F4-C3: période précédente aussi
    ) AS prev
  ) AS chg;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_overview_secure(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;
