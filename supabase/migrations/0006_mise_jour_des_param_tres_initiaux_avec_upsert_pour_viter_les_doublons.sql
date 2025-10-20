-- Mise à jour des taux de change initiaux
INSERT INTO public.settings (categorie, cle, valeur, description, created_at, updated_at) VALUES
('taux_change', 'usdToCny', '7.25', 'Taux de change USD vers CNY', NOW(), NOW()),
('taux_change', 'usdToCdf', '2850', 'Taux de change USD vers CDF', NOW(), NOW())
ON CONFLICT (categorie, cle) 
DO UPDATE SET 
  valeur = EXCLUDED.valeur,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Mise à jour des frais de transaction initiaux
INSERT INTO public.settings (categorie, cle, valeur, description, created_at, updated_at) VALUES
('frais', 'transfert', '5', 'Frais de transfert en pourcentage', NOW(), NOW()),
('frais', 'commande', '10', 'Frais de commande en pourcentage', NOW(), NOW()),
('frais', 'partenaire', '3', 'Commission partenaire en pourcentage', NOW(), NOW())
ON CONFLICT (categorie, cle) 
DO UPDATE SET 
  valeur = EXCLUDED.valeur,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Mise à jour des modes de paiement initiaux
INSERT INTO public.settings (categorie, cle, valeur, description, created_at, updated_at) VALUES
('payment_methods', 'cash', 'true', 'Mode de paiement Cash activé', NOW(), NOW()),
('payment_methods', 'airtel_money', 'true', 'Mode de paiement Airtel Money activé', NOW(), NOW()),
('payment_methods', 'orange_money', 'true', 'Mode de paiement Orange Money activé', NOW(), NOW()),
('payment_methods', 'm_pesa', 'true', 'Mode de paiement M-Pesa activé', NOW(), NOW()),
('payment_methods', 'banque', 'true', 'Mode de paiement Banque activé', NOW(), NOW())
ON CONFLICT (categorie, cle) 
DO UPDATE SET 
  valeur = EXCLUDED.valeur,
  description = EXCLUDED.description,
  updated_at = NOW();