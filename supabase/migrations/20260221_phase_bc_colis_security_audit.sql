-- ============================================================
-- PHASE B: Security fixes for colis table
-- PHASE C: Audit trail for colis table
-- ============================================================

-- ============================================================
-- PHASE B1: DELETE restricted to admin/super_admin only
-- ============================================================

DROP POLICY IF EXISTS "Users can delete their own organization colis" ON colis;

CREATE POLICY "Admins can delete colis"
ON colis
FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  )
);

-- ============================================================
-- PHASE B2: auto_set_organization trigger for colis
-- (no such trigger existed — create it, then drop hardcoded DEFAULT)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_set_organization_on_colis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Allow service_role inserts if organization_id is already set
  IF auth.uid() IS NULL THEN
    IF NEW.organization_id IS NOT NULL THEN
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'organization_id is required for service role inserts on colis';
    END IF;
  END IF;

  -- Resolve organization from user profile
  SELECT organization_id INTO user_org_id
  FROM profiles
  WHERE id = auth.uid();

  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User has no organization assigned';
  END IF;

  -- Auto-fill if not provided
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := user_org_id;
  END IF;

  -- Prevent cross-org inserts
  IF NEW.organization_id != user_org_id THEN
    RAISE EXCEPTION 'Cannot create colis for a different organization';
  END IF;

  -- Auto-fill created_by if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_set_organization_on_colis ON colis;

CREATE TRIGGER trigger_auto_set_organization_on_colis
BEFORE INSERT ON colis
FOR EACH ROW
EXECUTE FUNCTION auto_set_organization_on_colis();

-- Now safe to drop the hardcoded DEFAULT
ALTER TABLE colis ALTER COLUMN organization_id DROP DEFAULT;

-- ============================================================
-- PHASE C: Audit trail — full audit on colis changes
-- Tracks: INSERT, statut changes, statut_paiement changes,
--         montant_a_payer changes, DELETE
-- ============================================================

CREATE OR REPLACE FUNCTION audit_colis_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action TEXT;
  v_old_data JSONB;
  v_new_data JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'INSERT';
    v_old_data := NULL;
    v_new_data := jsonb_build_object(
      'statut', NEW.statut,
      'statut_paiement', NEW.statut_paiement,
      'montant_a_payer', NEW.montant_a_payer,
      'poids', NEW.poids,
      'tarif_kg', NEW.tarif_kg,
      'client_id', NEW.client_id,
      'fournisseur', NEW.fournisseur,
      'tracking_chine', NEW.tracking_chine
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- Only audit if meaningful fields changed
    IF OLD.statut IS NOT DISTINCT FROM NEW.statut
      AND OLD.statut_paiement IS NOT DISTINCT FROM NEW.statut_paiement
      AND OLD.montant_a_payer IS NOT DISTINCT FROM NEW.montant_a_payer
      AND OLD.poids IS NOT DISTINCT FROM NEW.poids
      AND OLD.tarif_kg IS NOT DISTINCT FROM NEW.tarif_kg
    THEN
      RETURN NEW; -- No meaningful change, skip audit
    END IF;

    v_action := 'UPDATE';
    v_old_data := jsonb_build_object(
      'statut', OLD.statut,
      'statut_paiement', OLD.statut_paiement,
      'montant_a_payer', OLD.montant_a_payer,
      'poids', OLD.poids,
      'tarif_kg', OLD.tarif_kg
    );
    v_new_data := jsonb_build_object(
      'statut', NEW.statut,
      'statut_paiement', NEW.statut_paiement,
      'montant_a_payer', NEW.montant_a_payer,
      'poids', NEW.poids,
      'tarif_kg', NEW.tarif_kg
    );

    -- Tag specific status change actions for easier querying
    IF OLD.statut IS DISTINCT FROM NEW.statut THEN
      v_action := 'STATUS_CHANGE';
    ELSIF OLD.statut_paiement IS DISTINCT FROM NEW.statut_paiement THEN
      v_action := 'PAYMENT_STATUS_CHANGE';
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_old_data := jsonb_build_object(
      'statut', OLD.statut,
      'statut_paiement', OLD.statut_paiement,
      'montant_a_payer', OLD.montant_a_payer,
      'poids', OLD.poids,
      'tarif_kg', OLD.tarif_kg,
      'client_id', OLD.client_id,
      'fournisseur', OLD.fournisseur,
      'tracking_chine', OLD.tracking_chine,
      'created_by', OLD.created_by
    );
    v_new_data := NULL;
  END IF;

  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    performed_by,
    organization_id
  ) VALUES (
    'colis',
    COALESCE(NEW.id, OLD.id),
    v_action,
    v_old_data,
    v_new_data,
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_audit_colis ON colis;

CREATE TRIGGER trigger_audit_colis
AFTER INSERT OR UPDATE OR DELETE ON colis
FOR EACH ROW
EXECUTE FUNCTION audit_colis_changes();
