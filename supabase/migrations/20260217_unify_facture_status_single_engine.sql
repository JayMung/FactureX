-- ============================================================
-- Phase A2.1: Enforce a single facture-status engine on paiements
-- Date: 2026-02-17
-- ============================================================

-- Goal:
-- Keep process_paiement() as the ONLY function that recalculates facture payment status.
-- Cover INSERT / UPDATE / DELETE on paiements.

CREATE OR REPLACE FUNCTION public.process_paiement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_facture_id UUID;
  v_montant_total NUMERIC(15,2);
  v_montant_paye_total NUMERIC(15,2);
  v_solde_restant NUMERIC(15,2);
  v_statut_paiement TEXT;
BEGIN
  v_facture_id := COALESCE(NEW.facture_id, OLD.facture_id);

  IF v_facture_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT total_general
  INTO v_montant_total
  FROM public.factures
  WHERE id = v_facture_id;

  IF v_montant_total IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(montant_paye), 0)
  INTO v_montant_paye_total
  FROM public.paiements
  WHERE facture_id = v_facture_id;

  v_solde_restant := v_montant_total - v_montant_paye_total;

  IF v_solde_restant <= 0 THEN
    v_statut_paiement := 'payee';
    v_solde_restant := 0;
  ELSIF v_montant_paye_total > 0 THEN
    v_statut_paiement := 'partiellement_payee';
  ELSE
    v_statut_paiement := 'non_paye';
  END IF;

  UPDATE public.factures
  SET
    montant_paye = v_montant_paye_total,
    solde_restant = v_solde_restant,
    statut_paiement = v_statut_paiement,
    statut = CASE
      WHEN statut = 'annulee' THEN statut
      WHEN v_statut_paiement = 'payee' THEN 'payee'
      WHEN statut = 'payee' AND v_statut_paiement <> 'payee' THEN 'validee'
      ELSE statut
    END
  WHERE id = v_facture_id;

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in process_paiement (%): %', TG_OP, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Remove duplicate facture-status triggers
DROP TRIGGER IF EXISTS trigger_facture_statut_insert ON public.paiements;
DROP TRIGGER IF EXISTS trigger_facture_statut_delete ON public.paiements;

-- Recreate process_paiement triggers for all relevant operations
DROP TRIGGER IF EXISTS trigger_process_paiement_after_insert ON public.paiements;
DROP TRIGGER IF EXISTS trigger_process_paiement_after_update ON public.paiements;
DROP TRIGGER IF EXISTS trigger_process_paiement_after_delete ON public.paiements;

CREATE TRIGGER trigger_process_paiement_after_insert
AFTER INSERT ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.process_paiement();

CREATE TRIGGER trigger_process_paiement_after_update
AFTER UPDATE ON public.paiements
FOR EACH ROW
WHEN (
  OLD.facture_id IS DISTINCT FROM NEW.facture_id
  OR OLD.montant_paye IS DISTINCT FROM NEW.montant_paye
  OR OLD.type_paiement IS DISTINCT FROM NEW.type_paiement
)
EXECUTE FUNCTION public.process_paiement();

CREATE TRIGGER trigger_process_paiement_after_delete
AFTER DELETE ON public.paiements
FOR EACH ROW
EXECUTE FUNCTION public.process_paiement();

-- Drop obsolete duplicate functions if no longer needed
DROP FUNCTION IF EXISTS public.update_facture_statut_after_paiement();
DROP FUNCTION IF EXISTS public.update_facture_statut_after_delete();

COMMENT ON FUNCTION public.process_paiement()
IS 'Single source of truth for facture status and amounts from paiements. Handles INSERT/UPDATE/DELETE.';
