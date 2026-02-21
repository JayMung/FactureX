-- ============================================================
-- Phase A2: Unify paiement -> facture status source of truth
-- Date: 2026-02-17
-- ============================================================

-- Remove duplicate facture status update path on transactions.
-- Source of truth remains: process_paiement() on public.paiements.

DROP TRIGGER IF EXISTS trigger_update_facture_status ON public.transactions;
DROP FUNCTION IF EXISTS public.update_facture_status_on_transaction();

COMMENT ON FUNCTION public.process_paiement()
IS 'Source of truth for facture payment computation: updates montant_paye, solde_restant, statut_paiement, and facture statut from paiements.';
