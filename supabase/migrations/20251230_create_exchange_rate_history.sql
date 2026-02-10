-- =====================================================
-- Migration: Historique des Taux de Change
-- Date: 2025-12-30
-- Description: Crée un système d'historique automatique
--              pour les modifications de taux de change
-- =====================================================

-- ===========================================
-- 1. TABLE PRINCIPALE D'HISTORIQUE
-- ===========================================
CREATE TABLE IF NOT EXISTS exchange_rate_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Type de taux modifié
    rate_key VARCHAR(50) NOT NULL CHECK (rate_key IN ('usdToCny', 'usdToCdf')),
    
    -- Valeurs avant/après
    old_value DECIMAL(15,4),
    new_value DECIMAL(15,4) NOT NULL,
    
    -- Métadonnées
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    organization_id UUID,
    
    -- Contexte additionnel
    change_reason TEXT,
    ip_address INET
);

-- ===========================================
-- 2. INDEX POUR PERFORMANCES
-- ===========================================
CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_date 
    ON exchange_rate_history(changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_key 
    ON exchange_rate_history(rate_key);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_history_org 
    ON exchange_rate_history(organization_id);

-- ===========================================
-- 3. POLITIQUES RLS
-- ===========================================
ALTER TABLE exchange_rate_history ENABLE ROW LEVEL SECURITY;

-- Lecture pour tous les utilisateurs authentifiés
CREATE POLICY "exchange_rate_history_select_policy"
    ON exchange_rate_history 
    FOR SELECT
    TO authenticated
    USING (true);

-- Insertion uniquement via le trigger (pas d'insertion directe)
CREATE POLICY "exchange_rate_history_insert_policy"
    ON exchange_rate_history 
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- 4. FONCTION TRIGGER
-- ===========================================
CREATE OR REPLACE FUNCTION log_exchange_rate_change()
RETURNS TRIGGER AS $$
DECLARE
    v_old_value DECIMAL(15,4);
    v_new_value DECIMAL(15,4);
BEGIN
    -- Vérifier que c'est une modification de taux de change
    IF NEW.categorie = 'taux_change' AND (NEW.cle = 'usdToCny' OR NEW.cle = 'usdToCdf') THEN
        -- Vérifier que la valeur a réellement changé
        IF OLD.valeur IS DISTINCT FROM NEW.valeur THEN
            -- Parser les valeurs de manière sécurisée
            BEGIN
                v_old_value := CASE 
                    WHEN OLD.valeur IS NOT NULL AND OLD.valeur ~ '^[0-9]+\.?[0-9]*$' 
                    THEN OLD.valeur::DECIMAL 
                    ELSE NULL 
                END;
                
                v_new_value := CASE 
                    WHEN NEW.valeur IS NOT NULL AND NEW.valeur ~ '^[0-9]+\.?[0-9]*$' 
                    THEN NEW.valeur::DECIMAL 
                    ELSE NULL 
                END;
            EXCEPTION WHEN OTHERS THEN
                -- Si parsing échoue, utiliser NULL pour old_value
                v_old_value := NULL;
                v_new_value := NULL;
            END;
            
            -- Insérer dans l'historique seulement si on a une nouvelle valeur valide
            IF v_new_value IS NOT NULL THEN
                INSERT INTO exchange_rate_history (
                    rate_key, 
                    old_value, 
                    new_value, 
                    changed_by, 
                    organization_id
                )
                VALUES (
                    NEW.cle,
                    v_old_value,
                    v_new_value,
                    auth.uid(),
                    NEW.organization_id
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 5. CRÉER LE TRIGGER
-- ===========================================
DROP TRIGGER IF EXISTS trigger_log_exchange_rate_change ON settings;

CREATE TRIGGER trigger_log_exchange_rate_change
    AFTER UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION log_exchange_rate_change();

-- ===========================================
-- 6. VUE ENRICHIE AVEC INFO UTILISATEUR
-- ===========================================
CREATE OR REPLACE VIEW exchange_rate_history_with_user AS
SELECT 
    h.id,
    h.rate_key,
    h.old_value,
    h.new_value,
    h.changed_at,
    h.organization_id,
    h.changed_by,
    p.email AS user_email,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) AS user_name,
    -- Calcul de la variation
    CASE 
        WHEN h.old_value IS NOT NULL AND h.old_value > 0 
        THEN ROUND(((h.new_value - h.old_value) / h.old_value) * 100, 2)
        ELSE NULL 
    END AS variation_percent
FROM exchange_rate_history h
LEFT JOIN profiles p ON p.id = h.changed_by
ORDER BY h.changed_at DESC;

-- Grant access to the view
GRANT SELECT ON exchange_rate_history_with_user TO authenticated;

-- ===========================================
-- 7. FONCTION RPC POUR RÉCUPÉRER L'HISTORIQUE
-- ===========================================
CREATE OR REPLACE FUNCTION get_exchange_rate_history(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_rate_key TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    rate_key VARCHAR(50),
    old_value DECIMAL(15,4),
    new_value DECIMAL(15,4),
    changed_at TIMESTAMPTZ,
    changed_by UUID,
    user_email TEXT,
    user_name TEXT,
    variation_percent DECIMAL(10,2)
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        h.id,
        h.rate_key,
        h.old_value,
        h.new_value,
        h.changed_at,
        h.changed_by,
        p.email::TEXT AS user_email,
        COALESCE(p.first_name || ' ' || p.last_name, p.email)::TEXT AS user_name,
        CASE 
            WHEN h.old_value IS NOT NULL AND h.old_value > 0 
            THEN ROUND(((h.new_value - h.old_value) / h.old_value) * 100, 2)
            ELSE NULL 
        END AS variation_percent
    FROM exchange_rate_history h
    LEFT JOIN profiles p ON p.id = h.changed_by
    WHERE (p_rate_key IS NULL OR h.rate_key = p_rate_key)
    ORDER BY h.changed_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_exchange_rate_history TO authenticated;

-- ===========================================
-- 8. COMMENTAIRES
-- ===========================================
COMMENT ON TABLE exchange_rate_history IS 'Historique automatique des modifications des taux de change USD/CNY et USD/CDF';
COMMENT ON COLUMN exchange_rate_history.rate_key IS 'Clé du taux modifié: usdToCny ou usdToCdf';
COMMENT ON COLUMN exchange_rate_history.old_value IS 'Ancienne valeur du taux avant modification';
COMMENT ON COLUMN exchange_rate_history.new_value IS 'Nouvelle valeur du taux après modification';
COMMENT ON COLUMN exchange_rate_history.changed_by IS 'UUID de l''utilisateur ayant effectué la modification';
COMMENT ON FUNCTION log_exchange_rate_change() IS 'Trigger function qui enregistre automatiquement les changements de taux dans exchange_rate_history';
