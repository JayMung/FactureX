-- ============================================================================
-- Migration: Create get_dashboard_overview_secure RPC
-- Date: 2026-02-17
-- Purpose: Replace broken get_dashboard_analytics_secure with correct financial
--          calculations for the FactureX V2 dashboard.
--
-- Fixes:
--   - Revenue no longer includes expenses/transfers
--   - CDF conversion rate read from settings (not hardcoded)
--   - Refunded/cancelled transactions excluded
--   - dailyStats, currencyBreakdown, topTransactions fully implemented
--   - Period-over-period change percentages computed correctly
-- ============================================================================

-- 1) Performance indexes (IF NOT EXISTS = safe to re-run)
CREATE INDEX IF NOT EXISTS idx_transactions_org_type_created
  ON public.transactions (organization_id, type_transaction, created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_org_created_statut
  ON public.transactions (organization_id, created_at, statut);

CREATE INDEX IF NOT EXISTS idx_factures_org_statut
  ON public.factures (organization_id, statut);

-- 2) The RPC function
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
  -- PREVIOUS PERIOD (for change % calculation)
  -- Mirror the same duration, shifted backwards.
  -- e.g. if current = 7 days, previous = the 7 days before that.
  -- ========================================================================
  v_prev_end   := p_start_date;
  v_prev_start := p_start_date - (p_end_date - p_start_date);

  -- ========================================================================
  -- MAIN QUERY — single SELECT building the full JSON via CTEs
  -- ========================================================================
  SELECT json_build_object(

    -- ── KPI: Revenue ──────────────────────────────────────────────────────
    'totalRevenueUSD',   COALESCE(curr.revenue_usd, 0),
    'totalExpensesUSD',  COALESCE(curr.expenses_usd, 0),
    'netProfitUSD',      COALESCE(curr.net_profit, 0),
    'totalFrais',        COALESCE(curr.total_frais, 0),

    -- ── KPI: Factures ─────────────────────────────────────────────────────
    'totalFactures',     COALESCE(fct.total_factures, 0),
    'facturesValidees',  COALESCE(fct.factures_validees, 0),
    'facturesEnAttente', COALESCE(fct.factures_en_attente, 0),

    -- ── KPI: Active clients ───────────────────────────────────────────────
    'activeClients',     COALESCE(curr.active_clients, 0),

    -- ── Currency breakdown ────────────────────────────────────────────────
    'currencyBreakdown', COALESCE(cb.breakdown, '[]'::json),

    -- ── Daily stats ───────────────────────────────────────────────────────
    'dailyStats',        COALESCE(ds.stats, '[]'::json),

    -- ── Top transactions ──────────────────────────────────────────────────
    'topTransactions',   COALESCE(tt.top_list, '[]'::json),

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
    )

  ) INTO v_result

  FROM (
    -- ====================================================================
    -- CTE 1: exchange_rates
    -- Read USD→CDF and USD→CNY from the settings table.
    -- NEVER hardcode rates.
    -- ====================================================================
    SELECT
      MAX(CASE WHEN cle = 'usdToCdf' THEN valeur::NUMERIC END) AS usd_to_cdf,
      MAX(CASE WHEN cle = 'usdToCny' THEN valeur::NUMERIC END) AS usd_to_cny
    FROM settings
    WHERE categorie = 'taux_change'
      AND cle IN ('usdToCdf', 'usdToCny')
  ) AS rates

  -- ====================================================================
  -- CTE 2: current_period — core KPIs for the requested date range
  --
  -- Revenue  = SUM(montant) WHERE type_transaction='revenue'
  --            converted to USD using dynamic rate
  -- Expenses = SUM(montant) WHERE type_transaction='depense'
  -- Profit   = SUM(benefice) WHERE type_transaction='revenue'
  -- Frais    = SUM(frais) WHERE type_transaction='revenue'
  -- Active   = COUNT(DISTINCT client_id) from revenue txns
  --
  -- Transfers are EXCLUDED from revenue and expense KPIs.
  -- Refunded / Cancelled transactions are EXCLUDED.
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT
      -- Revenue in USD (convert CDF and CNY to USD)
      COALESCE(SUM(
        CASE
          WHEN type_transaction = 'revenue' THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0
        END
      ), 0) AS revenue_usd,

      -- Expenses in USD
      COALESCE(SUM(
        CASE
          WHEN type_transaction = 'depense' THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0
        END
      ), 0) AS expenses_usd,

      -- Net profit (only from revenue transactions)
      COALESCE(SUM(
        CASE WHEN type_transaction = 'revenue' THEN benefice ELSE 0 END
      ), 0) AS net_profit,

      -- Total fees (only from revenue transactions)
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
  -- CTE 3: factures — invoice stats for the org (within date range)
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT
      COUNT(*)                                    AS total_factures,
      COUNT(*) FILTER (WHERE statut = 'payee')    AS factures_validees,
      COUNT(*) FILTER (WHERE statut = 'brouillon') AS factures_en_attente
    FROM factures
    WHERE organization_id = p_organization_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ) AS fct

  -- ====================================================================
  -- CTE 4: currency_breakdown — revenue grouped by original currency
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
        SUM(montant)  AS total_amount,
        COUNT(*)      AS txn_count
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
  -- CTE 5: daily_stats — revenue, expense, profit per day
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      json_agg(json_build_object(
        'date',    sub.day_date,
        'revenue', sub.day_revenue,
        'expense', sub.day_expense,
        'profit',  sub.day_profit
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
          CASE WHEN type_transaction = 'depense' THEN
            CASE devise
              WHEN 'USD' THEN montant
              WHEN 'CDF' THEN montant / GREATEST(rates.usd_to_cdf, 1)
              WHEN 'CNY' THEN montant / GREATEST(rates.usd_to_cny, 1)
              ELSE montant
            END
          ELSE 0 END
        ), 0) AS day_expense,
        COALESCE(SUM(
          CASE WHEN type_transaction = 'revenue' THEN benefice ELSE 0 END
        ), 0) AS day_profit
      FROM transactions
      WHERE organization_id = p_organization_id
        AND created_at >= p_start_date
        AND created_at <= p_end_date
        AND COALESCE(statut, '') NOT IN ('Remboursé', 'Annulé')
      GROUP BY day_date
    ) sub
  ) AS ds

  -- ====================================================================
  -- CTE 6: top_transactions — last 5 revenue txns by montant DESC
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
  -- CTE 7: change_percentages — compare current vs previous period
  --
  -- Formula: ((current - previous) / NULLIF(previous, 0)) * 100
  -- If previous = 0 and current > 0 → +100%
  -- If previous = 0 and current = 0 → 0%
  -- ====================================================================
  CROSS JOIN LATERAL (
    SELECT
      ROUND(CASE
        WHEN prev.prev_revenue = 0 AND curr.revenue_usd > 0 THEN 100
        WHEN prev.prev_revenue = 0 THEN 0
        ELSE ((curr.revenue_usd - prev.prev_revenue) / prev.prev_revenue) * 100
      END, 1) AS revenue_change_pct,

      ROUND(CASE
        WHEN prev.prev_expenses = 0 AND curr.expenses_usd > 0 THEN 100
        WHEN prev.prev_expenses = 0 THEN 0
        ELSE ((curr.expenses_usd - prev.prev_expenses) / prev.prev_expenses) * 100
      END, 1) AS expense_change_pct,

      ROUND(CASE
        WHEN prev.prev_profit = 0 AND curr.net_profit > 0 THEN 100
        WHEN prev.prev_profit = 0 THEN 0
        ELSE ((curr.net_profit - prev.prev_profit) / prev.prev_profit) * 100
      END, 1) AS profit_change_pct

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
        ), 0) AS prev_expenses,

        COALESCE(SUM(
          CASE WHEN type_transaction = 'revenue' THEN benefice ELSE 0 END
        ), 0) AS prev_profit

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

-- 3) Grant execute to authenticated users (RLS is enforced inside the function)
GRANT EXECUTE ON FUNCTION public.get_dashboard_overview_secure(UUID, TIMESTAMPTZ, TIMESTAMPTZ)
  TO authenticated;

-- 4) Add a comment for documentation
COMMENT ON FUNCTION public.get_dashboard_overview_secure IS
  'V2 Dashboard RPC — returns all KPIs, daily stats, currency breakdown, '
  'top transactions, and period-over-period changes. Organization-scoped, '
  'SECURITY DEFINER with org membership check. Reads exchange rates from settings.';
