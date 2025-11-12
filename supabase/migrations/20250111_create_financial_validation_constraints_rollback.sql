-- =====================================================
-- ROLLBACK - CONTRAINTES DE VALIDATION FINANCIÈRES
-- =====================================================
-- Script pour supprimer toutes les contraintes de validation
-- A utiliser uniquement en cas de problème critique
-- Date: 2025-01-11

-- 1. SUPPRESSION DES TRIGGERS
DROP TRIGGER IF EXISTS validate_amounts_trigger ON transactions;
DROP TRIGGER IF EXISTS validate_amounts_trigger ON paiements;
DROP TRIGGER IF EXISTS validate_amounts_trigger ON comptes_financiers;
DROP TRIGGER IF EXISTS validate_amounts_trigger ON mouvements_comptes;
DROP TRIGGER IF EXISTS validate_amounts_trigger ON factures;

-- 2. SUPPRESSION DES FONCTIONS
DROP FUNCTION IF EXISTS validate_amounts_before_insert();
DROP FUNCTION IF EXISTS validate_financial_amounts(p_montant numeric, p_frais numeric, p_devise text, p_table_name text);

-- 3. SUPPRESSION DES CONTRAINTES PAR TABLE

-- Transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_montant_positif;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_frais_inferieur_montant;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_devise_valide;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_type_transaction_valide;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_montant_cny_valide;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS check_taux_change_positif;

-- Comptes Financiers
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_type_compte_valide;
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_devise_compte_valide;
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_solde_actuel_valide;
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_nom_non_vide;
ALTER TABLE comptes_financiers DROP CONSTRAINT IF EXISTS check_numero_compte_format;

-- Paiements
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS check_montant_paye_positif;
ALTER TABLE paiements DROP CONSTRAINT IF EXISTS check_type_paiement_valide;

-- Mouvements Comptes
ALTER TABLE mouvements_comptes DROP CONSTRAINT IF EXISTS check_montant_mouvement_positif;
ALTER TABLE mouvements_comptes DROP CONSTRAINT IF EXISTS check_type_mouvement_valide;
ALTER TABLE mouvements_comptes DROP CONSTRAINT IF EXISTS check_soldes_coherents;

-- Clients
ALTER TABLE clients DROP CONSTRAINT IF EXISTS check_nom_client_non_vide;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS check_telephone_format;
ALTER TABLE clients DROP CONSTRAINT IF EXISTS check_total_paye_valide;

-- Factures
ALTER TABLE factures DROP CONSTRAINT IF EXISTS check_montant_facture_positif;
ALTER TABLE factures DROP CONSTRAINT IF EXISTS check_total_general_valide;
ALTER TABLE factures DROP CONSTRAINT IF EXISTS check_statut_facture_valide;

-- 4. VALIDATION DU ROLLBACK
SELECT 
  'Financial Validation Constraints Rollback Completed' as status,
  COUNT(*) as constraints_removed
FROM information_schema.table_constraints tc
WHERE tc.table_name IN ('transactions', 'paiements', 'comptes_financiers', 'mouvements_comptes', 'clients', 'factures')
  AND tc.constraint_name LIKE 'check_%'
  AND tc.constraint_type = 'CHECK';
