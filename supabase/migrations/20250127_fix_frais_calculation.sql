-- Corriger le calcul des frais pour toutes les factures
-- Date: 2025-01-27

-- Mettre à jour les frais pour toutes les factures qui ont un subtotal
UPDATE public.factures 
SET frais = ROUND(subtotal * 0.15, 2)
WHERE subtotal > 0;

-- Recalculer le total général pour toutes les factures
UPDATE public.factures 
SET total_general = subtotal + COALESCE(frais, 0) + COALESCE(frais_transport_douane, 0)
WHERE subtotal > 0;

-- Commentaire pour documenter la correction
COMMENT ON COLUMN public.factures.frais IS 'Frais de services (15% du sous-total) - Mis à jour le 2025-01-27';
