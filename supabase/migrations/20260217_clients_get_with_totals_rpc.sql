-- Clients Phase 3: paginated clients with computed totals in one RPC
CREATE OR REPLACE FUNCTION public.get_clients_with_totals(
  p_organization_id uuid,
  p_page integer,
  p_page_size integer,
  p_search text DEFAULT NULL,
  p_ville text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset integer;
BEGIN
  -- Hard cap page size (anti-DoS)
  IF p_page_size > 1000 THEN
    p_page_size := 1000;
  END IF;

  IF p_page_size < 1 THEN
    p_page_size := 10;
  END IF;

  -- Guard: ensure caller belongs to org
  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND organization_id IS NOT NULL
      AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_offset := (GREATEST(p_page, 1) - 1) * GREATEST(p_page_size, 1);

  RETURN (
    WITH rates AS (
      SELECT
        COALESCE((SELECT valeur::numeric FROM public.settings WHERE cle = 'usdToCdf' LIMIT 1), 2200) AS usd_to_cdf,
        COALESCE((SELECT valeur::numeric FROM public.settings WHERE cle = 'usdToCny' LIMIT 1), 6.9) AS usd_to_cny
    ),
    filtered_clients AS (
      SELECT c.*
      FROM public.clients c
      WHERE c.organization_id = p_organization_id
        AND (
          p_search IS NULL
          OR c.nom ILIKE '%' || p_search || '%'
          OR c.telephone ILIKE '%' || p_search || '%'
        )
        AND (
          p_ville IS NULL
          OR c.ville ILIKE p_ville
        )
    ),
    totals AS (
      SELECT
        t.client_id,
        SUM(
          CASE
            WHEN t.devise = 'USD' THEN t.montant
            WHEN t.devise = 'CDF' THEN t.montant / NULLIF((SELECT usd_to_cdf FROM rates), 0)
            WHEN t.devise = 'CNY' THEN t.montant / NULLIF((SELECT usd_to_cny FROM rates), 0)
            ELSE 0
          END
        ) AS total_usd
      FROM public.transactions t
      WHERE t.organization_id = p_organization_id
        AND t.statut NOT IN ('Annulé', 'Remboursé')
      GROUP BY t.client_id
    ),
    paginated AS (
      SELECT
        fc.id,
        fc.nom,
        fc.telephone,
        fc.ville,
        fc.created_at,
        fc.updated_at,
        fc.created_by,
        COALESCE(t.total_usd, 0) AS total_paye
      FROM filtered_clients fc
      LEFT JOIN totals t ON t.client_id = fc.id
      ORDER BY fc.created_at DESC, fc.id DESC
      LIMIT GREATEST(p_page_size, 1)
      OFFSET v_offset
    )
    SELECT jsonb_build_object(
      'data', COALESCE((SELECT jsonb_agg(p ORDER BY p.created_at DESC, p.id DESC) FROM paginated p), '[]'::jsonb),
      'count', (SELECT COUNT(*) FROM filtered_clients)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_clients_with_totals(uuid, integer, integer, text, text)
TO authenticated;
