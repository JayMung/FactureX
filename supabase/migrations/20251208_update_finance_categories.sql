-- Migration: Mettre à jour les catégories de finance_categories
-- Date: 2025-12-08
-- Description: Remplacer les anciennes catégories par les nouvelles standardisées

-- Afficher l'état actuel
SELECT nom, code, type FROM finance_categories WHERE type = 'revenue' ORDER BY nom;

-- 1. Mettre à jour "Commande" -> "Commande (Facture)"
UPDATE finance_categories
SET nom = 'Commande (Facture)',
    updated_at = NOW()
WHERE nom = 'Commande'
  AND type = 'revenue';

-- 2. Mettre à jour "Transfert" -> "Transfert (Argent)"  
UPDATE finance_categories
SET nom = 'Transfert (Argent)',
    updated_at = NOW()
WHERE nom = 'Transfert'
  AND type = 'revenue';

-- 3. Ajouter les nouvelles catégories manquantes si elles n'existent pas
INSERT INTO finance_categories (nom, code, type, icon, couleur, description)
SELECT 
  cat.nom,
  cat.code,
  cat.type,
  cat.icon,
  cat.couleur,
  cat.description
FROM (
  VALUES 
    ('Transfert (Argent)', 'TRANSFERT_ARGENT', 'revenue', 'arrow-right-left', '#3b82f6', 'Transfert d''argent client'),
    ('Transfert Reçu', 'TRANSFERT_RECU', 'revenue', 'arrow-down-left', '#10b981', 'Transfert reçu'),
    ('Autres Paiements', 'AUTRES_PAIEMENTS', 'revenue', 'credit-card', '#6366f1', 'Autres types de paiements')
) AS cat(nom, code, type, icon, couleur, description)
WHERE NOT EXISTS (
  SELECT 1 FROM finance_categories fc
  WHERE fc.code = cat.code AND fc.type = cat.type
);

-- 4. Supprimer ou désactiver les catégories obsolètes qui ne sont plus utilisées
-- Désactiver "Autre Revenu", "Commission", "Remboursement Reçu" si non utilisés
UPDATE finance_categories
SET is_active = false,
    updated_at = NOW()
WHERE nom IN ('Autre Revenu', 'Commission', 'Remboursement Reçu')
  AND type = 'revenue'
  AND NOT EXISTS (
    SELECT 1 FROM transactions t 
    WHERE t.categorie = finance_categories.nom
  );

-- Afficher le résultat après migration
SELECT 
  nom,
  code,
  type,
  is_active,
  CASE 
    WHEN EXISTS (SELECT 1 FROM transactions t WHERE t.categorie = finance_categories.nom)
    THEN 'UTILISÉ'
    ELSE 'NON UTILISÉ'
  END as utilisation
FROM finance_categories 
WHERE type = 'revenue' 
ORDER BY is_active DESC, nom;
