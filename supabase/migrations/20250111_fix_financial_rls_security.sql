-- =====================================================
-- SÉCURITÉ CRITIQUE - CORRECTION RLS FINANCES
-- =====================================================
-- Migration pour corriger les failles RLS critiques dans le module Finances
-- Auteur: Security Audit - Phase 1
-- Date: 2025-01-11

-- 1. SUPPRIMER LES ANCIENNES POLICIES NON SÉCURISÉES
DROP POLICY IF EXISTS "Allow authenticated users to delete comptes" ON comptes_financiers;
DROP POLICY IF EXISTS "Allow authenticated users to insert comptes" ON comptes_financiers;
DROP POLICY IF EXISTS "Allow authenticated users to update comptes" ON comptes_financiers;
DROP POLICY IF EXISTS "Allow authenticated users to view comptes" ON comptes_financiers;
DROP POLICY IF EXISTS "comptes_financiers_insert_policy" ON comptes_financiers;

-- 2. CRÉER LES POLICIES RLS SÉCURISÉES PAR ORGANIZATION

-- Politiques pour transactions (SÉCURITÉ MAXIMALE)
CREATE POLICY "transactions_select_secure_policy" ON transactions
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "transactions_insert_secure_policy" ON transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND montant > 0
    AND devise IN ('USD', 'CDF')
    AND frais >= 0
    AND type_transaction IN ('revenue', 'depense', 'transfert')
  );

CREATE POLICY "transactions_update_secure_policy" ON transactions
  FOR UPDATE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND montant > 0
    AND devise IN ('USD', 'CDF')
    AND frais >= 0
    AND type_transaction IN ('revenue', 'depense', 'transfert')
  );

CREATE POLICY "transactions_delete_secure_policy" ON transactions
  FOR DELETE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  );

-- Politiques pour comptes_financiers (SÉCURITÉ MAXIMALE)
CREATE POLICY "comptes_financiers_select_secure_policy" ON comptes_financiers
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "comptes_financiers_insert_secure_policy" ON comptes_financiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
    AND nom IS NOT NULL
    AND type_compte IN ('mobile_money', 'banque', 'cash')
    AND devise IN ('USD', 'CDF')
  );

CREATE POLICY "comptes_financiers_update_secure_policy" ON comptes_financiers
  FOR UPDATE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
    AND type_compte IN ('mobile_money', 'banque', 'cash')
    AND devise IN ('USD', 'CDF')
  );

CREATE POLICY "comptes_financiers_delete_secure_policy" ON comptes_financiers
  FOR DELETE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (auth.jwt() ->> 'role') = 'super_admin'
  );

-- Politiques pour paiements (SÉCURITÉ MAXIMALE)
DROP POLICY IF EXISTS "Users can delete paiements in their organization" ON paiements;
DROP POLICY IF EXISTS "Users can insert paiements in their organization" ON paiements;
DROP POLICY IF EXISTS "Users can update paiements in their organization" ON paiements;
DROP POLICY IF EXISTS "Users can view paiements from their organization" ON paiements;

CREATE POLICY "paiements_select_secure_policy" ON paiements
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "paiements_insert_secure_policy" ON paiements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
    AND montant_paye > 0
    AND type_paiement IN ('facture', 'colis')
  );

CREATE POLICY "paiements_update_secure_policy" ON paiements
  FOR UPDATE
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
    AND montant_paye > 0
    AND type_paiement IN ('facture', 'colis')
  );

CREATE POLICY "paiements_delete_secure_policy" ON paiements
  FOR DELETE
  TO authenticated
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (auth.jwt() ->> 'role') IN ('super_admin', 'admin')
  );

-- Politiques pour mouvements_comptes (SÉCURITÉ MAXIMALE)
DROP POLICY IF EXISTS "Users can insert mouvements in their organization" ON mouvements_comptes;
DROP POLICY IF EXISTS "Users can view mouvements from their organization" ON mouvements_comptes;

CREATE POLICY "mouvements_comptes_select_secure_policy" ON mouvements_comptes
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "mouvements_comptes_insert_secure_policy" ON mouvements_comptes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND montant >= 0
    AND type_mouvement IN ('debit', 'credit')
  );

-- 3. INDEX DE PERFORMANCE POUR LES REQUÊTES SÉCURISÉES
CREATE INDEX IF NOT EXISTS idx_transactions_organization_id ON transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_comptes_financiers_organization_id ON comptes_financiers(organization_id);
CREATE INDEX IF NOT EXISTS idx_paiements_organization_id ON paiements(organization_id);
CREATE INDEX IF NOT EXISTS idx_mouvements_comptes_organization_id ON mouvements_comptes(organization_id);

-- 4. FONCTION D'AUDIT SÉCURISÉE
CREATE OR REPLACE FUNCTION log_financial_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Logger uniquement si c'est une opération financière critique
  IF TG_TABLE_NAME IN ('transactions', 'paiements', 'comptes_financiers') THEN
    INSERT INTO activity_logs (user_id, action, cible, cible_id, details)
    VALUES (
      auth.uid(),
      CASE TG_OP 
        WHEN 'INSERT' THEN 'Création ' || TG_TABLE_NAME
        WHEN 'UPDATE' THEN 'Modification ' || TG_TABLE_NAME
        WHEN 'DELETE' THEN 'Suppression ' || TG_TABLE_NAME
      END,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object(
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'old_values', CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        'new_values', CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. TRIGGERS D'AUDIT AUTOMATIQUES
DROP TRIGGER IF EXISTS audit_transactions ON transactions;
CREATE TRIGGER audit_transactions
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_financial_audit();

DROP TRIGGER IF EXISTS audit_paiements ON paiements;
CREATE TRIGGER audit_paiements
  AFTER INSERT OR UPDATE OR DELETE ON paiements
  FOR EACH ROW EXECUTE FUNCTION log_financial_audit();

DROP TRIGGER IF EXISTS audit_comptes_financiers ON comptes_financiers;
CREATE TRIGGER audit_comptes_financiers
  AFTER INSERT OR UPDATE OR DELETE ON comptes_financiers
  FOR EACH ROW EXECUTE FUNCTION log_financial_audit();

-- 6. VALIDATION FINALE
SELECT 
  'RLS Policies Updated Successfully' as status,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename IN ('transactions', 'comptes_financiers', 'paiements', 'mouvements_comptes')
AND policyname LIKE '%_secure_policy';
