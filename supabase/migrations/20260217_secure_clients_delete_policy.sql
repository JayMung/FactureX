-- Phase 2 Security Hardening - Clients module
-- 1) Secure DELETE RLS policy for clients
-- 2) Harden merge_clients_secure with admin-only role check
-- 3) Add atomic delete_client_secure RPC

-- =====================================================
-- FIX 1: Secure DELETE RLS policy (same org + admin role)
-- =====================================================
DROP POLICY IF EXISTS clients_delete_policy ON public.clients;

CREATE POLICY clients_delete_policy
ON public.clients
FOR DELETE
TO authenticated
USING (
  organization_id = (
    SELECT p.organization_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
  AND COALESCE(auth.jwt() ->> 'role', '') IN ('admin', 'super_admin')
);

-- =====================================================
-- FIX 2: Harden merge_clients_secure (admin-only)
-- =====================================================
CREATE OR REPLACE FUNCTION public.merge_clients_secure(
  p_master_id uuid,
  p_secondary_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_org_id uuid;
  v_secondary_org_id uuid;
  v_user_org_id uuid;
  v_role text;
  v_rows_updated integer;
  v_total_updated integer := 0;
BEGIN
  -- Admin role check
  v_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  -- Resolve caller organization
  SELECT organization_id INTO v_user_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_org_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: organization not found';
  END IF;

  -- Security check: IDs must exist and belong to the same organization
  SELECT organization_id INTO v_master_org_id FROM public.clients WHERE id = p_master_id;
  SELECT organization_id INTO v_secondary_org_id FROM public.clients WHERE id = p_secondary_id;

  IF v_master_org_id IS NULL OR v_secondary_org_id IS NULL THEN
    RAISE EXCEPTION 'One or both clients do not exist';
  END IF;

  IF v_master_org_id <> v_secondary_org_id THEN
    RAISE EXCEPTION 'Clients belong to different organizations';
  END IF;

  -- Caller must belong to the same organization
  IF v_master_org_id <> v_user_org_id THEN
    RAISE EXCEPTION 'Permission denied: different organization';
  END IF;

  -- Reassign all linked data
  UPDATE public.transactions
  SET client_id = p_master_id
  WHERE client_id = p_secondary_id;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_rows_updated;

  UPDATE public.factures
  SET client_id = p_master_id
  WHERE client_id = p_secondary_id;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_rows_updated;

  UPDATE public.colis
  SET client_id = p_master_id
  WHERE client_id = p_secondary_id;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_rows_updated;

  UPDATE public.colis_maritime
  SET client_id = p_master_id
  WHERE client_id = p_secondary_id;
  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  v_total_updated := v_total_updated + v_rows_updated;

  -- Delete secondary client
  DELETE FROM public.clients
  WHERE id = p_secondary_id;

  -- Audit log
  INSERT INTO public.activity_logs (
    organization_id,
    user_id,
    action,
    table_name,
    record_id,
    details
  ) VALUES (
    v_master_org_id,
    auth.uid(),
    'MERGE',
    'clients',
    p_master_id,
    jsonb_build_object(
      'merged_id', p_secondary_id,
      'records_updated', v_total_updated
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'master_id', p_master_id,
    'records_updated', v_total_updated
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_clients_secure(uuid, uuid) TO authenticated;

-- =====================================================
-- FIX 3: Atomic delete RPC (delete transactions + client)
-- =====================================================
CREATE OR REPLACE FUNCTION public.delete_client_secure(
  p_client_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_org_id uuid;
  v_user_org_id uuid;
  v_role text;
BEGIN
  -- Verify role
  v_role := COALESCE(auth.jwt() ->> 'role', '');
  IF v_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission denied: admin only';
  END IF;

  -- Resolve client org
  SELECT organization_id INTO v_client_org_id
  FROM public.clients
  WHERE id = p_client_id;

  IF v_client_org_id IS NULL THEN
    RAISE EXCEPTION 'Client not found';
  END IF;

  -- Resolve caller org
  SELECT organization_id INTO v_user_org_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_org_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: organization not found';
  END IF;

  -- Enforce same-organization access
  IF v_client_org_id <> v_user_org_id THEN
    RAISE EXCEPTION 'Permission denied: different organization';
  END IF;

  -- Atomic deletion (same transaction context)
  DELETE FROM public.transactions
  WHERE client_id = p_client_id;

  DELETE FROM public.clients
  WHERE id = p_client_id
    AND organization_id = v_user_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client deletion failed';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_client_secure(uuid) TO authenticated;
