-- ============================================================
-- Phase A3: Lock paid factures against update/delete
-- Date: 2026-02-17
-- ============================================================

-- 1) Prevent updates on paid invoices
CREATE OR REPLACE FUNCTION public.prevent_paid_facture_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.statut = 'payee' THEN
    RAISE EXCEPTION 'Modification interdite: facture payee verrouillee';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_paid_facture_update ON public.factures;

CREATE TRIGGER prevent_paid_facture_update
BEFORE UPDATE ON public.factures
FOR EACH ROW
WHEN (OLD.statut = 'payee')
EXECUTE FUNCTION public.prevent_paid_facture_modification();

-- 2) Prevent deletion of paid invoices
CREATE OR REPLACE FUNCTION public.prevent_paid_facture_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.statut = 'payee' THEN
    RAISE EXCEPTION 'Suppression interdite: facture payee';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS prevent_paid_facture_delete_trigger ON public.factures;

CREATE TRIGGER prevent_paid_facture_delete_trigger
BEFORE DELETE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.prevent_paid_facture_delete();

COMMENT ON FUNCTION public.prevent_paid_facture_modification()
IS 'Blocks any UPDATE on already paid invoices (statut = payee).';

COMMENT ON FUNCTION public.prevent_paid_facture_delete()
IS 'Blocks DELETE on paid invoices (statut = payee).';
