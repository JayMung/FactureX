-- =====================================================
-- PHASE 2 - AUDIT & CONFORMITÉ FINANCIÈRE
-- =====================================================
-- Migration pour implémenter un audit complet des opérations financières
-- Auteur: Security Audit - Phase 2
-- Date: 2025-01-11

-- 1. CRÉATION DE LA TABLE FINANCIAL_AUDIT_LOGS
CREATE TABLE IF NOT EXISTS financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  ip_address inet,
  user_agent text,
  old_values jsonb,
  new_values jsonb,
  sensitive_fields_changed text[],
  risk_level text DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 2. INDEX POUR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_table_record ON financial_audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_user_timestamp ON financial_audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_org_timestamp ON financial_audit_logs(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_risk_level ON financial_audit_logs(risk_level);
CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_operation ON financial_audit_logs(operation);

-- 3. RLS POUR FINANCIAL_AUDIT_LOGS (SÉCURITÉ MAXIMALE)
ALTER TABLE financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour financial_audit_logs
CREATE POLICY "financial_audit_logs_select_policy" ON financial_audit_logs
  FOR SELECT
  TO authenticated
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "financial_audit_logs_insert_policy" ON financial_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- 4. FONCTION D'AUDIT FINANCIER AVANCÉE
CREATE OR REPLACE FUNCTION log_financial_audit_advanced()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id uuid;
  v_organization_id uuid;
  v_ip_address inet;
  v_user_agent text;
  v_old_values jsonb;
  v_new_values jsonb;
  v_sensitive_fields text[];
  v_risk_level text := 'low';
  v_montant_change numeric;
BEGIN
  -- Récupérer les informations de l'utilisateur
  v_user_id := auth.uid();
  SELECT organization_id INTO v_organization_id FROM profiles WHERE id = v_user_id;
  
  -- Récupérer IP et User Agent depuis les headers de la requête
  SELECT inet_client_addr() INTO v_ip_address;
  -- Note: user_agent nécessiterait une configuration côté application
  
  -- Déterminer les valeurs old/new
  v_old_values := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END;
  v_new_values := CASE WHEN TG_OP = 'INSERT' THEN to_jsonb(NEW) WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END;
  
  -- Détecter les champs sensibles modifiés
  v_sensitive_fields := ARRAY[]::text[];
  
  IF TG_OP = 'UPDATE' THEN
    IF OLD.montant IS DISTINCT FROM NEW.montant THEN
      v_sensitive_fields := array_append(v_sensitive_fields, 'montant');
    END IF;
    IF OLD.frais IS DISTINCT FROM NEW.frais THEN
      v_sensitive_fields := array_append(v_sensitive_fields, 'frais');
    END IF;
    IF OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id THEN
      v_sensitive_fields := array_append(v_sensitive_fields, 'compte_source_id');
    END IF;
    IF OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id THEN
      v_sensitive_fields := array_append(v_sensitive_fields, 'compte_destination_id');
    END IF;
  END IF;
  
  -- Calculer le niveau de risque
  v_risk_level := 'low';
  
  -- Risque élevé pour les suppressions
  IF TG_OP = 'DELETE' THEN
    v_risk_level := 'high';
  END IF;
  
  -- Risque critique pour les montants élevés
  IF TG_OP = 'INSERT' AND NEW.montant > 10000 THEN
    v_risk_level := 'critical';
  ELSIF TG_OP = 'UPDATE' AND ABS(COALESCE(NEW.montant, 0) - COALESCE(OLD.montant, 0)) > 5000 THEN
    v_risk_level := 'critical';
  END IF;
  
  -- Risque moyen pour les modifications de champs sensibles
  IF TG_OP = 'UPDATE' AND array_length(v_sensitive_fields, 1) > 0 THEN
    v_risk_level := 'medium';
  END IF;
  
  -- Insérer dans la table d'audit
  INSERT INTO financial_audit_logs (
    table_name,
    record_id,
    operation,
    user_id,
    organization_id,
    ip_address,
    user_agent,
    old_values,
    new_values,
    sensitive_fields_changed,
    risk_level
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    v_user_id,
    v_organization_id,
    v_ip_address,
    v_user_agent,
    v_old_values,
    v_new_values,
    v_sensitive_fields,
    v_risk_level
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. CRÉATION DES TRIGGERS D'AUDIT FINANCIER
DROP TRIGGER IF EXISTS audit_transactions_financial ON transactions;
CREATE TRIGGER audit_transactions_financial
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION log_financial_audit_advanced();

DROP TRIGGER IF EXISTS audit_paiements_financial ON paiements;
CREATE TRIGGER audit_paiements_financial
  AFTER INSERT OR UPDATE OR DELETE ON paiements
  FOR EACH ROW EXECUTE FUNCTION log_financial_audit_advanced();

DROP TRIGGER IF EXISTS audit_comptes_financiers_financial ON comptes_financiers;
CREATE TRIGGER audit_comptes_financiers_financial
  AFTER INSERT OR UPDATE OR DELETE ON comptes_financiers
  FOR EACH ROW EXECUTE FUNCTION log_financial_audit_advanced();

DROP TRIGGER IF EXISTS audit_mouvements_comptes_financial ON mouvements_comptes;
CREATE TRIGGER audit_mouvements_comptes_financial
  AFTER INSERT OR UPDATE OR DELETE ON mouvements_comptes
  FOR EACH ROW EXECUTE FUNCTION log_financial_audit_advanced();

-- 6. FONCTION DE GÉNÉRATION DE RAPPORT D'AUDIT
CREATE OR REPLACE FUNCTION generate_financial_audit_report(
  p_organization_id uuid,
  p_date_debut timestamp DEFAULT now() - interval '30 days',
  p_date_fin timestamp DEFAULT now(),
  p_risk_level text DEFAULT NULL
)
RETURNS TABLE (
  operation_date timestamp,
  table_name text,
  operation text,
  user_email text,
  risk_level text,
  sensitive_fields_count int,
  details jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fal.timestamp as operation_date,
    fal.table_name,
    fal.operation,
    u.email as user_email,
    fal.risk_level,
    array_length(fal.sensitive_fields_changed, 1) as sensitive_fields_count,
    jsonb_build_object(
      'old_values', fal.old_values,
      'new_values', fal.new_values,
      'ip_address', fal.ip_address,
      'sensitive_fields', fal.sensitive_fields_changed
    ) as details
  FROM financial_audit_logs fal
  JOIN auth.users u ON fal.user_id = u.id
  WHERE fal.organization_id = p_organization_id
    AND fal.timestamp BETWEEN p_date_debut AND p_date_fin
    AND (p_risk_level IS NULL OR fal.risk_level = p_risk_level)
  ORDER BY fal.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FONCTION DE DÉTECTION D'ANOMALIES
CREATE OR REPLACE FUNCTION detect_financial_anomalies(
  p_organization_id uuid,
  p_heures interval DEFAULT interval '24 hours'
)
RETURNS TABLE (
  anomaly_type text,
  description text,
  user_email text,
  anomaly_timestamp timestamp,
  severity text
) AS $$
BEGIN
  RETURN QUERY
  WITH user_activity AS (
    SELECT 
      fal.user_id,
      COUNT(*) as operation_count,
      SUM(CASE WHEN fal.risk_level = 'critical' THEN 1 ELSE 0 END) as critical_count,
      MAX(fal.timestamp) as last_activity
    FROM financial_audit_logs fal
    WHERE fal.organization_id = p_organization_id
      AND fal.timestamp >= now() - p_heures
    GROUP BY fal.user_id
  ),
  large_transactions AS (
    SELECT 
      fal.user_id,
      fal.new_values->>'montant'::text as montant,
      fal.timestamp
    FROM financial_audit_logs fal
    WHERE fal.organization_id = p_organization_id
      AND fal.operation = 'INSERT'
      AND fal.table_name = 'transactions'
      AND fal.timestamp >= now() - p_heures
      AND (fal.new_values->>'montant')::numeric > 10000
  ),
  frequent_deletes AS (
    SELECT 
      fal.user_id,
      COUNT(*) as delete_count
    FROM financial_audit_logs fal
    WHERE fal.organization_id = p_organization_id
      AND fal.operation = 'DELETE'
      AND fal.timestamp >= now() - p_heures
    GROUP BY fal.user_id
    HAVING COUNT(*) > 5
  )
  
  -- Anomalie 1: Trop d'opérations critiques
  SELECT 
    'critical_operations' as anomaly_type,
    format('Utilisateur avec %s opérations critiques en %s', ua.critical_count, p_heures) as description,
    u.email as user_email,
    ua.last_activity as anomaly_timestamp,
    CASE WHEN ua.critical_count > 10 THEN 'high' ELSE 'medium' END as severity
  FROM user_activity ua
  JOIN auth.users u ON ua.user_id = u.id
  WHERE ua.critical_count > 3
  
  UNION ALL
  
  -- Anomalie 2: Transactions très élevées
  SELECT 
    'large_transaction' as anomaly_type,
    format('Transaction de $%s détectée', lt.montant) as description,
    u.email as user_email,
    lt.timestamp as anomaly_timestamp,
    CASE WHEN (lt.montant)::numeric > 50000 THEN 'critical' ELSE 'high' END as severity
  FROM large_transactions lt
  JOIN auth.users u ON lt.user_id = u.id
  
  UNION ALL
  
  -- Anomalie 3: Suppressions fréquentes
  SELECT 
    'frequent_deletes' as anomaly_type,
    format('%s suppressions en %s', fd.delete_count, p_heures) as description,
    u.email as user_email,
    now() as anomaly_timestamp,
    'high' as severity
  FROM frequent_deletes fd
  JOIN auth.users u ON fd.user_id = u.id;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. VALIDATION FINALE
SELECT 
  'Financial Audit System Created Successfully' as status,
  (SELECT COUNT(*) FROM financial_audit_logs) as total_audit_entries,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%audit%_financial') as audit_triggers_count;
