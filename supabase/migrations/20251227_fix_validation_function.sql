-- =====================================================
-- FIX: Correction de la validation des montants financiers
-- =====================================================
-- Date: 2025-12-27
-- Description: Corrige la fonction validate_financial_amounts pour gérer correctement
--              les frais nuls (NULL) en les traitant comme 0.
--              Ceci résout l'erreur "Solde actuel de compte invalide" lors de la création de comptes.

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
  v_frais numeric;
BEGIN
  -- Initialisation des frais (traitement du NULL)
  v_frais := COALESCE(p_frais, 0);

  -- Validation du montant principal
  IF p_montant IS NULL OR p_montant <= v_min_amount OR p_montant > v_max_amount THEN
    RETURN false;
  END IF;
  
  -- Validation des frais
  IF v_frais < v_min_amount OR v_frais > p_montant THEN
    RETURN false;
  END IF;
  
  -- Validation de la devise (incluant CNY)
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

-- Confirmation
SELECT 'Validation function fixed successfully' as status;
