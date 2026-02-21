-- ============================================================
-- Phase A1: Secure facture_items with strict multi-tenant RLS
-- Date: 2026-02-17
-- ============================================================

-- 1) Add organization_id column
ALTER TABLE public.facture_items
ADD COLUMN IF NOT EXISTS organization_id UUID;

-- 2) Backfill organization_id from parent factures
UPDATE public.facture_items fi
SET organization_id = f.organization_id
FROM public.factures f
WHERE fi.facture_id = f.id
  AND fi.organization_id IS NULL;

-- 3) Guard: block migration if unresolved rows remain
DO $$
DECLARE
  v_missing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_missing_count
  FROM public.facture_items
  WHERE organization_id IS NULL;

  IF v_missing_count > 0 THEN
    RAISE EXCEPTION 'Cannot set facture_items.organization_id NOT NULL: % rows are still NULL', v_missing_count;
  END IF;
END $$;

-- 4) Set NOT NULL
ALTER TABLE public.facture_items
ALTER COLUMN organization_id SET NOT NULL;

-- 5) Add index for tenant isolation queries
CREATE INDEX IF NOT EXISTS idx_facture_items_org
ON public.facture_items (organization_id);

-- 6) Add FK to organizations if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facture_items_organization_id_fkey'
      AND conrelid = 'public.facture_items'::regclass
  ) THEN
    ALTER TABLE public.facture_items
    ADD CONSTRAINT facture_items_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations(id)
    ON DELETE RESTRICT;
  END IF;
END $$;

-- 7) Drop permissive and/or previous facture_items policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.facture_items;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.facture_items;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.facture_items;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.facture_items;

DROP POLICY IF EXISTS facture_items_select_policy ON public.facture_items;
DROP POLICY IF EXISTS facture_items_insert_policy ON public.facture_items;
DROP POLICY IF EXISTS facture_items_update_policy ON public.facture_items;
DROP POLICY IF EXISTS facture_items_delete_policy ON public.facture_items;

-- 8) Ensure RLS enabled
ALTER TABLE public.facture_items ENABLE ROW LEVEL SECURITY;

-- 9) Create strict organization-based policies
CREATE POLICY facture_items_select_policy
ON public.facture_items
FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY facture_items_insert_policy
ON public.facture_items
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY facture_items_update_policy
ON public.facture_items
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization_id())
WITH CHECK (organization_id = public.get_user_organization_id());

CREATE POLICY facture_items_delete_policy
ON public.facture_items
FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id());

-- 10) Trigger function to auto-set and enforce organization consistency
CREATE OR REPLACE FUNCTION public.set_facture_items_org()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_facture_org UUID;
BEGIN
  SELECT f.organization_id
  INTO v_facture_org
  FROM public.factures f
  WHERE f.id = NEW.facture_id;

  IF v_facture_org IS NULL THEN
    RAISE EXCEPTION 'Invalid facture_id: no parent facture found for %', NEW.facture_id;
  END IF;

  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := v_facture_org;
  ELSIF NEW.organization_id IS DISTINCT FROM v_facture_org THEN
    RAISE EXCEPTION 'organization_id mismatch between facture_items (%) and parent facture (%)', NEW.organization_id, v_facture_org;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_facture_items_org_trigger ON public.facture_items;

CREATE TRIGGER set_facture_items_org_trigger
BEFORE INSERT OR UPDATE ON public.facture_items
FOR EACH ROW
EXECUTE FUNCTION public.set_facture_items_org();

COMMENT ON FUNCTION public.set_facture_items_org()
IS 'Auto-assigns and enforces facture_items.organization_id from parent facture for strict tenant isolation.';
