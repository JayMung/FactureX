SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (column_name LIKE '%content%' OR column_name LIKE '%html%' OR column_name LIKE '%description%')
ORDER BY table_name, column_name;