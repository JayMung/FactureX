-- Vérifier s'il y a des clients à tester
SELECT id, nom, telephone, total_paye, created_at 
FROM clients 
ORDER BY created_at DESC 
LIMIT 3;