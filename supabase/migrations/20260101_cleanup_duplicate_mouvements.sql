-- Script de nettoyage des mouvements en double
-- Ce script identifie et supprime les mouvements obsolètes/doublons créés avant la correction du bug

-- ÉTAPE 1: Identifier les transactions qui ont plusieurs mouvements (doublons potentiels)
-- Ceci liste les IDs de transactions qui ont plus de mouvements qu'attendu
SELECT 
  transaction_id,
  COUNT(*) as nombre_mouvements,
  string_agg(DISTINCT compte_id::text, ', ') as comptes_affectes
FROM mouvements_comptes
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
HAVING COUNT(*) > (
  -- Nombre attendu de mouvements selon le type de transaction
  CASE 
    WHEN (SELECT type_transaction FROM transactions WHERE id = transaction_id) = 'transfert' THEN 2
    ELSE 1
  END
)
ORDER BY nombre_mouvements DESC;

-- ÉTAPE 2: Script de nettoyage automatique (ATTENTION: à exécuter APRÈS vérification)
-- Ce script garde uniquement le mouvement le plus récent pour chaque transaction

-- Créer une fonction temporaire de nettoyage
CREATE OR REPLACE FUNCTION clean_duplicate_mouvements()
RETURNS TABLE(
  deleted_count INTEGER,
  transaction_id UUID
) AS $$
DECLARE
  v_transaction RECORD;
  v_deleted_count INTEGER := 0;
  v_total_deleted INTEGER := 0;
BEGIN
  -- Pour chaque transaction qui a trop de mouvements
  FOR v_transaction IN 
    SELECT DISTINCT m.transaction_id
    FROM mouvements_comptes m
    WHERE m.transaction_id IS NOT NULL
    GROUP BY m.transaction_id
    HAVING COUNT(*) > (
      CASE 
        WHEN (SELECT type_transaction FROM transactions WHERE id = m.transaction_id) = 'transfert' THEN 2
        ELSE 1
      END
    )
  LOOP
    -- Supprimer tous les mouvements SAUF les plus récents
    -- Pour un transfert : garde les 2 plus récents (1 débit + 1 crédit)
    -- Pour revenue/depense : garde le plus récent
    
    WITH latest_mouvements AS (
      SELECT id
      FROM mouvements_comptes
      WHERE transaction_id = v_transaction.transaction_id
      ORDER BY created_at DESC
      LIMIT (
        CASE 
          WHEN (SELECT type_transaction FROM transactions WHERE id = v_transaction.transaction_id) = 'transfert' THEN 2
          ELSE 1
        END
      )
    )
    DELETE FROM mouvements_comptes
    WHERE transaction_id = v_transaction.transaction_id
      AND id NOT IN (SELECT id FROM latest_mouvements);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    v_total_deleted := v_total_deleted + v_deleted_count;
    
    RETURN QUERY SELECT v_deleted_count, v_transaction.transaction_id;
  END LOOP;
  
  RAISE NOTICE 'Total mouvements supprimés: %', v_total_deleted;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- POUR EXÉCUTER LE NETTOYAGE, décommentez cette ligne:
-- SELECT * FROM clean_duplicate_mouvements();

-- Une fois le nettoyage terminé, supprimer la fonction temporaire:
-- DROP FUNCTION IF EXISTS clean_duplicate_mouvements();

-- ÉTAPE 3: Vérification post-nettoyage
-- Exécutez ceci APRÈS le nettoyage pour vérifier qu'il n'y a plus de doublons
SELECT 
  t.id as transaction_id,
  t.type_transaction,
  COUNT(m.id) as nombre_mouvements,
  CASE 
    WHEN t.type_transaction = 'transfert' THEN 2
    ELSE 1
  END as nombre_attendu
FROM transactions t
LEFT JOIN mouvements_comptes m ON m.transaction_id = t.id
GROUP BY t.id, t.type_transaction
HAVING COUNT(m.id) != (
  CASE 
    WHEN t.type_transaction = 'transfert' THEN 2
    ELSE 1
  END
)
ORDER BY nombre_mouvements DESC;

-- Si cette requête ne retourne AUCUNE ligne, le nettoyage est réussi!
