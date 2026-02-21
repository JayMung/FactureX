-- Clients Phase 3: indexing and maintenance trigger for scale
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_clients_nom_trgm
ON public.clients
USING gin (nom gin_trgm_ops);

DROP INDEX IF EXISTS public.idx_clients_telephone_org;

CREATE OR REPLACE FUNCTION public.set_clients_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_clients_updated_at ON public.clients;

CREATE TRIGGER trigger_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.set_clients_updated_at();
