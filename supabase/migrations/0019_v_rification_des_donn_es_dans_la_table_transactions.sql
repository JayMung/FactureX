-- Vérifier s'il y a des données dans transactions
SELECT COUNT(*) as total_transactions FROM transactions;

-- Vérifier la structure de quelques transactions si elles existent
SELECT 
    id,
    client_id,
    montant,
    devise,
    motif,
    created_at,
    statut
FROM transactions 
ORDER BY created_at DESC 
LIMIT 5;