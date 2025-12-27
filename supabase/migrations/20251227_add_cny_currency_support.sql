-- =====================================================
-- MIGRATION: Ajout du support de la devise CNY (Yuan Chinois)
-- =====================================================
-- Date: 2025-12-27
-- Description: Ajoute CNY comme devise valide pour les comptes financiers,
--              transactions, factures et autres tables financières.

-- 1. MISE À JOUR DE LA CONTRAINTE DE DEVISE POUR TRANSACTIONS
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_devise_valide;
ALTER TABLE transactions 
  ADD CONSTRAINT check_devise_valide 
  CHECK (devise IN ('USD', 'CDF', 'CNY'));

-- 2. MISE À JOUR DE LA CONTRAINTE DE DEVISE POUR COMPTES_FINANCIERS
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_devise_compte_valide;
ALTER TABLE comptes_financiers 
  ADD CONSTRAINT check_devise_compte_valide 
  CHECK (devise IN ('USD', 'CDF', 'CNY'));

-- 3. MISE À JOUR DE LA FONCTION DE VALIDATION DES MONTANTS
CREATE OR REPLACE FUNCTION validate_financial_amounts(
  p_montant numeric,
  p_frais numeric DEFAULT 0,
  p_devise text DEFAULT 'USD',
  p_table_name text DEFAULT 'transactions'
)
RETURNS boolean AS $$
DECLARE
  v_max_amount numeric := 999999999.99;
  v_min_amount numeric := 0;
BEGIN
  -- Validation du montant principal
  IF p_montant IS NULL OR p_montant <= v_min_amount OR p_montant > v_max_amount THEN
    RETURN false;
  END IF;
  
  -- Validation des frais
  IF p_frais IS NULL OR p_frais < v_min_amount OR p_frais > p_montant THEN
    RETURN false;
  END IF;
  
  -- Validation de la devise - Ajout de CNY
  IF p_devise NOT IN ('USD', 'CDF', 'CNY') THEN
    RETURN false;
  END IF;
  
  -- Validations spécifiques par table
  IF p_table_name = 'transactions' THEN
    -- Validation supplémentaire pour les transactions
    IF p_montant < 0.01 THEN  -- Montant minimum de 1 centime
      RETURN false;
    END IF;
  ELSIF p_table_name = 'paiements' THEN
    -- Validation pour les paiements
    IF p_montant < 1 THEN  -- Paiement minimum de $1
      RETURN false;
    END IF;
  ELSIF p_table_name = 'comptes_financiers' THEN
    -- Validation pour les soldes de comptes
    IF p_montant > 100000000 THEN  -- Solde maximum de 100M
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Confirmation de la migration
SELECT 'CNY currency support added successfully' as status;
