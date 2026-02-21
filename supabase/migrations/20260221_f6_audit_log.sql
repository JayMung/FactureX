-- F6-3: Audit Log Structuré + trigger générique sur factures
-- Complémentaire aux triggers financial_audit_logs existants

CREATE TABLE IF NOT EXISTS public.audit_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name      text        NOT NULL,
  record_id       uuid,
  action          text        NOT NULL,
  old_data        jsonb,
  new_data        jsonb,
  performed_by    uuid,
  organization_id uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index pour recherche par table/record et par org/date
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record
  ON public.audit_log (table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_date
  ON public.audit_log (organization_id, created_at DESC);

-- RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin"
  ON public.audit_log
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- Fonction trigger générique
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    performed_by,
    organization_id
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid(),
    COALESCE(
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.organization_id ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN OLD.organization_id ELSE NULL END
    )
  );
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'audit_trigger error on %: %', TG_TABLE_NAME, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attacher sur factures (les autres tables ont déjà financial_audit_logs)
DROP TRIGGER IF EXISTS audit_factures ON public.factures;
CREATE TRIGGER audit_factures
  AFTER INSERT OR UPDATE OR DELETE ON public.factures
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();
