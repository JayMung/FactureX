-- Migration: Fix Rawbank account balance
-- The account should have $400 instead of $800
-- This corrects a duplicate credit that was applied

-- Update Rawbank balance to correct value
UPDATE comptes_financiers
SET solde_actuel = 400.00,
    updated_at = NOW()
WHERE nom = 'Rawbank' 
  AND solde_actuel = 800.00;

-- Add comment
COMMENT ON TABLE comptes_financiers IS 'Table des comptes financiers avec soldes synchronisés automatiquement via triggers';
