-- Migration pour ajouter la colonne informations_bancaires à la table factures
-- Date: 2025-01-24

-- Ajouter la colonne informations_bancaires
ALTER TABLE public.factures
ADD COLUMN IF NOT EXISTS informations_bancaires TEXT;

-- Commentaire
COMMENT ON COLUMN public.factures.informations_bancaires IS 'Informations bancaires affichées au pied de la facture';
