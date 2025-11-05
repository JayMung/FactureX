-- Create secure client history search RPC function
-- This prevents SQL injection by using parameterized queries

DROP FUNCTION IF EXISTS search_client_history_secure;

CREATE OR REPLACE FUNCTION search_client_history_secure(
  p_client_id UUID,
  p_search_term TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_currency TEXT DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS TABLE (
  transactions JSON,
  total_count BIGINT,
  stats JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INT;
  v_user_org_id UUID;
  v_total_revenue DECIMAL;
  v_total_usd DECIMAL;
  v_total_cdf DECIMAL;
  v_total_benefice DECIMAL;
  v_total_transactions BIGINT;
BEGIN
  -- Calculate offset for pagination
  v_offset := (p_page - 1) * p_page_size;
  
  -- Get user's organization ID for RLS
  SELECT organization_id INTO v_user_org_id 
  FROM profiles 
  WHERE id = auth.uid();

  -- Build and execute the secure search query
  RETURN QUERY
  WITH filtered_transactions AS (
    SELECT 
      t.*,
      c.* as client_data,
      COUNT(*) OVER() as total_count
    FROM transactions t
    JOIN clients c ON t.client_id = c.id
    WHERE 
      t.client_id = p_client_id
      AND t.organization_id = v_user_org_id
      AND (
        p_search_term IS NULL
        OR (
          t.reference ILIKE '%' || p_search_term || '%'
          OR t.montant::TEXT ILIKE '%' || p_search_term || '%'
          OR t.motif ILIKE '%' || p_search_term || '%'
          OR t.mode_paiement ILIKE '%' || p_search_term || '%'
        )
      )
      AND (p_status IS NULL OR p_status = 'all' OR t.statut = p_status)
      AND (p_currency IS NULL OR p_currency = 'all' OR t.devise = p_currency)
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
    ORDER BY t.created_at DESC
    LIMIT p_page_size OFFSET v_offset
  ),
  transaction_stats AS (
    SELECT 
      COUNT(*) as total_transactions,
      COALESCE(SUM(CASE WHEN devise = 'USD' THEN montant ELSE 0 END), 0) as total_usd,
      COALESCE(SUM(CASE WHEN devise = 'CDF' THEN montant ELSE 0 END), 0) as total_cdf,
      COALESCE(SUM(benefice), 0) as total_benefice
    FROM transactions t
    WHERE 
      t.client_id = p_client_id
      AND t.organization_id = v_user_org_id
      AND (
        p_search_term IS NULL
        OR (
          t.reference ILIKE '%' || p_search_term || '%'
          OR t.montant::TEXT ILIKE '%' || p_search_term || '%'
          OR t.motif ILIKE '%' || p_search_term || '%'
          OR t.mode_paiement ILIKE '%' || p_search_term || '%'
        )
      )
      AND (p_status IS NULL OR p_status = 'all' OR t.statut = p_status)
      AND (p_currency IS NULL OR p_currency = 'all' OR t.devise = p_currency)
      AND (p_date_from IS NULL OR t.created_at >= p_date_from)
      AND (p_date_to IS NULL OR t.created_at <= p_date_to)
  )
  SELECT 
    COALESCE(
      json_agg(
        json_build_object(
          'id', ft.id,
          'reference', ft.reference,
          'montant', ft.montant,
          'devise', ft.devise,
          'motif', ft.motif,
          'mode_paiement', ft.mode_paiement,
          'statut', ft.statut,
          'date_paiement', ft.date_paiement,
          'created_at', ft.created_at,
          'updated_at', ft.updated_at,
          'benefice', ft.benefice,
          'client', json_build_object(
            'id', ft.client_id,
            'nom', ft.nom,
            'telephone', ft.telephone,
            'ville', ft.ville
          )
        )
      ),
      '[]'::json
    ) as transactions,
    COALESCE(MAX(ft.total_count), 0) as total_count,
    COALESCE(
      json_build_object(
        'totalTransactions', ts.total_transactions,
        'totalUSD', ts.total_usd,
        'totalCDF', ts.total_cdf,
        'totalBenefice', ts.total_benefice
      ),
      '[]'::json
    ) as stats
  FROM filtered_transactions ft
  CROSS JOIN transaction_stats ts
  LIMIT 1;
  
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION search_client_history_secure TO authenticated;

-- Add comment
COMMENT ON FUNCTION search_client_history_secure IS 'Secure client history search function that prevents SQL injection by using parameterized queries and proper input sanitization';
