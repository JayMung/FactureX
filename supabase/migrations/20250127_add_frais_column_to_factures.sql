-- Ajouter la colonne frais pour stocker les frais de commission (15% du sous-total)
-- Date: 2025-01-27

ALTER TABLE public.factures 
ADD COLUMN IF NOT EXISTS frais DECIMAL(10, 2) DEFAULT 0;

-- Insérer les paramètres de frais par défaut pour l'organisation par défaut
INSERT INTO public.settings (categorie, cle, valeur, description, organization_id) VALUES
  ('facture', 'frais_commande', '15', 'Frais de commission en pourcentage du sous-total', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (categorie, cle) DO NOTHING;

-- Mettre à jour les factures existantes pour calculer les frais rétroactivement
UPDATE public.factures 
SET frais = ROUND(subtotal * 0.15, 2)
WHERE frais = 0 AND subtotal > 0;

-- Mettre à jour le total général pour inclure les frais
UPDATE public.factures 
SET total_general = subtotal + COALESCE(frais, 0) + COALESCE(frais_transport_douane, 0)
WHERE total_general != subtotal + COALESCE(frais, 0) + COALESCE(frais_transport_douane, 0);

COMMENT ON COLUMN public.factures.frais IS 'Frais de commission calculés en pourcentage du sous-total';
