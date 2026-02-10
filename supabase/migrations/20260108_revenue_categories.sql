-- Migration: Ajouter les 4 catégories de revenue essentielles
-- À exécuter dans Supabase SQL Editor

-- D'abord, désactiver les anciennes catégories revenue non utilisées
UPDATE finance_categories 
SET is_active = false 
WHERE type = 'revenue' 
  AND nom NOT IN ('Transfert Reçu', 'Commande (Facture)', 'Paiement Colis', 'Autres Paiement');

-- Ensuite, insérer ou mettre à jour les 4 catégories essentielles
INSERT INTO finance_categories (nom, code, type, is_active, description)
VALUES 
  ('Transfert Reçu', 'TRANSFERT_RECU', 'revenue', true, 'Paiement transfert - Applique 5% de frais'),
  ('Commande (Facture)', 'COMMANDE', 'revenue', true, 'Paiement facture client - Applique 15% de frais'),
  ('Paiement Colis', 'PAIEMENT_COLIS', 'revenue', true, 'Paiement lié à un colis - Pas de frais'),
  ('Autres Paiement', 'AUTRE_PAIEMENT', 'revenue', true, 'Autres types de paiement - Pas de frais')
ON CONFLICT (nom) DO UPDATE SET
  code = EXCLUDED.code,
  type = EXCLUDED.type,
  is_active = true,
  description = EXCLUDED.description;

-- Vérification
SELECT * FROM finance_categories WHERE type = 'revenue' AND is_active = true ORDER BY nom;
