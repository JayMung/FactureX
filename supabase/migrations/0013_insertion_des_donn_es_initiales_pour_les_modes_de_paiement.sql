-- Insérer les modes de paiement initiaux
INSERT INTO payment_methods (name, code, icon, description) VALUES
('Cash', 'cash', 'banknote', 'Paiement en espèces'),
('Airtel Money', 'airtel_money', 'smartphone', 'Paiement mobile Airtel Money'),
('Orange Money', 'orange_money', 'smartphone', 'Paiement mobile Orange Money'),
('M-Pesa', 'mpesa', 'smartphone', 'Paiement mobile M-Pesa'),
('Banque', 'bank', 'building', 'Virement bancaire'),
('Carte Bancaire', 'card', 'credit-card', 'Paiement par carte bancaire')
ON CONFLICT (code) DO NOTHING;