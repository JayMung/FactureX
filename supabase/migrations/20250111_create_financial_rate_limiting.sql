-- =====================================================
-- PHASE 2 - RATE LIMITING OPÉRATIONS FINANCIÈRES
-- =====================================================
-- Migration pour implémenter le rate limiting sur les opérations financières sensibles
-- Auteur: Security Audit - Phase 2.2
-- Date: 2025-01-11

-- 1. CRÉATION DE LA TABLE RATE_LIMITING
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  operation_type text NOT NULL,
  operation_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  window_end timestamp with time zone NOT NULL,
  is_blocked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. INDEX POUR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_operation_window ON rate_limits(user_id, operation_type, window_end);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON rate_limits(is_blocked, window_end);

-- 3. RLS POUR RATE_LIMITS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rate_limits_select_policy" ON rate_limits
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "rate_limits_insert_policy" ON rate_limits
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. FONCTION DE VÉRIFICATION DE RATE LIMIT
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_operation_type text,
  p_max_attempts integer DEFAULT 10,
  p_window_minutes integer DEFAULT 60
)
RETURNS boolean AS $$
DECLARE
  v_current_count integer;
  v_window_start timestamp with time zone;
  v_window_end timestamp with time zone;
  v_is_blocked boolean;
BEGIN
  -- Définir la fenêtre de temps
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  v_window_end := now();
  
  -- Vérifier si l'utilisateur est déjà bloqué
  SELECT is_blocked INTO v_is_blocked
  FROM rate_limits
  WHERE user_id = auth.uid()
    AND operation_type = p_operation_type
    AND window_end > v_window_start
    AND is_blocked = true;
  
  IF v_is_blocked THEN
    RETURN false;
  END IF;
  
  -- Compter les opérations dans la fenêtre
  SELECT COALESCE(SUM(operation_count), 0) INTO v_current_count
  FROM rate_limits
  WHERE user_id = auth.uid()
    AND operation_type = p_operation_type
    AND window_end > v_window_start;
  
  -- Vérifier si la limite est dépassée
  IF v_current_count >= p_max_attempts THEN
    -- Bloquer l'utilisateur
    UPDATE rate_limits
    SET is_blocked = true,
        updated_at = now()
    WHERE user_id = auth.uid()
      AND operation_type = p_operation_type
      AND window_end > v_window_start;
      
    RETURN false;
  END IF;
  
  -- Incrémenter le compteur ou créer une nouvelle entrée
  UPDATE rate_limits
  SET operation_count = operation_count + 1,
      updated_at = now()
  WHERE user_id = auth.uid()
    AND operation_type = p_operation_type
    AND window_end > v_window_start;
    
  IF NOT FOUND THEN
    INSERT INTO rate_limits (
      user_id,
      operation_type,
      operation_count,
      window_start,
      window_end
    ) VALUES (
      auth.uid(),
      p_operation_type,
      1,
      v_window_start,
      v_window_end
    );
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FONCTION DE CONFIGURATION DES LIMITES PAR OPÉRATION
CREATE OR REPLACE FUNCTION get_operation_limits(p_operation_type text)
RETURNS TABLE(max_attempts integer, window_minutes integer) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE p_operation_type
      WHEN 'create_transaction' THEN 10
      WHEN 'delete_transaction' THEN 5
      WHEN 'update_transaction' THEN 20
      WHEN 'create_paiement' THEN 15
      WHEN 'delete_paiement' THEN 3
      WHEN 'update_paiement' THEN 10
      WHEN 'create_compte' THEN 5
      WHEN 'delete_compte' THEN 2
      WHEN 'update_compte' THEN 8
      ELSE 10
    END as max_attempts,
    CASE p_operation_type
      WHEN 'delete_transaction' THEN 360  -- 6 heures
      WHEN 'delete_paiement' THEN 360     -- 6 heures
      WHEN 'delete_compte' THEN 1440     -- 24 heures
      ELSE 60                           -- 1 heure
    END as window_minutes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FONCTION DE VÉRIFICATION UNIFIÉE
CREATE OR REPLACE FUNCTION check_financial_rate_limit(p_operation_type text)
RETURNS boolean AS $$
DECLARE
  v_limits record;
BEGIN
  -- Récupérer les limites pour cette opération
  SELECT * INTO v_limits FROM get_operation_limits(p_operation_type) LIMIT 1;
  
  -- Vérifier le rate limit
  RETURN check_rate_limit(p_operation_type, v_limits.max_attempts, v_limits.window_minutes);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGERS DE RATE LIMITING SUR LES OPÉRATIONS SENSIBLES

-- Trigger pour transactions
CREATE OR REPLACE FUNCTION rate_limit_transactions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT check_financial_rate_limit('create_transaction') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la création de transactions. Veuillez réessayer plus tard.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT check_financial_rate_limit('update_transaction') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la modification de transactions. Veuillez réessayer plus tard.';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT check_financial_rate_limit('delete_transaction') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la suppression de transactions. Veuillez réessayer plus tard.';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour paiements
CREATE OR REPLACE FUNCTION rate_limit_paiements()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT check_financial_rate_limit('create_paiement') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la création de paiements. Veuillez réessayer plus tard.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT check_financial_rate_limit('update_paiement') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la modification de paiements. Veuillez réessayer plus tard.';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT check_financial_rate_limit('delete_paiement') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la suppression de paiements. Veuillez réessayer plus tard.';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour comptes_financiers
CREATE OR REPLACE FUNCTION rate_limit_comptes_financiers()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT check_financial_rate_limit('create_compte') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la création de comptes. Veuillez réessayer plus tard.';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT check_financial_rate_limit('update_compte') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la modification de comptes. Veuillez réessayer plus tard.';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT check_financial_rate_limit('delete_compte') THEN
      RAISE EXCEPTION 'Rate limit dépassé pour la suppression de comptes. Veuillez réessayer plus tard.';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CRÉATION DES TRIGGERS
DROP TRIGGER IF EXISTS rate_limit_transactions_trigger ON transactions;
CREATE TRIGGER rate_limit_transactions_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION rate_limit_transactions();

DROP TRIGGER IF EXISTS rate_limit_paiements_trigger ON paiements;
CREATE TRIGGER rate_limit_paiements_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON paiements
  FOR EACH ROW EXECUTE FUNCTION rate_limit_paiements();

DROP TRIGGER IF EXISTS rate_limit_comptes_financiers_trigger ON comptes_financiers;
CREATE TRIGGER rate_limit_comptes_financiers_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON comptes_financiers
  FOR EACH ROW EXECUTE FUNCTION rate_limit_comptes_financiers();

-- 9. FONCTION DE NETTOYAGE DES ANCIENS ENREGISTREMENTS
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  -- Supprimer les enregistrements de plus de 24 heures
  DELETE FROM rate_limits 
  WHERE window_end < now() - interval '24 hours'
    AND is_blocked = false;
    
  -- Supprimer les blocages expirés
  UPDATE rate_limits
  SET is_blocked = false,
      operation_count = 0
  WHERE is_blocked = true
    AND window_end < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FONCTION DE STATISTIQUES DE RATE LIMITING
CREATE OR REPLACE FUNCTION get_rate_limit_stats(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(
  operation_type text,
  current_count integer,
  max_attempts integer,
  is_blocked boolean,
  window_remaining_minutes integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rl.operation_type,
    rl.operation_count,
    gl.max_attempts,
    rl.is_blocked,
    EXTRACT(EPOCH FROM (rl.window_end - now())) / 60 as window_remaining_minutes
  FROM rate_limits rl
  CROSS JOIN LATERAL get_operation_limits(rl.operation_type) gl
  WHERE (p_user_id IS NULL OR rl.user_id = p_user_id)
    AND rl.window_end > now()
    AND (rl.is_blocked = true OR rl.operation_count > 0)
  ORDER BY rl.operation_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. VALIDATION FINALE
SELECT 
  'Financial Rate Limiting System Created Successfully' as status,
  (SELECT COUNT(*) FROM rate_limits) as total_rate_limit_entries,
  (SELECT COUNT(*) FROM pg_trigger WHERE tgname LIKE '%rate_limit%') as rate_limit_triggers_count;
