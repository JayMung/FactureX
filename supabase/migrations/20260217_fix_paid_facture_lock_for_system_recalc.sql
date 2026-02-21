-- ============================================================
-- Phase A3.1: Keep paid lock strict for business edits, allow system recalc
-- Date: 2026-02-17
-- ============================================================

-- Problem fixed:
-- prevent_paid_facture_modification was blocking trigger-driven recalculation
-- from process_paiement() when payments are updated/deleted.

CREATE OR REPLACE FUNCTION public.prevent_paid_facture_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.statut = 'payee' THEN
    -- Allow technical payment-recalculation updates only if business-critical
    -- invoice amount fields remain unchanged.
    IF NEW.total_general IS DISTINCT FROM OLD.total_general
       OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.frais IS DISTINCT FROM OLD.frais
       OR NEW.frais_transport_douane IS DISTINCT FROM OLD.frais_transport_douane
       OR NEW.shipping_fee IS DISTINCT FROM OLD.shipping_fee
       OR NEW.total_poids IS DISTINCT FROM OLD.total_poids
       OR NEW.devise IS DISTINCT FROM OLD.devise
       OR NEW.mode_livraison IS DISTINCT FROM OLD.mode_livraison
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.type IS DISTINCT FROM OLD.type
       OR NEW.date_emission IS DISTINCT FROM OLD.date_emission
       OR NEW.facture_number IS DISTINCT FROM OLD.facture_number
    THEN
      RAISE EXCEPTION 'Modification interdite: facture payee verrouillee';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_paid_facture_modification()
IS 'Blocks business edits on paid invoices, while allowing system recalculation of payment-state fields.';
