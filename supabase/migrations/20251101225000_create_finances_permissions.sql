-- Migration: Create module and permissions for Finances
-- This ensures only authorized users can access financial data

-- Create finances module
INSERT INTO modules (id, nom, description, is_active, created_at)
VALUES (
  'finances',
  'Finances',
  'Gestion financière complète : transactions, encaissements, comptes et mouvements',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  nom = EXCLUDED.nom,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

-- Create granular permissions for finances module
INSERT INTO permissions (module_id, action, description, created_at) VALUES
-- General access
('finances', 'view', 'Voir le module Finances', NOW()),

-- Transactions clients
('finances', 'transactions', 'Gérer les transactions clients (Commandes et Transferts)', NOW()),

-- Dépenses & Revenus
('finances', 'depenses_revenus', 'Gérer les dépenses et revenus internes', NOW()),

-- Encaissements
('finances', 'encaissements.create', 'Créer des encaissements (paiements factures/colis)', NOW()),
('finances', 'encaissements.view', 'Voir les encaissements', NOW()),
('finances', 'encaissements.delete', 'Supprimer des encaissements', NOW()),

-- Comptes
('finances', 'comptes.view', 'Voir les comptes financiers', NOW()),
('finances', 'comptes.create', 'Créer des comptes financiers', NOW()),
('finances', 'comptes.edit', 'Modifier des comptes financiers', NOW()),
('finances', 'comptes.delete', 'Supprimer des comptes financiers', NOW()),

-- Mouvements
('finances', 'mouvements.view', 'Voir l\'historique des mouvements de comptes', NOW()),
('finances', 'mouvements.export', 'Exporter les mouvements de comptes', NOW())

ON CONFLICT (module_id, action) DO UPDATE
SET description = EXCLUDED.description;

-- Assign all finances permissions to super_admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id 
FROM permissions 
WHERE module_id = 'finances'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Assign all finances permissions to admin
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id 
FROM permissions 
WHERE module_id = 'finances'
ON CONFLICT (role, permission_id) DO NOTHING;

-- Create optional 'comptable' role with read-only access
-- Note: This role must be added to the role enum first if it doesn't exist
-- For now, we'll just prepare the permissions

-- If you want to create a comptable role, uncomment these lines:
/*
-- Add comptable role (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role' AND 'comptable' = ANY(enum_range(NULL::user_role)::text[])) THEN
    ALTER TYPE user_role ADD VALUE 'comptable';
  END IF;
END$$;

-- Assign read-only permissions to comptable
INSERT INTO role_permissions (role, permission_id)
SELECT 'comptable', id 
FROM permissions 
WHERE module_id = 'finances' 
  AND action IN (
    'view',
    'encaissements.view',
    'comptes.view',
    'mouvements.view',
    'mouvements.export'
  )
ON CONFLICT (role, permission_id) DO NOTHING;
*/

-- Create function to check if user has finances access
CREATE OR REPLACE FUNCTION has_finances_access(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  has_access BOOLEAN;
BEGIN
  -- Get user role
  SELECT raw_app_meta_data->>'role' INTO user_role
  FROM auth.users
  WHERE id = user_id;
  
  -- Super admin and admin always have access
  IF user_role IN ('super_admin', 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has finances.view permission
  SELECT EXISTS(
    SELECT 1
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role = user_role
      AND p.module_id = 'finances'
      AND p.action = 'view'
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policy to paiements table to restrict access to authorized users only
DROP POLICY IF EXISTS "Only authorized users can view paiements" ON paiements;
CREATE POLICY "Only authorized users can view paiements"
  ON paiements FOR SELECT
  USING (
    has_finances_access(auth.uid()) AND
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only authorized users can insert paiements" ON paiements;
CREATE POLICY "Only authorized users can insert paiements"
  ON paiements FOR INSERT
  WITH CHECK (
    has_finances_access(auth.uid()) AND
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only authorized users can update paiements" ON paiements;
CREATE POLICY "Only authorized users can update paiements"
  ON paiements FOR UPDATE
  USING (
    has_finances_access(auth.uid()) AND
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Only authorized users can delete paiements" ON paiements;
CREATE POLICY "Only authorized users can delete paiements"
  ON paiements FOR DELETE
  USING (
    has_finances_access(auth.uid()) AND
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

COMMENT ON FUNCTION has_finances_access(UUID) IS 'Check if user has access to finances module. Returns true for super_admin, admin, and users with finances.view permission.';
COMMENT ON TABLE modules IS 'Available modules in the system. Finances module requires special permissions.';
