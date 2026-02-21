-- ============================================================
-- Phase C3: Atomic secure facture delete RPC
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_facture_secure(
  p_facture_id UUID
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.factures
    WHERE id = p_facture_id
      AND organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;

  DELETE FROM public.factures
  WHERE id = p_facture_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_facture_secure(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_facture_secure(UUID) TO authenticated;
