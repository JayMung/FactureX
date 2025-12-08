-- Migration: Créer la table finance_categories
-- Date: 2025-11-26
-- Description: Table pour gérer les catégories de revenus et dépenses avec icônes et couleurs

-- Table pour les catégories de revenus et dépenses
CREATE TABLE IF NOT EXISTS finance_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('revenue', 'depense')),
  icon VARCHAR(50) DEFAULT 'dollar-sign',
  couleur VARCHAR(20) DEFAULT '#22c55e',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(organization_id, code, type)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_finance_categories_org ON finance_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_finance_categories_type ON finance_categories(type);
CREATE INDEX IF NOT EXISTS idx_finance_categories_active ON finance_categories(is_active);

-- RLS Policies
ALTER TABLE finance_categories ENABLE ROW LEVEL SECURITY;

-- Policy pour lecture
CREATE POLICY "Users can view their organization's finance categories"
  ON finance_categories FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy pour insertion
CREATE POLICY "Users can create finance categories for their organization"
  ON finance_categories FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy pour mise à jour
CREATE POLICY "Users can update their organization's finance categories"
  ON finance_categories FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Policy pour suppression
CREATE POLICY "Users can delete their organization's finance categories"
  ON finance_categories FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Trigger pour auto-set organization_id
CREATE OR REPLACE FUNCTION auto_set_organization_on_finance_categories()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM profiles
    WHERE id = auth.uid();
  END IF;
  
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_auto_set_org_finance_categories ON finance_categories;
CREATE TRIGGER trigger_auto_set_org_finance_categories
  BEFORE INSERT ON finance_categories
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_organization_on_finance_categories();

-- Insérer des catégories par défaut pour les organisations existantes
INSERT INTO finance_categories (organization_id, nom, code, type, icon, couleur, description)
SELECT 
  o.id,
  cat.nom,
  cat.code,
  cat.type,
  cat.icon,
  cat.couleur,
  cat.description
FROM organizations o
CROSS JOIN (
  VALUES 
    -- Catégories de revenus
    ('Commande', 'COMMANDE', 'revenue', 'shopping-cart', '#22c55e', 'Paiement de commande/facture'),
    ('Transfert', 'TRANSFERT', 'revenue', 'credit-card', '#3b82f6', 'Transfert d''argent'),
    ('Paiement Colis', 'PAIEMENT_COLIS', 'revenue', 'package', '#8b5cf6', 'Paiement de colis'),
    ('Autre Revenu', 'AUTRE_REVENU', 'revenue', 'dollar-sign', '#06b6d4', 'Autres revenus'),
    -- Catégories de dépenses
    ('Paiement Fournisseur', 'FOURNISSEUR', 'depense', 'truck', '#ef4444', 'Paiement aux fournisseurs'),
    ('Paiement Shipping', 'SHIPPING', 'depense', 'ship', '#f59e0b', 'Frais de transport'),
    ('Loyer', 'LOYER', 'depense', 'home', '#ec4899', 'Loyer et charges'),
    ('Salaires', 'SALAIRES', 'depense', 'users', '#6366f1', 'Salaires du personnel'),
    ('Transport', 'TRANSPORT', 'depense', 'car', '#14b8a6', 'Frais de transport local'),
    ('Carburant', 'CARBURANT', 'depense', 'zap', '#f97316', 'Carburant véhicules'),
    ('Maintenance', 'MAINTENANCE', 'depense', 'tool', '#64748b', 'Maintenance et réparations'),
    ('Autre Dépense', 'AUTRE_DEPENSE', 'depense', 'dollar-sign', '#94a3b8', 'Autres dépenses')
) AS cat(nom, code, type, icon, couleur, description)
ON CONFLICT (organization_id, code, type) DO NOTHING;
