-- Migration: Create paiements system for factures only
-- Colis support will be added later when table exists

-- Create paiements table
CREATE TABLE IF NOT EXISTS paiements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_paiement TEXT NOT NULL CHECK (type_paiement IN ('facture', 'colis')),
  facture_id UUID REFERENCES factures(id) ON DELETE CASCADE,
  colis_id UUID, -- Will be linked later when colis_aeriens table exists
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  montant_paye DECIMAL(15, 2) NOT NULL CHECK (montant_paye > 0),
  compte_id UUID NOT NULL REFERENCES comptes_financiers(id) ON DELETE RESTRICT,
  mode_paiement TEXT,
  date_paiement TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  notes TEXT,
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Constraint: for now, facture_id is required for type 'facture'
  CONSTRAINT paiement_facture_check CHECK (
    (type_paiement = 'facture' AND facture_id IS NOT NULL) OR
    (type_paiement = 'colis' AND colis_id IS NOT NULL)
  )
);

-- Add indexes
CREATE INDEX idx_paiements_facture ON paiements(facture_id);
CREATE INDEX idx_paiements_colis ON paiements(colis_id);
CREATE INDEX idx_paiements_client ON paiements(client_id);
CREATE INDEX idx_paiements_compte ON paiements(compte_id);
CREATE INDEX idx_paiements_date ON paiements(date_paiement DESC);
CREATE INDEX idx_paiements_organization ON paiements(organization_id);

-- Enable RLS
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view paiements from their organization"
  ON paiements FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert paiements in their organization"
  ON paiements FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update paiements in their organization"
  ON paiements FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete paiements in their organization"
  ON paiements FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Add payment tracking columns to factures
ALTER TABLE factures 
  ADD COLUMN IF NOT EXISTS montant_paye DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solde_restant DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS statut_paiement TEXT DEFAULT 'non_paye' CHECK (statut_paiement IN ('non_paye', 'partiel', 'paye'));

-- Function to initialize solde_restant for existing factures
CREATE OR REPLACE FUNCTION initialize_factures_solde_restant()
RETURNS void AS $$
BEGIN
  UPDATE factures
  SET solde_restant = montant_total - COALESCE(montant_paye, 0)
  WHERE solde_restant IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Execute initialization
SELECT initialize_factures_solde_restant();

-- Function to process payment and update facture
CREATE OR REPLACE FUNCTION process_paiement()
RETURNS TRIGGER AS $$
DECLARE
  v_montant_total DECIMAL(15, 2);
  v_montant_paye_total DECIMAL(15, 2);
  v_solde_restant DECIMAL(15, 2);
  v_statut_paiement TEXT;
BEGIN
  -- Process facture payment only for now
  IF NEW.type_paiement = 'facture' AND NEW.facture_id IS NOT NULL THEN
    -- Get total amount
    SELECT montant_total INTO v_montant_total
    FROM factures
    WHERE id = NEW.facture_id;
    
    -- Calculate total amount paid (including this new payment)
    SELECT COALESCE(SUM(montant_paye), 0) INTO v_montant_paye_total
    FROM paiements
    WHERE facture_id = NEW.facture_id;
    
    v_solde_restant := v_montant_total - v_montant_paye_total;
    
    -- Determine payment status
    IF v_solde_restant <= 0 THEN
      v_statut_paiement := 'paye';
      v_solde_restant := 0;
    ELSIF v_montant_paye_total > 0 THEN
      v_statut_paiement := 'partiel';
    ELSE
      v_statut_paiement := 'non_paye';
    END IF;
    
    -- Update facture
    UPDATE factures
    SET 
      montant_paye = v_montant_paye_total,
      solde_restant = v_solde_restant,
      statut_paiement = v_statut_paiement,
      statut = CASE WHEN v_statut_paiement = 'paye' THEN 'payee' ELSE statut END
    WHERE id = NEW.facture_id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error processing payment: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to process payment after insert
CREATE TRIGGER trigger_process_paiement_after_insert
  AFTER INSERT ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION process_paiement();

-- Function to create revenue transaction from payment
CREATE OR REPLACE FUNCTION create_transaction_from_paiement()
RETURNS TRIGGER AS $$
DECLARE
  v_description TEXT;
BEGIN
  -- Build description based on payment type
  IF NEW.type_paiement = 'facture' THEN
    v_description := 'Paiement facture ' || COALESCE((
      SELECT numero_facture FROM factures WHERE id = NEW.facture_id LIMIT 1
    ), 'N/A');
  ELSE
    v_description := 'Paiement colis';
  END IF;
  
  IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
    v_description := v_description || ' - ' || NEW.notes;
  END IF;
  
  -- Create revenue transaction
  INSERT INTO transactions (
    type_transaction,
    montant,
    devise,
    compte_destination_id,
    client_id,
    motif,
    mode_paiement,
    date_paiement,
    statut,
    organization_id
  ) VALUES (
    'revenue',
    NEW.montant_paye,
    'USD',
    NEW.compte_id,
    NEW.client_id,
    v_description,
    NEW.mode_paiement,
    NEW.date_paiement,
    'en_attente',
    NEW.organization_id
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating transaction from payment: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create transaction after payment
CREATE TRIGGER trigger_create_transaction_from_paiement
  AFTER INSERT ON paiements
  FOR EACH ROW
  EXECUTE FUNCTION create_transaction_from_paiement();

COMMENT ON TABLE paiements IS 'Unified payment tracking for factures (and colis when table exists). Automatically creates revenue transactions and updates account balances.';
COMMENT ON COLUMN paiements.type_paiement IS 'Type of payment: facture or colis';
COMMENT ON COLUMN paiements.montant_paye IS 'Amount paid in this payment';
COMMENT ON COLUMN paiements.mode_paiement IS 'Payment method: cash, mobile_money, virement, cheque, etc.';
