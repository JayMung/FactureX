-- Migration des anciens motifs vers les nouveaux termes
-- Date: 2025-12-08
-- Objectif: Standardiser les motifs de transactions pour simplifier la logique

-- Afficher l'état actuel avant migration
DO $$
BEGIN
  RAISE NOTICE '=== ÉTAT AVANT MIGRATION ===';
END $$;

SELECT 
  motif, 
  type_transaction,
  COUNT(*) as count,
  SUM(CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) as avec_client,
  SUM(CASE WHEN client_id IS NULL THEN 1 ELSE 0 END) as sans_client
FROM transactions
WHERE motif IN ('Commande', 'Transfert', 'Transfert Reçu')
GROUP BY motif, type_transaction
ORDER BY motif;

-- 1. Commande -> Commande (Facture)
-- Mettre à jour toutes les transactions avec motif "Commande"
UPDATE transactions
SET motif = 'Commande (Facture)',
    updated_at = NOW()
WHERE motif = 'Commande'
  AND type_transaction = 'revenue';

-- 2. Transfert -> Transfert (Argent) pour les transactions AVEC client
-- Ce sont les transferts commerciaux (envoi d'argent client)
UPDATE transactions  
SET motif = 'Transfert (Argent)',
    updated_at = NOW()
WHERE motif = 'Transfert'
  AND client_id IS NOT NULL;

-- 3. Transfert sans client -> garder tel quel ou renommer en "Swap Compte"
-- Ces transactions sont des swaps internes entre comptes
-- Pour l'instant on les laisse tel quel, ils seront filtrés par l'onglet "Swaps"

-- 4. Transfert Reçu reste inchangé (déjà OK)

-- Afficher l'état après migration
DO $$
BEGIN
  RAISE NOTICE '=== ÉTAT APRÈS MIGRATION ===';
END $$;

SELECT 
  motif, 
  type_transaction,
  COUNT(*) as count,
  SUM(CASE WHEN client_id IS NOT NULL THEN 1 ELSE 0 END) as avec_client,
  SUM(CASE WHEN client_id IS NULL THEN 1 ELSE 0 END) as sans_client
FROM transactions
WHERE motif LIKE '%Commande%' 
   OR motif LIKE '%Transfert%'
   OR motif LIKE '%Paiement%'
GROUP BY motif, type_transaction
ORDER BY motif;

-- Vérifier qu'il ne reste plus d'anciens motifs
DO $$
DECLARE
  old_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO old_count
  FROM transactions
  WHERE motif IN ('Commande', 'Transfert')
    AND client_id IS NOT NULL;
  
  IF old_count > 0 THEN
    RAISE WARNING 'Il reste % transactions avec anciens motifs!', old_count;
  ELSE
    RAISE NOTICE 'Migration réussie: tous les anciens motifs ont été mis à jour';
  END IF;
END $$;
