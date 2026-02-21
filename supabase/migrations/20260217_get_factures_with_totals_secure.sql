-- ============================================================
-- Phase E: SQL-optimized facture listing RPC with server-side
--           filtering, pagination and aggregated totals
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_factures_with_totals_secure(
  p_page integer,
  p_page_size integer,
  p_search text DEFAULT NULL,
  p_statut text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_client_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_offset integer;
  v_page_size integer;
  v_result jsonb;
BEGIN

  SELECT organization_id
  INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation introuvable';
  END IF;

  IF p_page_size > 100 THEN
    v_page_size := 100;
  ELSIF p_page_size < 1 THEN
    v_page_size := 10;
  ELSE
    v_page_size := p_page_size;
  END IF;

  v_offset := (p_page - 1) * v_page_size;

  WITH filtered AS (
    SELECT f.*
    FROM public.factures f
    WHERE f.organization_id = v_org_id
      AND (p_statut IS NULL OR f.statut = p_statut)
      AND (p_type IS NULL OR f.type = p_type)
      AND (p_client_id IS NULL OR f.client_id = p_client_id)
      AND (p_date_from IS NULL OR f.date_emission >= p_date_from)
      AND (p_date_to IS NULL OR f.date_emission <= p_date_to)
      AND (
        p_search IS NULL
        OR f.facture_number ILIKE '%' || p_search || '%'
      )
  ),

  paginated AS (
    SELECT *
    FROM filtered
    ORDER BY date_emission DESC, id DESC
    LIMIT v_page_size
    OFFSET v_offset
  ),

  totals AS (
    SELECT
      COUNT(*) AS total_count,
      COALESCE(SUM(total_general), 0) AS total_amount,
      COALESCE(SUM(montant_paye), 0) AS total_paid,
      COALESCE(SUM(solde_restant), 0) AS total_outstanding
    FROM filtered
  )

  SELECT jsonb_build_object(
    'data', (
      SELECT jsonb_agg(to_jsonb(paginated.*))
      FROM paginated
    ),
    'count', (SELECT total_count FROM totals),
    'totalAmount', (SELECT total_amount FROM totals),
    'totalPaid', (SELECT total_paid FROM totals),
    'totalOutstanding', (SELECT total_outstanding FROM totals)
  )
  INTO v_result;

  RETURN v_result;

END;
$$;

REVOKE ALL ON FUNCTION public.get_factures_with_totals_secure(integer, integer, text, text, text, uuid, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_factures_with_totals_secure(integer, integer, text, text, text, uuid, date, date) TO authenticated;
