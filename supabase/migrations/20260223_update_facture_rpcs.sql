CREATE OR REPLACE FUNCTION public.create_facture_secure(p_facture jsonb, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_facture_id UUID;
  v_org_id UUID;
  v_client_id UUID;
  v_date_emission DATE;
  v_date_echeance DATE;
BEGIN
  SELECT organization_id
  INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation introuvable';
  END IF;

  IF p_facture IS NULL THEN
    RAISE EXCEPTION 'Facture invalide';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Au moins un item est requis';
  END IF;

  v_client_id := (p_facture->>'client_id')::UUID;

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Client requis';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.clients c
    WHERE c.id = v_client_id
      AND c.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Client invalide ou hors organisation';
  END IF;

  v_date_emission := COALESCE((p_facture->>'date_emission')::date, CURRENT_DATE);
  v_date_echeance := COALESCE((p_facture->>'date_echeance')::date, v_date_emission + interval '30 days');

  INSERT INTO public.factures (
    client_id,
    type,
    statut,
    date_emission,
    date_echeance,
    mode_livraison,
    devise,
    subtotal,
    frais,
    frais_transport_douane,
    total_general,
    solde_restant,
    organization_id,
    created_by
  )
  VALUES (
    v_client_id,
    COALESCE(NULLIF(p_facture->>'type', ''), 'facture'),
    'brouillon',
    v_date_emission,
    v_date_echeance,
    COALESCE(NULLIF(p_facture->>'mode_livraison', ''), 'aerien'),
    COALESCE(NULLIF(p_facture->>'devise', ''), 'USD'),
    COALESCE((p_facture->>'subtotal')::numeric, 0),
    COALESCE((p_facture->>'frais')::numeric, 0),
    COALESCE((p_facture->>'frais_transport_douane')::numeric, 0),
    COALESCE((p_facture->>'total_general')::numeric, 0),
    COALESCE((p_facture->>'total_general')::numeric, 0), -- Initial solde_restant = total_general
    v_org_id,
    auth.uid()
  )
  RETURNING id INTO v_facture_id;

  INSERT INTO public.facture_items(
    facture_id,
    numero_ligne,
    description,
    quantite,
    prix_unitaire,
    poids,
    montant_total,
    organization_id
  )
  SELECT
    v_facture_id,
    item_ordinality::int,
    item->>'description',
    COALESCE((item->>'quantite')::int, 1),
    COALESCE((item->>'prix_unitaire')::numeric, 0),
    COALESCE((item->>'poids')::numeric, 0),
    COALESCE(
      (item->>'montant_total')::numeric,
      (item->>'total_ligne')::numeric,
      COALESCE((item->>'quantite')::numeric, 1) * COALESCE((item->>'prix_unitaire')::numeric, 0)
    ),
    v_org_id
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(item, item_ordinality);

  RETURN v_facture_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_facture_secure(p_facture_id uuid, p_facture jsonb, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_total_general NUMERIC;
  v_montant_paye NUMERIC;
BEGIN
  SELECT organization_id
  INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation introuvable';
  END IF;

  IF p_facture_id IS NULL THEN
    RAISE EXCEPTION 'Facture introuvable';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Items invalides';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.factures
    WHERE id = p_facture_id
      AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  UPDATE public.factures
  SET
    subtotal = COALESCE((p_facture->>'subtotal')::numeric, subtotal),
    frais = COALESCE((p_facture->>'frais')::numeric, frais),
    frais_transport_douane = COALESCE((p_facture->>'frais_transport_douane')::numeric, frais_transport_douane),
    total_general = COALESCE((p_facture->>'total_general')::numeric, total_general),
    devise = COALESCE(NULLIF(p_facture->>'devise', ''), devise),
    date_echeance = COALESCE((p_facture->>'date_echeance')::date, date_echeance),
    date_emission = COALESCE((p_facture->>'date_emission')::date, date_emission),
    statut = COALESCE(NULLIF(p_facture->>'statut', ''), statut)
  WHERE id = p_facture_id
  RETURNING total_general, montant_paye INTO v_total_general, v_montant_paye;

  -- Mettre à jour solde_restant et statut_paiement si le total a changé
  UPDATE public.factures
  SET solde_restant = v_total_general - COALESCE(v_montant_paye, 0),
      statut_paiement = CASE 
        WHEN (v_total_general - COALESCE(v_montant_paye, 0)) <= 0 THEN 'payee'
        WHEN COALESCE(v_montant_paye, 0) > 0 THEN 'partiellement_payee'
        ELSE 'non_paye'
      END
  WHERE id = p_facture_id;

  DELETE FROM public.facture_items
  WHERE facture_id = p_facture_id;

  INSERT INTO public.facture_items(
    facture_id,
    numero_ligne,
    description,
    quantite,
    prix_unitaire,
    poids,
    montant_total,
    organization_id
  )
  SELECT
    p_facture_id,
    item_ordinality::int,
    item->>'description',
    COALESCE((item->>'quantite')::int, 1),
    COALESCE((item->>'prix_unitaire')::numeric, 0),
    COALESCE((item->>'poids')::numeric, 0),
    COALESCE(
      (item->>'montant_total')::numeric,
      (item->>'total_ligne')::numeric,
      COALESCE((item->>'quantite')::numeric, 1) * COALESCE((item->>'prix_unitaire')::numeric, 0)
    ),
    v_org_id
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS t(item, item_ordinality);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_factures_with_totals_secure(p_page integer, p_page_size integer, p_search text DEFAULT NULL::text, p_statut text DEFAULT NULL::text, p_type text DEFAULT NULL::text, p_client_id uuid DEFAULT NULL::uuid, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date)
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
    SELECT f.*,
           -- Compute dynamically if it's late
           CASE 
             WHEN f.statut_paiement != 'payee' AND f.date_echeance < CURRENT_DATE THEN true
             ELSE false
           END as est_en_retard
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
      COALESCE(SUM(solde_restant), 0) AS total_outstanding,
      COALESCE(SUM(solde_restant) FILTER (WHERE est_en_retard), 0) AS total_retard
    FROM filtered
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
