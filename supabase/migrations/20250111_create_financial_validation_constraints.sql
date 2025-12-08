-- =====================================================
-- PHASE 2 - VALIDATION SQL DES MONTANTS FINANCIERS
-- =====================================================
-- Migration pour créer des contraintes de validation SQL strictes
-- Auteur: Security Audit - Phase 2.3
-- Date: 2025-01-11

-- 1. CONTRAINTES DE VALIDATION POUR TRANSACTIONS
-- Supprimer les anciennes contraintes si elles existent
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_montant_positif;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_frais_inferieur_montant;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_devise_valide;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_type_transaction_valide;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_montant_maximum;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_benefice_coherent;

-- Créer les contraintes de validation améliorées
ALTER TABLE transactions 
  ADD CONSTRAINT check_montant_positif 
  CHECK (montant > 0 AND montant <= 999999999.99);

ALTER TABLE transactions 
  ADD CONSTRAINT check_frais_inferieur_montant 
  CHECK (frais >= 0 AND frais <= montant);

ALTER TABLE transactions 
  ADD CONSTRAINT check_devise_valide 
  CHECK (devise IN ('USD', 'CDF'));

ALTER TABLE transactions 
  ADD CONSTRAINT check_type_transaction_valide 
  CHECK (type_transaction IN ('revenue', 'depense', 'transfert'));

ALTER TABLE transactions 
  ADD CONSTRAINT check_montant_cny_valide 
  CHECK (montant_cny >= 0);

ALTER TABLE transactions 
  ADD CONSTRAINT check_taux_change_positif 
  CHECK (taux_usd_cny > 0 AND taux_usd_cdf > 0);

-- 2. CONTRAINTES DE VALIDATION POUR COMPTES_FINANCIERS
-- Supprimer les anciennes contraintes
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_type_compte_valide;
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_devise_compte_valide;
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_solde_actuel_valide;
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_nom_non_vide;

-- Créer les contraintes de validation améliorées
ALTER TABLE comptes_financiers 
  ADD CONSTRAINT check_type_compte_valide 
  CHECK (type_compte IN ('mobile_money', 'banque', 'cash'));

ALTER TABLE comptes_financiers 
  ADD CONSTRAINT check_devise_compte_valide 
  CHECK (devise IN ('USD', 'CDF'));

ALTER TABLE comptes_financiers 
  ADD CONSTRAINT check_solde_actuel_valide 
  CHECK (solde_actuel >= 0 AND solde_actuel <= 999999999.99);

ALTER TABLE comptes_financiers 
  ADD CONSTRAINT check_nom_non_vide 
  CHECK (nom IS NOT NULL AND LENGTH(TRIM(nom)) > 0);

ALTER TABLE comptes_financiers 
  ADD CONSTRAINT check_numero_compte_format 
  CHECK (numero_compte IS NULL OR LENGTH(TRIM(numero_compte)) >= 0);

-- 3. CONTRAINTES DE VALIDATION POUR PAIEMENTS
-- Supprimer les anciennes contraintes
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS check_montant_paye_positif;
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS check_type_paiement_valide;
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS check_montant_paye_maximum;

-- Créer les contraintes de validation améliorées
ALTER TABLE paiements 
  ADD CONSTRAINT check_montant_paye_positif 
  CHECK (montant_paye > 0 AND montant_paye <= 999999999.99);

ALTER TABLE paiements 
  ADD CONSTRAINT check_type_paiement_valide 
  CHECK (type_paiement IN ('facture', 'colis'));

-- 4. CONTRAINTES DE VALIDATION POUR MOUVEMENTS_COMPTES
-- Supprimer les anciennes contraintes
ALTER TABLE mouvements_comptes DROP CONSTRAINT IF EXISTS check_montant_mouvement_positif;
ALTER TABLE mouvements_comptes DROP CONSTRAINT IF EXISTS check_type_mouvement_valide;
ALTER TABLE mouvements_comptes DROP CONSTRAINT IF EXISTS check_soldes_coherents;

-- Créer les contraintes de validation améliorées
ALTER TABLE mouvements_comptes 
  ADD CONSTRAINT check_montant_mouvement_positif 
  CHECK (montant >= 0 AND montant <= 999999999.99);

ALTER TABLE mouvements_comptes 
  ADD CONSTRAINT check_type_mouvement_valide 
  CHECK (type_mouvement IN ('debit', 'credit'));

ALTER TABLE mouvements_comptes 
  ADD CONSTRAINT check_soldes_coherents 
  CHECK (
    (type_mouvement = 'debit' AND solde_apres = solde_avant - montant) OR
    (type_mouvement = 'credit' AND solde_apres = solde_avant + montant)
  );

-- 5. CONTRAINTES DE VALIDATION POUR CLIENTS
-- Supprimer les anciennes contraintes
ALTER TABLE clients DROP CONSTRAINT IF EXISTS check_nom_client_non_vide;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS check_telephone_format;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS check_total_paye_valide;

-- Créer les contraintes de validation améliorées
ALTER TABLE clients 
  ADD CONSTRAINT check_nom_client_non_vide 
  CHECK (nom IS NOT NULL AND LENGTH(TRIM(nom)) > 0 AND LENGTH(TRIM(nom)) <= 100);

ALTER TABLE clients 
  ADD CONSTRAINT check_telephone_format 
  CHECK (
    telephone IS NULL OR 
    (LENGTH(TRIM(telephone)) >= 10 AND LENGTH(TRIM(telephone)) <= 20)
  );

ALTER TABLE clients 
  ADD CONSTRAINT check_total_paye_valide 
  CHECK (total_paye >= 0);

-- 6. CONTRAINTES DE VALIDATION POUR FACTURES
-- Supprimer les anciennes contraintes
ALTER TABLE factures DROP CONSTRAINT IF EXISTS check_montant_facture_positif;
ALTER TABLE factures DROP CONSTRAINT IF EXISTS check_total_general_valide;
ALTER TABLE factures DROP CONSTRAINT IF EXISTS check_numero_facture_unique;

-- Créer les contraintes de validation améliorées
ALTER TABLE factures 
  ADD CONSTRAINT check_montant_facture_positif 
  CHECK (total_general > 0 AND total_general <= 999999999.99);

ALTER TABLE factures 
  ADD CONSTRAINT check_total_general_valide 
  CHECK (total_general >= 0 AND total_general <= 999999999.99);

ALTER TABLE factures 
  ADD CONSTRAINT check_statut_facture_valide 
  CHECK (statut_paiement IN ('payee', 'impayee', 'partiellement_payee', 'non_paye'));

-- 7. FONCTION DE VALIDATION COMPLÈTE DES MONTANTS
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
  
  -- Validation de la devise
  IF p_devise NOT IN ('USD', 'CDF') THEN
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

-- 8. TRIGGER DE VALIDATION AUTOMATIQUE DES MONTANTS
CREATE OR REPLACE FUNCTION validate_amounts_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Validation pour transactions
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NOT validate_financial_amounts(NEW.montant, NEW.frais, NEW.devise, 'transactions') THEN
      RAISE EXCEPTION 'Montants de transaction invalides: montant=%, frais=%, devise=%', 
        NEW.montant, NEW.frais, NEW.devise;
    END IF;
  END IF;
  
  -- Validation pour paiements
  IF TG_TABLE_NAME = 'paiements' THEN
    IF NOT validate_financial_amounts(NEW.montant_paye, NULL, NULL, 'paiements') THEN
      RAISE EXCEPTION 'Montant de paiement invalide: %', NEW.montant_paye;
    END IF;
  END IF;
  
  -- Validation pour comptes_financiers
  IF TG_TABLE_NAME = 'comptes_financiers' THEN
    IF NOT validate_financial_amounts(NEW.solde_actuel, NULL, NEW.devise, 'comptes_financiers') THEN
      RAISE EXCEPTION 'Solde actuel de compte invalide: %', NEW.solde_actuel;
    END IF;
  END IF;
  
  -- Validation pour mouvements_comptes
  IF TG_TABLE_NAME = 'mouvements_comptes' THEN
    IF NOT validate_financial_amounts(NEW.montant, NULL, NULL, 'mouvements_comptes') THEN
      RAISE EXCEPTION 'Montant de mouvement invalide: %', NEW.montant;
    END IF;
  END IF;
  
  -- Validation pour factures
  IF TG_TABLE_NAME = 'factures' THEN
    IF NOT validate_financial_amounts(NEW.total_general, NULL, NULL, 'factures') THEN
      RAISE EXCEPTION 'Montant de facture invalide: %', NEW.total_general;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. CRÉATION DES TRIGGERS DE VALIDATION
DROP TRIGGER IF EXISTS validate_amounts_trigger ON transactions;
CREATE TRIGGER validate_amounts_trigger
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_amounts_before_insert();

DROP TRIGGER IF EXISTS validate_amounts_trigger ON paiements;
CREATE TRIGGER validate_amounts_trigger
  BEFORE INSERT OR UPDATE ON paiements
  FOR EACH ROW EXECUTE FUNCTION validate_amounts_before_insert();

DROP TRIGGER IF EXISTS validate_amounts_trigger ON comptes_financiers;
CREATE TRIGGER validate_amounts_trigger
  BEFORE INSERT OR UPDATE ON comptes_financiers
  FOR EACH ROW EXECUTE FUNCTION validate_amounts_before_insert();

DROP TRIGGER IF EXISTS validate_amounts_trigger ON mouvements_comptes;
CREATE TRIGGER validate_amounts_trigger
  BEFORE INSERT OR UPDATE ON mouvements_comptes
  FOR EACH ROW EXECUTE FUNCTION validate_amounts_before_insert();

DROP TRIGGER IF EXISTS validate_amounts_trigger ON factures;
CREATE TRIGGER validate_amounts_trigger
  BEFORE INSERT OR UPDATE ON factures
  FOR EACH ROW EXECUTE FUNCTION validate_amounts_before_insert();

-- 10. VALIDATION FINALE - Vérification des contraintes
SELECT 
  'Financial Validation Constraints Created Successfully' as status,
  tc.table_name,
  tc.constraint_name,
  tc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name IN ('transactions', 'paiements', 'comptes_financiers', 'mouvements_comptes', 'clients', 'factures')
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name, tc.constraint_name;
