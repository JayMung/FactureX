-- ============================================================================
-- Migration: Update get_dashboard_overview_secure — 4-Category Financial Model
-- Date: 2026-02-17
-- Purpose: Separate expenses into Supplier Cost vs Operational Expenses
--          to reflect FactureX's real business model (China→Congo import).
--
-- Financial Model:
--   1. Client Revenue     = type_transaction='revenue'
--   2. Supplier Cost      = type_transaction='depense' AND is_supplier()
--   3. Operational Expenses = type_transaction='depense' AND NOT is_supplier()
--   4. Net Margin         = Revenue - Supplier Cost
--   5. Net Profit         = Revenue - Supplier Cost - Operational Expenses
--
-- Supplier Detection Rules:
--   - categorie = 'Paiement Fournisseur'
--   - motif = 'Paiement Fournisseur'
--   - motif ILIKE '%Recharge Alipay%'
--   - compte_destination_id = Alipay account
--   - categorie = 'Paiement Colis' OR motif ILIKE '%Paiement Colis%'
--   - (categorie|motif = 'Transfert Argent') AND devise = 'CNY'
-- ============================================================================

-- 1) Helper: is_supplier_expense — reusable classification function
CREATE OR REPLACE FUNCTION public.is_supplier_expense(
  p_categorie TEXT,
  p_motif TEXT,
  p_devise TEXT,
  p_compte_destination_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    -- Rule 1: Explicit supplier category
    COALESCE(p_categorie, '') = 'Paiement Fournisseur'
    -- Rule 2: Supplier motif (legacy data without categorie)
    OR COALESCE(p_motif, '') = 'Paiement Fournisseur'
    -- Rule 3: Alipay recharge
    OR COALESCE(p_motif, '') ILIKE '%Recharge Alipay%'
    -- Rule 4: Destination is Alipay account
    OR p_compte_destination_id = 'c5969d86-6035-432c-9b2a-a385be6f7d65'::UUID
    -- Rule 5: Colis payments (supplier logistics)
    OR COALESCE(p_categorie, '') = 'Paiement Colis'
    OR COALESCE(p_motif, '') ILIKE '%Paiement Colis%'
    OR COALESCE(p_motif, '') ILIKE '%paiement colis%'
    -- Rule 6: CNY transfers to China
    OR (
      (COALESCE(p_categorie, '') = 'Transfert Argent' OR COALESCE(p_motif, '') = 'Transfert Argent')
      AND p_devise = 'CNY'
    );
$$;

COMMENT ON FUNCTION public.is_supplier_expense IS
  'Classifies a depense transaction as supplier-related based on categorie, motif, devise, and compte_destination_id. Used by dashboard analytics.';

-- 2) Replace the RPC with 4-category financial model
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
  v_alipay_id  UUID := 'c5969d86-6035-432c-9b2a-a385be6f7d65';
BEGIN
  -- ========================================================================
  -- GUARD: Ensure the calling user belongs to the requested organization
  -- ========================================================================
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Access denied: user does not belong to this organization';
  END IF;

  -- ========================================================================
  -- PREVIOUS PERIOD (mirror duration, shifted backwards)
  -- ========================================================================
  v_prev_end   := p_start_date;
  v_prev_start := p_start_date - (p_end_date - p_start_date);

  -- ========================================================================
  -- MAIN QUERY — single SELECT with CROSS JOIN LATERAL subqueries
  -- ========================================================================
  SELECT json_build_object(

    -- ── Financial KPIs (4-category model) ─────────────────────────────────
    'totalRevenueUSD',          COALESCE(curr.revenue_usd, 0),
    'supplierCostUSD',          COALESCE(curr.supplier_cost_usd, 0),
    'operationalExpensesUSD',   COALESCE(curr.operational_expenses_usd, 0),
    'totalExpensesUSD',         COALESCE(curr.supplier_cost_usd, 0) + COALESCE(curr.operational_expenses_usd, 0),
    'netMarginUSD',             COALESCE(curr.revenue_usd, 0) - COALESCE(curr.supplier_cost_usd, 0),
    'netProfitUSD',             COALESCE(curr.revenue_usd, 0) - COALESCE(curr.supplier_cost_usd, 0) - COALESCE(curr.operational_expenses_usd, 0),
    'totalFrais',               COALESCE(curr.total_frais, 0),

    -- ── Factures ──────────────────────────────────────────────────────────
    'totalFactures',            COALESCE(fct.total_factures, 0),
    'facturesValidees',         COALESCE(fct.factures_validees, 0),
    'facturesEnAttente',        COALESCE(fct.factures_en_attente, 0),

    -- ── Active clients ────────────────────────────────────────────────────
    'activeClients',            COALESCE(curr.active_clients, 0),

    -- ── Currency breakdown (native, no conversion) ────────────────────────
    'currencyBreakdown',        COALESCE(cb.breakdown, '[]'::json),

    -- ── Daily stats (4-category) ──────────────────────────────────────────
    'dailyStats',               COALESCE(ds.stats, '[]'::json),

    -- ── Top transactions ──────────────────────────────────────────────────
    'topTransactions',          COALESCE(tt.top_list, '[]'::json),

    -- ── Period-over-period changes ────────────────────────────────────────
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
    )

  ) INTO v_result

  -- ====================================================================
  -- SUBQUERY: exchange_rates
  -- Read USD→CDF and USD→CNY from settings. NEVER hardcode.
  -- ====================================================================
  FROM (
    SELECT
      MAX(CASE WHEN cle = 'usdToCdf' THEN valeur::NUMERIC END) AS usd_to_cdf,
      MAX(CASE WHEN cle = 'usdToCny' THEN valeur::NUMERIC END) AS usd_to_cny
    FROM settings
    WHERE categorie = 'taux_change'
      AND cle IN ('usdToCdf', 'usdToCny')
  ) AS rates

  -- ====================================================================
  -- SUBQUERY: current_period — 4-category KPIs
  --
  -- Revenue            = SUM(montant) WHERE type='revenue'
  -- Supplier Cost      = SUM(montant) WHERE type='depense' AND is_supplier
  -- Operational Exp    = SUM(montant) WHERE type='depense' AND NOT is_supplier
  -- Frais              = SUM(frais) WHERE type='revenue'
  -- Active Clients     = COUNT(DISTINCT client_id) from revenue txns
  --
  -- All amounts converted to USD using dynamic rates.
  -- Transfers EXCLUDED. Refunded/Cancelled EXCLUDED.
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT
      -- Revenue in USD
      COALESCE(SUM(
        CASE WHEN type_transaction = 'revenue' THEN
          CASE devise
            WHEN 'USD' THEN montant
            WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
            WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
            ELSE montant
          END
        ELSE 0 END
      ), 0) AS revenue_usd,

      -- Supplier Cost in USD
      COALESCE(SUM(
        CASE WHEN type_transaction = 'depense'
              AND is_supplier_expense(categorie, motif, devise, compte_destination_id)
        THEN
          CASE devise
            WHEN 'USD' THEN montant
            WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
            WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
            ELSE montant
          END
        ELSE 0 END
      ), 0) AS supplier_cost_usd,

      -- Operational Expenses in USD
      COALESCE(SUM(
        CASE WHEN type_transaction = 'depense'
              AND NOT is_supplier_expense(categorie, motif, devise, compte_destination_id)
        THEN
          CASE devise
            WHEN 'USD' THEN montant
            WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
            WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
            ELSE montant
          END
        ELSE 0 END
      ), 0) AS operational_expenses_usd,

      -- Total fees (revenue transactions only)
      COALESCE(SUM(
        CASE WHEN type_transaction = 'revenue' THEN frais ELSE 0 END
      ), 0) AS total_frais,

      -- Active clients = distinct clients with revenue txns in period
      COUNT(DISTINCT CASE WHEN type_transaction = 'revenue' THEN client_id END)
        AS active_clients

    FROM transactions
    WHERE organization_id = p_organization_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
      AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
  ) AS curr

  -- ====================================================================
  -- SUBQUERY: factures — invoice stats within date range
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT
      COUNT(*)                                     AS total_factures,
      COUNT(*) FILTER (WHERE statut = 'payee')     AS factures_validees,
      COUNT(*) FILTER (WHERE statut = 'brouillon') AS factures_en_attente
    FROM factures
    WHERE organization_id = p_organization_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ) AS fct

  -- ====================================================================
  -- SUBQUERY: currency_breakdown — revenue by native currency (no conversion)
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object(
        'currency', sub.devise,
        'total',    sub.total_amount,
        'count',    sub.txn_count
      )),
      '[]'::json
    ) AS breakdown
    FROM (
      SELECT
        devise,
        SUM(montant) AS total_amount,
        COUNT(*)     AS txn_count
      FROM transactions
      WHERE organization_id = p_organization_id
        AND type_transaction = 'revenue'
        AND created_at >= p_start_date
        AND created_at <= p_end_date
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
      GROUP BY devise
      ORDER BY total_amount DESC
    ) sub
  ) AS cb

  -- ====================================================================
  -- SUBQUERY: daily_stats — 4-category per day
  -- { date, revenueUSD, supplierCostUSD, operationalExpensesUSD, netMarginUSD }
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object(
        'date',                    sub.day_date,
        'revenueUSD',              sub.day_revenue,
        'supplierCostUSD',         sub.day_supplier,
        'operationalExpensesUSD',  sub.day_operational,
        'netMarginUSD',            sub.day_revenue - sub.day_supplier
      ) ORDER BY sub.day_date),
      '[]'::json
    ) AS stats
    FROM (
      SELECT
        date_trunc('day', created_at)::DATE AS day_date,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'revenue' THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0 END
        ), 0) AS day_revenue,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'depense'
                AND is_supplier_expense(categorie, motif, devise, compte_destination_id)
          THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0 END
        ), 0) AS day_supplier,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'depense'
                AND NOT is_supplier_expense(categorie, motif, devise, compte_destination_id)
          THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0 END
        ), 0) AS day_operational

      FROM transactions
      WHERE organization_id = p_organization_id
        AND created_at >= p_start_date
        AND created_at <= p_end_date
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
      GROUP BY day_date
    ) sub
  ) AS ds

  -- ====================================================================
  -- SUBQUERY: top_transactions — top 5 revenue by montant DESC
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object(
        'id',          sub.id,
        'montant',     sub.montant,
        'devise',      sub.devise,
        'motif',       sub.motif,
        'client_name', sub.client_name,
        'created_at',  sub.created_at
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
        AND t.created_at >= p_start_date
        AND t.created_at <= p_end_date
        AND COALESCE(t.statut, '') NOT IN ('Remboursé', 'Annulé')
      ORDER BY t.montant DESC
      LIMIT 5
    ) sub
  ) AS tt

  -- ====================================================================
  -- SUBQUERY: change_percentages — current vs previous period
  --
  -- Compares: revenue, total expenses, net profit, net margin
  -- Formula: ((current - previous) / ABS(previous)) * 100
  -- Edge: previous=0 and current>0 → +100%; both 0 → 0%
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT
      -- Revenue change
      ROUND(CASE
        WHEN prev.prev_revenue = 0 AND curr.revenue_usd > 0 THEN 100
        WHEN prev.prev_revenue = 0 THEN 0
        ELSE ((curr.revenue_usd - prev.prev_revenue) / ABS(prev.prev_revenue)) * 100
      END, 1) AS revenue_change_pct,

      -- Total expense change
      ROUND(CASE
        WHEN prev.prev_total_expenses = 0 AND (curr.supplier_cost_usd + curr.operational_expenses_usd) > 0 THEN 100
        WHEN prev.prev_total_expenses = 0 THEN 0
        ELSE (((curr.supplier_cost_usd + curr.operational_expenses_usd) - prev.prev_total_expenses) / ABS(prev.prev_total_expenses)) * 100
      END, 1) AS expense_change_pct,

      -- Net profit change
      ROUND(CASE
        WHEN prev.prev_profit = 0 AND (curr.revenue_usd - curr.supplier_cost_usd - curr.operational_expenses_usd) > 0 THEN 100
        WHEN prev.prev_profit = 0 THEN 0
        ELSE (((curr.revenue_usd - curr.supplier_cost_usd - curr.operational_expenses_usd) - prev.prev_profit) / ABS(NULLIF(prev.prev_profit, 0))) * 100
      END, 1) AS profit_change_pct,

      -- Net margin change
      ROUND(CASE
        WHEN prev.prev_margin = 0 AND (curr.revenue_usd - curr.supplier_cost_usd) > 0 THEN 100
        WHEN prev.prev_margin = 0 THEN 0
        ELSE (((curr.revenue_usd - curr.supplier_cost_usd) - prev.prev_margin) / ABS(NULLIF(prev.prev_margin, 0))) * 100
      END, 1) AS margin_change_pct

    FROM (
      SELECT
        COALESCE(SUM(
          CASE WHEN type_transaction = 'revenue' THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0 END
        ), 0) AS prev_revenue,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'depense' THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0 END
        ), 0) AS prev_total_expenses,

        -- Previous net profit = prev_revenue - prev_total_expenses
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

        -- Previous net margin = prev_revenue - prev_supplier
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
        AND created_at >= v_prev_start
        AND created_at < v_prev_end
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
    ) AS prev
  ) AS chg;

  RETURN v_result;
END;
$$;

-- 3) Grant execute
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview_secure(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_supplier_expense(TEXT, TEXT, TEXT, UUID)
  TO authenticated;

-- 4) Documentation
COMMENT ON FUNCTION public.get_dashboard_overview_secure IS
  'V2.1 Dashboard RPC — 4-category financial model (Revenue, Supplier Cost, Operational Expenses, Net Margin/Profit). '
  'Organization-scoped, SECURITY DEFINER. Reads exchange rates from settings. Excludes refunded/cancelled.';
