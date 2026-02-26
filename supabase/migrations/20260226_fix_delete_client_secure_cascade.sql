-- ============================================================
-- Fix delete_client_secure to cascade-delete factures and colis
-- Date: 2026-02-26
-- ============================================================
-- Problem: delete_client_secure only deletes transactions before deleting the client,
-- but factures, colis, and colis_maritime also reference client_id.
-- If the client has any of these, the delete fails with a FK violation.
--
-- Solution: Delete all related records (paiements, factures, colis, colis_maritime,
-- transactions) before deleting the client itself.

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

  -- Check for paid invoices (non-super_admin cannot delete clients with paid invoices)
  IF v_role <> 'super_admin' THEN
    IF EXISTS (
      SELECT 1 FROM public.factures
      WHERE client_id = p_client_id AND statut = 'payee'
    ) THEN
      RAISE EXCEPTION 'Impossible de supprimer: le client a des factures payées. Annulez-les d''abord.';
    END IF;
  END IF;

  -- Atomic cascade deletion (same transaction context)
  -- 1. Delete paiements linked to client's factures
  DELETE FROM public.paiements
  WHERE facture_id IN (
    SELECT id FROM public.factures WHERE client_id = p_client_id
  );

  -- 2. Delete factures
  DELETE FROM public.factures
  WHERE client_id = p_client_id;

  -- 3. Delete colis (aeriens)
  DELETE FROM public.colis
  WHERE client_id = p_client_id;

  -- 4. Delete colis_maritime
  DELETE FROM public.colis_maritime
  WHERE client_id = p_client_id;

  -- 5. Delete transactions
  DELETE FROM public.transactions
  WHERE client_id = p_client_id;

  -- 6. Delete the client
  DELETE FROM public.clients
  WHERE id = p_client_id
    AND organization_id = v_user_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Client deletion failed';
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.delete_client_secure(uuid)
IS 'Atomic client deletion with full cascade: paiements, factures, colis, colis_maritime, transactions, then client. Admin/super_admin only, same-org enforced.';
