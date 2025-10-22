-- Corriger les problèmes de CORS pour Storage
-- Exécutez ce script si vous avez des erreurs CORS

-- Insérer les headers CORS nécessaires pour Storage
INSERT INTO storage.cors (
  origin,
  method,
  headers,
  max_age,
  credentials
) VALUES 
  ('*', 'GET, POST, PUT, DELETE, OPTIONS', '*', '86400', 'true'),
  ('https://localhost:3000', 'GET, POST, PUT, DELETE, OPTIONS', '*', '86400', 'true'),
  ('https://localhost:8080', 'GET, POST, PUT, DELETE, OPTIONS', '*', '86400', 'true')
) ON CONFLICT DO NOTHING;

-- Vérifier les règles CORS
SELECT origin, method, max_age FROM storage.cors ORDER BY max_age DESC;