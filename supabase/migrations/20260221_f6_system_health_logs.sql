-- F6-1: System Health Logs + Cron Integrity Check
-- Table de logs pour les checks d'intégrité automatiques

CREATE TABLE IF NOT EXISTS public.system_health_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type    text        NOT NULL,
  status        text        NOT NULL,
  error_count   integer     NOT NULL DEFAULT 0,
  warning_count integer     NOT NULL DEFAULT 0,
  details       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Index pour requêtes récentes par type
CREATE INDEX IF NOT EXISTS idx_system_health_logs_type_date
  ON public.system_health_logs (check_type, created_at DESC);

-- RLS
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;

-- Lecture : super_admin uniquement
CREATE POLICY "system_health_logs_select_super_admin"
  ON public.system_health_logs
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Fonction check_ledger_integrity : lit v_balance_integrity, log, retourne jsonb
CREATE OR REPLACE FUNCTION public.check_ledger_integrity()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_error_count   int;
  v_warn_count    int;
  v_status        text;
  v_details       jsonb;
BEGIN
  SELECT COUNT(*) INTO v_error_count
  FROM v_balance_integrity
  WHERE statut = 'ERROR';

  SELECT COUNT(*) INTO v_warn_count
  FROM v_balance_integrity
  WHERE statut = 'WARN';

  v_status := CASE
    WHEN v_error_count > 0 THEN 'ERROR'
    WHEN v_warn_count  > 0 THEN 'WARN'
    ELSE 'OK'
  END;

  -- Détails : liste des comptes en erreur/warn
  SELECT jsonb_build_object(
    'timestamp', now(),
    'accounts', COALESCE(jsonb_agg(jsonb_build_object(
      'compte', compte_nom,
      'devise', devise,
      'statut', statut,
      'ecart',  ecart
    )), '[]'::jsonb)
  ) INTO v_details
  FROM v_balance_integrity
  WHERE statut IN ('ERROR', 'WARN');

  INSERT INTO public.system_health_logs (
    check_type, status, error_count, warning_count, details
  ) VALUES (
    'ledger', v_status, v_error_count, v_warn_count, v_details
  );

  RETURN jsonb_build_object(
    'status',       v_status,
    'errorCount',   v_error_count,
    'warningCount', v_warn_count,
    'timestamp',    now()
  );
END;
$$;

-- Cron quotidien à 3h UTC
SELECT cron.schedule(
  'ledger_integrity_daily',
  '0 3 * * *',
  $$SELECT public.check_ledger_integrity();$$
);
