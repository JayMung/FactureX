-- Vérifier la structure de la table clients
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'clients' 
    AND table_schema = 'public'
ORDER BY ordinal_position;