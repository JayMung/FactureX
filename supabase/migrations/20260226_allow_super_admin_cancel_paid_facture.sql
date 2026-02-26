-- ============================================================
-- Allow super_admin to cancel (annuler) paid invoices
-- Date: 2026-02-26
-- ============================================================
-- Problem: prevent_paid_facture_modification blocks ALL changes on paid invoices,
-- even status change to 'annulee' by super_admin. This makes it impossible to
-- cancel and then delete a paid invoice.
--
-- Solution: Allow super_admin to change statut from 'payee' to 'annulee'
-- while still blocking all other business-field modifications.

CREATE OR REPLACE FUNCTION public.prevent_paid_facture_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
BEGIN
  IF OLD.statut = 'payee' THEN
    -- Allow super_admin to cancel a paid invoice (change statut to 'annulee')
    v_role := COALESCE(auth.jwt() ->> 'role', '');
    IF v_role = 'super_admin' AND NEW.statut = 'annulee' THEN
      -- Only allow the status change, block any other business field modification
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
        RAISE EXCEPTION 'Modification interdite: seul le statut peut être changé vers annulée';
      END IF;
      -- Status-only change by super_admin is allowed
      RETURN NEW;
    END IF;

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
IS 'Blocks business edits on paid invoices, while allowing system recalculation of payment-state fields and super_admin cancellation (statut → annulee).';

-- Also update the delete trigger to allow super_admin to delete cancelled invoices
-- (The existing trigger already allows this since it only blocks statut='payee',
-- but let's also allow super_admin to force-delete paid invoices as a safety escape)
CREATE OR REPLACE FUNCTION public.prevent_paid_facture_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
BEGIN
  IF OLD.statut = 'payee' THEN
    -- Allow super_admin to force-delete paid invoices
    v_role := COALESCE(auth.jwt() ->> 'role', '');
    IF v_role = 'super_admin' THEN
      RETURN OLD;
    END IF;

    RAISE EXCEPTION 'Suppression interdite: facture payee. Annulez d''abord la facture.';
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.prevent_paid_facture_delete()
IS 'Blocks DELETE on paid invoices, except for super_admin who can force-delete.';
