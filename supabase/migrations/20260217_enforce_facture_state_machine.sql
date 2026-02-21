-- ============================================================
-- Phase B: Enforce strict facture status state machine
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_facture_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Allowed transitions
  IF OLD.statut = 'brouillon' AND NEW.statut IN ('validee', 'annulee') THEN
    RETURN NEW;
  ELSIF OLD.statut = 'validee' AND NEW.statut IN ('payee', 'annulee') THEN
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
IS 'Enforces strict facture status transitions: brouillon->(validee|annulee), validee->(payee|annulee), terminal states payee/annulee locked.';
