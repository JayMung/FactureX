-- ============================================================
-- Phase B strict mode: enforce facture state machine with accounting guard
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_facture_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Only enforce on UPDATE operations
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- No status change -> allowed
  IF OLD.statut = NEW.statut THEN
    RETURN NEW;
  END IF;

  -- Terminal states cannot transition to anything else
  IF OLD.statut = 'payee' THEN
    RAISE EXCEPTION 'Transition de statut invalide: % -> %', OLD.statut, NEW.statut;
  END IF;

  IF OLD.statut = 'annulee' THEN
    RAISE EXCEPTION 'Transition de statut invalide: % -> %', OLD.statut, NEW.statut;
  END IF;

  -- Allowed transitions with strict accounting guard
  IF OLD.statut = 'brouillon' AND NEW.statut IN ('validee', 'annulee') THEN
    RETURN NEW;
  ELSIF OLD.statut = 'validee' AND NEW.statut = 'payee' THEN
    IF NEW.solde_restant <> 0 THEN
      RAISE EXCEPTION
        'Transition invalide: facture ne peut pas devenir payee tant que solde_restant <> 0 (actuel: %)',
        NEW.solde_restant;
    END IF;
    RETURN NEW;
  ELSIF OLD.statut = 'validee' AND NEW.statut = 'annulee' THEN
    RETURN NEW;
  END IF;

  -- Everything else is forbidden
  RAISE EXCEPTION 'Transition de statut invalide: % -> %', OLD.statut, NEW.statut;
END;
$$;

DROP TRIGGER IF EXISTS enforce_facture_state_transition_trigger ON public.factures;

CREATE TRIGGER enforce_facture_state_transition_trigger
BEFORE UPDATE ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.enforce_facture_state_transition();

COMMENT ON FUNCTION public.enforce_facture_state_transition()
IS 'Strict facture state machine: brouillon->(validee|annulee), validee->annulee, validee->payee only when solde_restant=0, payee/annulee terminal.';

-- ============================================================
-- Validation queries
-- ============================================================
-- Should fail:
-- UPDATE factures
-- SET statut = 'payee'
-- WHERE id = '<facture_id_with_solde_restant_gt_0>';

-- Should succeed only when solde_restant = 0:
-- UPDATE factures
-- SET statut = 'payee'
-- WHERE id = '<facture_id_with_solde_0>';
