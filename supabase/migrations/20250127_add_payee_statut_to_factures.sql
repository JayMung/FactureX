-- Ajouter le statut "payee" aux options valides pour les factures
-- Date: 2025-01-27

-- Supprimer l'ancienne contrainte de statut
ALTER TABLE public.factures DROP CONSTRAINT IF EXISTS factures_statut_check;

-- Ajouter la nouvelle contrainte avec "payee" inclus
ALTER TABLE public.factures 
ADD CONSTRAINT factures_statut_check 
CHECK (statut IN ('brouillon', 'en_attente', 'validee', 'payee', 'annulee'));

-- Commentaire pour documenter les statuts disponibles
COMMENT ON COLUMN public.factures.statut IS 'Statut de la facture: brouillon, en_attente, validee, payee, annulee';
