-- CRITICAL SECURITY FIX: Fix Multi-Tenancy RLS for Colis Tables
-- This fixes the critical vulnerability where all authenticated users could see all data

-- 1. Add organization_id column to tables that don't have it
ALTER TABLE colis ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE transitaires ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE tarifs_colis ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';
ALTER TABLE paiements_colis ADD COLUMN IF NOT EXISTS organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- Add foreign key constraints
ALTER TABLE colis ADD CONSTRAINT fk_colis_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE transitaires ADD CONSTRAINT fk_transitaires_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE tarifs_colis ADD CONSTRAINT fk_tarifs_colis_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE paiements_colis ADD CONSTRAINT fk_paiements_colis_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);

-- 2. Fix colis table RLS policies
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des colis" ON colis;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent modifier des colis" ON colis;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent supprimer des colis" ON colis;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir tous les colis" ON colis;

-- Create proper RLS policies for colis
CREATE POLICY "Users can view their own organization colis" ON colis
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert colis for their organization" ON colis
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own organization colis" ON colis
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own organization colis" ON colis
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- 2. Fix transitaires table RLS policies
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent gérer les transitaires" ON transitaires;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir les transitaires" ON transitaires;

-- Create proper RLS policies for transitaires
CREATE POLICY "Users can view their own organization transitaires" ON transitaires
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own organization transitaires" ON transitaires
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- 3. Fix tarifs_colis table RLS policies
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir les tarifs" ON tarifs_colis;

-- Create proper RLS policies for tarifs_colis
CREATE POLICY "Users can view their own organization tarifs" ON tarifs_colis
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- 4. Fix paiements_colis table RLS policies
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent créer des paiements" ON paiements_colis;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir les paiements" ON paiements_colis;

-- Create proper RLS policies for paiements_colis
CREATE POLICY "Users can view their own organization paiements" ON paiements_colis
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create paiements for their organization" ON paiements_colis
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = auth.uid()
    )
  );

-- Add comments
COMMENT ON POLICY "Users can view their own organization colis" ON colis IS 'Multi-tenant policy: users can only see colis from their organization';
COMMENT ON POLICY "Users can view their own organization transitaires" ON transitaires IS 'Multi-tenant policy: users can only see transitaires from their organization';
COMMENT ON POLICY "Users can view their own organization tarifs" ON tarifs_colis IS 'Multi-tenant policy: users can only see tarifs from their organization';
COMMENT ON POLICY "Users can view their own organization paiements" ON paiements_colis IS 'Multi-tenant policy: users can only see paiements from their organization';
