-- Vérifier s'il y a des transactions à tester
SELECT id, montant, devise, statut, created_at 
FROM transactions 
ORDER BY created_at DESC 
LIMIT 3;