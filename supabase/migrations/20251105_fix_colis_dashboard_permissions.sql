-- Fix: Permissions RLS pour le Dashboard Colis
-- Problème: Les utilisateurs ne peuvent pas lire les statistiques des colis
-- Solution: Ajouter une policy de lecture plus permissive pour les statistiques

-- 1. Vérifier que RLS est activé
ALTER TABLE colis ENABLE ROW LEVEL SECURITY;

-- 2. Créer une policy pour permettre la lecture des statistiques
-- Cette policy permet aux utilisateurs authentifiés de lire les colis de leur organisation
CREATE POLICY IF NOT EXISTS "Allow authenticated users to read colis stats" ON colis
  FOR SELECT
  TO authenticated
  USING (
    -- Vérifier que l'utilisateur appartient à la même organisation
    organization_id IN (
      SELECT organization_id 
      FROM profiles 
      WHERE id = auth.uid()
    )
    OR
    -- OU permettre aux super admins de tout voir
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- 3. S'assurer que tous les colis ont un organization_id valide
-- Mettre à jour les colis sans organization_id (si nécessaire)
UPDATE colis
SET organization_id = (
  SELECT organization_id 
  FROM profiles 
  WHERE id = created_by
  LIMIT 1
)
WHERE organization_id IS NULL
AND created_by IS NOT NULL;

-- 4. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_colis_organization_id ON colis(organization_id);
CREATE INDEX IF NOT EXISTS idx_colis_statut ON colis(statut);
CREATE INDEX IF NOT EXISTS idx_colis_organization_statut ON colis(organization_id, statut);

-- 5. Vérifier les données
DO $$
BEGIN
  RAISE NOTICE 'Total colis: %', (SELECT COUNT(*) FROM colis);
  RAISE NOTICE 'Colis sans organization_id: %', (SELECT COUNT(*) FROM colis WHERE organization_id IS NULL);
  RAISE NOTICE 'Statuts distincts: %', (SELECT STRING_AGG(DISTINCT statut, ', ') FROM colis);
END $$;
