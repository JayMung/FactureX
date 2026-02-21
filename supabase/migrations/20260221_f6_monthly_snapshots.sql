-- F6-2: Monthly Balance Snapshots + Cron mensuel

CREATE TABLE IF NOT EXISTS public.monthly_balance_snapshots (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  compte_id       uuid        NOT NULL REFERENCES public.comptes_financiers(id) ON DELETE CASCADE,
  organization_id uuid        NOT NULL,
  snapshot_date   date        NOT NULL,
  solde           numeric     NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Unicité : un seul snapshot par compte par mois
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_snapshots_compte_date
  ON public.monthly_balance_snapshots (compte_id, snapshot_date);

-- Index pour requêtes par org et date
CREATE INDEX IF NOT EXISTS idx_monthly_snapshots_org_date
  ON public.monthly_balance_snapshots (organization_id, snapshot_date DESC);

-- RLS
ALTER TABLE public.monthly_balance_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_snapshots_select_members"
  ON public.monthly_balance_snapshots
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.organization_id = monthly_balance_snapshots.organization_id
    )
  );

-- Fonction generate_monthly_snapshot
CREATE OR REPLACE FUNCTION public.generate_monthly_snapshot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.monthly_balance_snapshots (
    compte_id,
    organization_id,
    snapshot_date,
    solde
  )
  SELECT
    id,
    organization_id,
    date_trunc('month', now())::date,
    solde_actuel
  FROM public.comptes_financiers
  WHERE is_active = true
  ON CONFLICT (compte_id, snapshot_date) DO NOTHING;
END;
$$;

-- Cron mensuel : 1er du mois à 2h UTC
SELECT cron.schedule(
  'monthly_balance_snapshot',
  '0 2 1 * *',
  $$SELECT public.generate_monthly_snapshot();$$
);

-- Snapshot initial immédiat
SELECT public.generate_monthly_snapshot();
