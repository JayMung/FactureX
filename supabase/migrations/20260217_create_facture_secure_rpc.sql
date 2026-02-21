-- ============================================================
-- Phase C1: Atomic secure facture creation RPC
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_facture_secure(
  p_facture JSONB,
  p_items JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_facture_id UUID;
  v_org_id UUID;
  v_client_id UUID;
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

  INSERT INTO public.factures (
    client_id,
    type,
    statut,
    date_emission,
    mode_livraison,
    devise,
    subtotal,
    frais,
    frais_transport_douane,
    total_general,
    organization_id,
    created_by
  )
  VALUES (
    v_client_id,
    COALESCE(NULLIF(p_facture->>'type', ''), 'facture'),
    'brouillon',
    COALESCE((p_facture->>'date_emission')::timestamptz, NOW()),
    COALESCE(NULLIF(p_facture->>'mode_livraison', ''), 'aerien'),
    COALESCE(NULLIF(p_facture->>'devise', ''), 'USD'),
    COALESCE((p_facture->>'subtotal')::numeric, 0),
    COALESCE((p_facture->>'frais')::numeric, 0),
    COALESCE((p_facture->>'frais_transport_douane')::numeric, 0),
    COALESCE((p_facture->>'total_general')::numeric, 0),
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
$$;

REVOKE ALL ON FUNCTION public.create_facture_secure(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_facture_secure(JSONB, JSONB) TO authenticated;
