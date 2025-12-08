-- Migration: Nettoyer les valeurs CNY et bénéfice pour Paiement Colis
-- Date: 2025-12-08
-- Description: Mettre à 0 les champs benefice et montant_cny pour les paiements colis existants

-- Afficher l'état avant
SELECT 
  id,
  motif,
  categorie,
  montant,
  benefice,
  montant_cny
FROM transactions
WHERE (motif ILIKE '%colis%' OR categorie ILIKE '%colis%')
  AND (benefice != 0 OR montant_cny != 0)
LIMIT 10;

-- Mettre à jour les paiements colis existants
UPDATE transactions
SET 
  benefice = 0,
  montant_cny = 0,
  frais = 0,
  updated_at = NOW()
WHERE (motif ILIKE '%paiement colis%' OR motif ILIKE '%colis%' 
       OR categorie ILIKE '%paiement colis%' OR categorie ILIKE '%colis%')
  AND type_transaction = 'revenue';

-- Afficher le résultat
SELECT 
  COUNT(*) as nb_updated,
  SUM(CASE WHEN benefice = 0 AND montant_cny = 0 THEN 1 ELSE 0 END) as nb_corriges
FROM transactions
WHERE motif ILIKE '%colis%' OR categorie ILIKE '%colis%';
