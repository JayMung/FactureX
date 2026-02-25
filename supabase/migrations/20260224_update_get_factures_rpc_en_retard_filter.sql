CREATE OR REPLACE FUNCTION public.get_factures_with_totals_secure(
  p_page integer,
  p_page_size integer,
  p_search text DEFAULT NULL::text,
  p_statut text DEFAULT NULL::text,
  p_type text DEFAULT NULL::text,
  p_client_id uuid DEFAULT NULL::uuid,
  p_date_from date DEFAULT NULL::date,
  p_date_to date DEFAULT NULL::date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid;
  v_offset integer;
  v_page_size integer;
  v_result jsonb;
  v_filter_en_retard boolean;
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

  -- Special flag: 'en_retard' is not a real statut column value, it's a dynamic filter
  v_filter_en_retard := (p_statut = 'en_retard');

  WITH filtered AS (
    SELECT f.*,
           CASE
             WHEN f.statut_paiement != 'payee' AND f.date_echeance IS NOT NULL AND f.date_echeance < CURRENT_DATE THEN true
             ELSE false
           END as est_en_retard,
           jsonb_build_object(
             'id',        c.id,
             'nom',       c.nom,
             'telephone', c.telephone,
             'ville',     c.ville
           ) as clients
    FROM public.factures f
    LEFT JOIN public.clients c ON c.id = f.client_id
    WHERE f.organization_id = v_org_id
      AND (
        v_filter_en_retard        -- skip statut filter when filtering by en_retard
        OR p_statut IS NULL
        OR f.statut = p_statut
      )
      AND (p_type IS NULL OR f.type = p_type)
      AND (p_client_id IS NULL OR f.client_id = p_client_id)
      AND (p_date_from IS NULL OR f.date_emission >= p_date_from)
      AND (p_date_to IS NULL OR f.date_emission <= p_date_to)
      AND (
        p_search IS NULL
        OR f.facture_number ILIKE '%' || p_search || '%'
      )
  ),

  -- Apply en_retard post-filter after computing the dynamic column
  filtered_final AS (
    SELECT * FROM filtered
    WHERE (NOT v_filter_en_retard OR est_en_retard = true)
  ),

  paginated AS (
    SELECT *
    FROM filtered_final
    ORDER BY date_emission DESC, id DESC
    LIMIT v_page_size
    OFFSET v_offset
  ),

  totals AS (
    SELECT
      COUNT(*) AS total_count,
      COALESCE(SUM(total_general), 0) AS total_amount,
      COALESCE(SUM(montant_paye), 0) AS total_paid,
      COALESCE(SUM(solde_restant), 0) AS total_outstanding,
      COALESCE(SUM(solde_restant) FILTER (WHERE est_en_retard), 0) AS total_retard
    FROM filtered_final
  )

  SELECT jsonb_build_object(
    'data', (
      SELECT COALESCE(jsonb_agg(to_jsonb(paginated.*)), '[]'::jsonb)
      FROM paginated
    ),
    'count', (SELECT total_count FROM totals),
    'totalAmount', (SELECT total_amount FROM totals),
    'totalPaid', (SELECT total_paid FROM totals),
    'totalOutstanding', (SELECT total_outstanding FROM totals),
    'totalRetard', (SELECT total_retard FROM totals)
  )
  INTO v_result;

  RETURN v_result;

END;
$function$;
