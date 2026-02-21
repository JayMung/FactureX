-- ============================================================
-- Facture Monitoring RPC for OpenClaw automation
-- Date: 2026-02-17
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_facture_monitoring_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_overdue_count bigint;
  v_recent_annulations bigint;
  v_unpaid_older_30 bigint;
  v_total_outstanding numeric;
  v_suspicious jsonb;
BEGIN

  SELECT organization_id
  INTO v_org_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organisation introuvable';
  END IF;

  -- Overdue: validee factures where date_emission < now() - 30 days and solde_restant > 0
  SELECT COUNT(*)
  INTO v_overdue_count
  FROM public.factures
  WHERE organization_id = v_org_id
    AND statut = 'validee'
    AND solde_restant > 0
    AND date_emission < now() - interval '30 days';

  -- Recent annulations in last 24h (detected via statut_history last entry)
  SELECT COUNT(*)
  INTO v_recent_annulations
  FROM public.factures
  WHERE organization_id = v_org_id
    AND statut = 'annulee'
    AND (
      statut_history -> -1 ->> 'to' = 'annulee'
      AND (statut_history -> -1 ->> 'at')::timestamptz >= now() - interval '24 hours'
    );

  -- Unpaid older than 30 days: validee or brouillon with solde_restant > 0
  SELECT COUNT(*)
  INTO v_unpaid_older_30
  FROM public.factures
  WHERE organization_id = v_org_id
    AND statut IN ('validee', 'brouillon')
    AND solde_restant > 0
    AND date_emission < now() - interval '30 days';

  -- Total outstanding across all non-annulee factures
  SELECT COALESCE(SUM(solde_restant), 0)
  INTO v_total_outstanding
  FROM public.factures
  WHERE organization_id = v_org_id
    AND statut NOT IN ('annulee', 'payee');

  -- Suspicious transitions: factures whose statut_history has more than 3 entries
  -- (abnormal number of status changes) or where the same status appears twice consecutively
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'facture_id', id,
        'facture_number', facture_number,
        'statut', statut,
        'history_length', jsonb_array_length(statut_history),
        'statut_history', statut_history
      )
    ),
    '[]'::jsonb
  )
  INTO v_suspicious
  FROM public.factures
  WHERE organization_id = v_org_id
    AND jsonb_array_length(statut_history) > 3;

  RETURN jsonb_build_object(
    'overdueFactures',        v_overdue_count,
    'recentAnnulations',      v_recent_annulations,
    'suspiciousTransitions',  v_suspicious,
    'unpaidOlderThan30Days',  v_unpaid_older_30,
    'totalOutstanding',       v_total_outstanding
  );

END;
$$;

REVOKE ALL ON FUNCTION public.get_facture_monitoring_report() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_facture_monitoring_report() TO authenticated;
