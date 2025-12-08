-- Migration: Create mouvements_comptes table and triggers
-- This table tracks all debits and credits for each compte financier

-- Create mouvements_comptes table
CREATE TABLE IF NOT EXISTS mouvements_comptes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compte_id UUID NOT NULL REFERENCES comptes_financiers(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  type_mouvement TEXT NOT NULL CHECK (type_mouvement IN ('debit', 'credit')),
  montant DECIMAL(15, 2) NOT NULL CHECK (montant >= 0),
  solde_avant DECIMAL(15, 2) NOT NULL,
  solde_apres DECIMAL(15, 2) NOT NULL,
  description TEXT,
  date_mouvement TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  organization_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_mouvements_comptes_compte_id ON mouvements_comptes(compte_id);
CREATE INDEX idx_mouvements_comptes_transaction_id ON mouvements_comptes(transaction_id);
CREATE INDEX idx_mouvements_comptes_date ON mouvements_comptes(date_mouvement DESC);
CREATE INDEX idx_mouvements_comptes_organization ON mouvements_comptes(organization_id);

-- Enable RLS
ALTER TABLE mouvements_comptes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view mouvements from their organization"
  ON mouvements_comptes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert mouvements in their organization"
  ON mouvements_comptes FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Function to create mouvement when compte solde is updated
CREATE OR REPLACE FUNCTION create_mouvement_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_solde_avant DECIMAL(15, 2);
  v_solde_apres DECIMAL(15, 2);
  v_description TEXT;
  v_organization_id UUID;
BEGIN
  -- Get organization_id from transaction
  v_organization_id := NEW.organization_id;

  -- Pour les revenus: créer un mouvement CREDIT sur le compte destination
  IF NEW.type_transaction = 'revenue' AND NEW.compte_destination_id IS NOT NULL THEN
    -- Get solde before (already updated by previous trigger)
    SELECT solde_actuel INTO v_solde_apres
    FROM comptes_financiers
    WHERE id = NEW.compte_destination_id;
    
    v_solde_avant := v_solde_apres - NEW.montant;
    
    -- Build description
    v_description := 'Revenue';
    IF NEW.client_id IS NOT NULL THEN
      v_description := v_description || ' - ' || (
        SELECT nom FROM clients WHERE id = NEW.client_id LIMIT 1
      );
    END IF;
    IF NEW.motif IS NOT NULL AND NEW.motif != '' THEN
      v_description := v_description || ' - ' || NEW.motif;
    END IF;
    
    -- Create mouvement
    INSERT INTO mouvements_comptes (
      compte_id,
      transaction_id,
      type_mouvement,
      montant,
      solde_avant,
      solde_apres,
      description,
      date_mouvement,
      organization_id
    ) VALUES (
      NEW.compte_destination_id,
      NEW.id,
      'credit',
      NEW.montant,
      v_solde_avant,
      v_solde_apres,
      v_description,
      NEW.date_paiement,
      v_organization_id
    );
  END IF;

  -- Pour les dépenses: créer un mouvement DEBIT sur le compte source
  IF NEW.type_transaction = 'depense' AND NEW.compte_source_id IS NOT NULL THEN
    -- Get solde after (already updated by previous trigger)
    SELECT solde_actuel INTO v_solde_apres
    FROM comptes_financiers
    WHERE id = NEW.compte_source_id;
    
    v_solde_avant := v_solde_apres + NEW.montant;
    
    -- Build description
    v_description := 'Dépense';
    IF NEW.motif IS NOT NULL AND NEW.motif != '' THEN
      v_description := v_description || ' - ' || NEW.motif;
    END IF;
    IF NEW.categorie IS NOT NULL AND NEW.categorie != '' THEN
      v_description := v_description || ' (' || NEW.categorie || ')';
    END IF;
    
    -- Create mouvement
    INSERT INTO mouvements_comptes (
      compte_id,
      transaction_id,
      type_mouvement,
      montant,
      solde_avant,
      solde_apres,
      description,
      date_mouvement,
      organization_id
    ) VALUES (
      NEW.compte_source_id,
      NEW.id,
      'debit',
      NEW.montant,
      v_solde_avant,
      v_solde_apres,
      v_description,
      NEW.date_paiement,
      v_organization_id
    );
  END IF;

  -- Pour les transferts: créer DEUX mouvements (débit source + crédit destination)
  IF NEW.type_transaction = 'transfert' THEN
    -- Mouvement DEBIT sur compte source
    IF NEW.compte_source_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = NEW.compte_source_id;
      
      v_solde_avant := v_solde_apres + NEW.montant;
      
      v_description := 'Transfert vers ' || (
        SELECT nom FROM comptes_financiers WHERE id = NEW.compte_destination_id LIMIT 1
      );
      
      INSERT INTO mouvements_comptes (
        compte_id,
        transaction_id,
        type_mouvement,
        montant,
        solde_avant,
        solde_apres,
        description,
        date_mouvement,
        organization_id
      ) VALUES (
        NEW.compte_source_id,
        NEW.id,
        'debit',
        NEW.montant,
        v_solde_avant,
        v_solde_apres,
        v_description,
        NEW.date_paiement,
        v_organization_id
      );
    END IF;

    -- Mouvement CREDIT sur compte destination
    IF NEW.compte_destination_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = NEW.compte_destination_id;
      
      v_solde_avant := v_solde_apres - NEW.montant;
      
      v_description := 'Transfert depuis ' || (
        SELECT nom FROM comptes_financiers WHERE id = NEW.compte_source_id LIMIT 1
      );
      
      INSERT INTO mouvements_comptes (
        compte_id,
        transaction_id,
        type_mouvement,
        montant,
        solde_avant,
        solde_apres,
        description,
        date_mouvement,
        organization_id
      ) VALUES (
        NEW.compte_destination_id,
        NEW.id,
        'credit',
        NEW.montant,
        v_solde_avant,
        v_solde_apres,
        v_description,
        NEW.date_paiement,
        v_organization_id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete mouvements when transaction is deleted
CREATE OR REPLACE FUNCTION delete_mouvements_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM mouvements_comptes
  WHERE transaction_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_create_mouvement_after_transaction_insert ON transactions;
DROP TRIGGER IF EXISTS trigger_create_mouvement_after_transaction_update ON transactions;
DROP TRIGGER IF EXISTS trigger_delete_mouvements_before_transaction_delete ON transactions;

-- Create trigger for INSERT (after compte solde is updated)
CREATE TRIGGER trigger_create_mouvement_after_transaction_insert
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION create_mouvement_from_transaction();

-- Create trigger for UPDATE (after compte solde is updated)
CREATE TRIGGER trigger_create_mouvement_after_transaction_update
  AFTER UPDATE ON transactions
  FOR EACH ROW
  WHEN (
    OLD.montant IS DISTINCT FROM NEW.montant OR
    OLD.type_transaction IS DISTINCT FROM NEW.type_transaction OR
    OLD.compte_source_id IS DISTINCT FROM NEW.compte_source_id OR
    OLD.compte_destination_id IS DISTINCT FROM NEW.compte_destination_id
  )
  EXECUTE FUNCTION create_mouvement_from_transaction();

-- Create trigger for DELETE (before transaction is deleted)
CREATE TRIGGER trigger_delete_mouvements_before_transaction_delete
  BEFORE DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION delete_mouvements_from_transaction();

-- Add helpful comments
COMMENT ON TABLE mouvements_comptes IS 'Tracks all debits and credits for each compte financier';
COMMENT ON COLUMN mouvements_comptes.type_mouvement IS 'Type of movement: debit or credit';
COMMENT ON COLUMN mouvements_comptes.solde_avant IS 'Account balance before this movement';
COMMENT ON COLUMN mouvements_comptes.solde_apres IS 'Account balance after this movement';
COMMENT ON FUNCTION create_mouvement_from_transaction() IS 'Automatically creates movement records when transactions are created or updated';
COMMENT ON FUNCTION delete_mouvements_from_transaction() IS 'Automatically deletes movement records when transactions are deleted';
