-- Migration: Ajouter facture_id aux transactions et auto-update statut facture
-- Date: 2025-11-26
-- Description: Permet de lier une transaction à une facture et met à jour automatiquement le statut de la facture

-- Ajouter la colonne facture_id à la table transactions si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'facture_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN facture_id UUID REFERENCES factures(id) ON DELETE SET NULL;
    CREATE INDEX idx_transactions_facture_id ON transactions(facture_id);
  END IF;
END $$;

-- Fonction pour mettre à jour le statut de la facture après paiement
CREATE OR REPLACE FUNCTION update_facture_status_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_facture_total NUMERIC;
  v_total_paye NUMERIC;
  v_new_status TEXT;
BEGIN
  -- Seulement pour les transactions de type revenue avec une facture liée
  IF NEW.facture_id IS NOT NULL AND NEW.type_transaction = 'revenue' THEN
    -- Récupérer le total de la facture
    SELECT total_general INTO v_facture_total
    FROM factures
    WHERE id = NEW.facture_id;
    
    -- Calculer le total payé pour cette facture (toutes les transactions liées)
    SELECT COALESCE(SUM(montant), 0) INTO v_total_paye
    FROM transactions
    WHERE facture_id = NEW.facture_id
      AND type_transaction = 'revenue'
      AND statut != 'Annulé';
    
    -- Ajouter aussi les paiements de la table paiements
    SELECT v_total_paye + COALESCE(SUM(montant_paye), 0) INTO v_total_paye
    FROM paiements
    WHERE facture_id = NEW.facture_id;
    
    -- Déterminer le nouveau statut
    IF v_total_paye >= v_facture_total THEN
      v_new_status := 'payee';
    ELSIF v_total_paye > 0 THEN
      v_new_status := 'validee'; -- Partiellement payée, on garde validee
    ELSE
      v_new_status := 'en_attente';
    END IF;
    
    -- Mettre à jour le statut de la facture
    UPDATE factures
    SET statut = v_new_status,
        updated_at = NOW()
    WHERE id = NEW.facture_id
      AND statut != 'annulee'; -- Ne pas modifier les factures annulées
    
    RAISE NOTICE 'Facture % mise à jour: total=%, payé=%, nouveau statut=%', 
      NEW.facture_id, v_facture_total, v_total_paye, v_new_status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_facture_status ON transactions;

-- Créer le trigger
CREATE TRIGGER trigger_update_facture_status
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_facture_status_on_transaction();

-- Commentaire
COMMENT ON FUNCTION update_facture_status_on_transaction() IS 
  'Met à jour automatiquement le statut de la facture (payee/validee) quand une transaction de paiement est créée';
