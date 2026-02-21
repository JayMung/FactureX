-- ============================================================
-- Phase C2: Atomic secure facture update RPC
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_facture_secure(
  p_facture_id UUID,
  p_facture JSONB,
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
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
    devise = COALESCE(NULLIF(p_facture->>'devise', ''), devise)
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
$$;

REVOKE ALL ON FUNCTION public.update_facture_secure(UUID, JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_facture_secure(UUID, JSONB, JSONB) TO authenticated;
