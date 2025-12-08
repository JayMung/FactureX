-- Migration pour corriger le calcul CNY des transactions existantes
-- Le montant CNY doit être calculé sur le montant NET (après déduction des frais)
-- au lieu du montant BRUT

-- Recalculer le montant_cny pour toutes les transactions existantes
UPDATE transactions
SET montant_cny = CASE 
  WHEN devise = 'USD' THEN 
    (montant - frais) * taux_usd_cny
  ELSE 
    ((montant - frais) / taux_usd_cdf) * taux_usd_cny
END
WHERE montant_cny IS NOT NULL;

-- Ajouter un commentaire pour documenter le changement
COMMENT ON COLUMN transactions.montant_cny IS 'Montant en CNY calculé sur le montant net (montant - frais)';
