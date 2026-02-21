-- ============================================================
-- Lock financial fields for validated factures
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_validated_facture_amount_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF OLD.statut = 'validee' AND (
    NEW.subtotal IS DISTINCT FROM OLD.subtotal
    OR NEW.frais IS DISTINCT FROM OLD.frais
    OR NEW.frais_transport_douane IS DISTINCT FROM OLD.frais_transport_douane
    OR NEW.total_general IS DISTINCT FROM OLD.total_general
    OR NEW.devise IS DISTINCT FROM OLD.devise
  ) THEN
    RAISE EXCEPTION 'Modification interdite: facture validee verrouillee (montants non modifiables)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_validated_facture_amount_modification_trigger ON public.factures;

CREATE TRIGGER prevent_validated_facture_amount_modification_trigger
BEFORE UPDATE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.prevent_validated_facture_amount_modification();
