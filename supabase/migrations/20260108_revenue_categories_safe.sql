-- Migration "Safe" : Ajouter/MAJ les 4 catégories de revenue essentielles AVEC COULEURS
-- Compatible même si la colonne 'nom' n'est pas UNIQUE

-- 1. Désactiver les anciennes catégories revenue non utilisées
UPDATE finance_categories 
SET is_active = false 
WHERE type = 'revenue' 
  AND nom NOT IN ('Transfert Reçu', 'Commande (Facture)', 'Paiement Colis', 'Autres Paiement');

-- 2. Mettre à jour les existantes avec codes et COULEURS
UPDATE finance_categories SET code = 'TRANSFERT_RECU', couleur = '#0ea5e9', is_active = true, description = 'Applique 5% de frais' WHERE nom = 'Transfert Reçu' AND type = 'revenue';
UPDATE finance_categories SET code = 'COMMANDE', couleur = '#8b5cf6', is_active = true, description = 'Applique 15% de frais' WHERE nom = 'Commande (Facture)' AND type = 'revenue';
UPDATE finance_categories SET code = 'PAIEMENT_COLIS', couleur = '#f59e0b', is_active = true, description = 'Pas de frais' WHERE nom = 'Paiement Colis' AND type = 'revenue';
UPDATE finance_categories SET code = 'AUTRE_PAIEMENT', couleur = '#64748b', is_active = true, description = 'Pas de frais' WHERE nom = 'Autres Paiement' AND type = 'revenue';

-- 3. Insérer les manquantes (si elles n'existent pas)
INSERT INTO finance_categories (nom, code, type, is_active, description, couleur)
SELECT 'Transfert Reçu', 'TRANSFERT_RECU', 'revenue', true, 'Applique 5%', '#0ea5e9'
WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Transfert Reçu' AND type = 'revenue');

INSERT INTO finance_categories (nom, code, type, is_active, description, couleur)
SELECT 'Commande (Facture)', 'COMMANDE', 'revenue', true, 'Applique 15%', '#8b5cf6'
WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Commande (Facture)' AND type = 'revenue');

INSERT INTO finance_categories (nom, code, type, is_active, description, couleur)
SELECT 'Paiement Colis', 'PAIEMENT_COLIS', 'revenue', true, 'Pas de frais', '#f59e0b'
WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Paiement Colis' AND type = 'revenue');

INSERT INTO finance_categories (nom, code, type, is_active, description, couleur)
SELECT 'Autres Paiement', 'AUTRE_PAIEMENT', 'revenue', true, 'Pas de frais', '#64748b'
WHERE NOT EXISTS (SELECT 1 FROM finance_categories WHERE nom = 'Autres Paiement' AND type = 'revenue');

-- Vérification
SELECT nom, code, couleur, is_active FROM finance_categories WHERE type = 'revenue' AND is_active = true ORDER BY nom;
