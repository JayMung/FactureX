-- ============================================================
-- Block annulation of validated factures when payments exist
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.enforce_facture_state_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC;
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
    SELECT COALESCE(SUM(montant_paye), 0)
    INTO v_total_paid
    FROM public.paiements
    WHERE facture_id = OLD.id;

    IF v_total_paid > 0 THEN
      RAISE EXCEPTION 'Impossible d’annuler une facture avec paiements existants';
    END IF;

    RETURN NEW;
  END IF;

  -- Everything else is forbidden
  RAISE EXCEPTION 'Transition de statut invalide: % -> %', OLD.statut, NEW.statut;
END;
$$;
