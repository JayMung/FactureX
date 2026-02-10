-- Migration: Disable Benefice/CNY Auto-Calc for Transfers
-- The user requested "Aucun benefice ou cny" for transfers.
-- We update the logic to explicitly skip gain/loss calculation for internal transfers.
-- And we ensure manual 'montant_cny' (from frontend swap) is respecting.

-- 1. Update Function Signature: calculate_transaction_benefice
-- We add p_type_transaction to filter out 'transfert'
DROP FUNCTION IF EXISTS calculate_transaction_benefice(numeric, numeric, text);

CREATE OR REPLACE FUNCTION calculate_transaction_benefice(
  p_montant numeric, 
  p_frais numeric, 
  p_motif text,
  p_type_transaction text -- Added parameter
)
RETURNS numeric AS $$
DECLARE
  commission_partenaire numeric := 0;
  benefice_amount numeric;
BEGIN
  -- 1. Transfers: No Benefice
  IF p_type_transaction = 'transfert' THEN
    RETURN 0;
  END IF;

  -- Validation
  IF p_montant <= 0 THEN RAISE EXCEPTION 'Le montant doit être positif'; END IF;
  IF p_frais < 0 THEN RAISE EXCEPTION 'Les frais ne peuvent être négatifs'; END IF;

  -- 2. Revenue - Calculate Commission
  SELECT valeur::numeric INTO commission_partenaire
  FROM settings
  WHERE cle = 'partenaire' AND categorie = 'frais';
  
  IF commission_partenaire IS NULL THEN
    commission_partenaire := 3;
  END IF;

  benefice_amount := p_frais - (p_montant * (commission_partenaire / 100));
  
  RETURN benefice_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update Trigger Function: validate_transaction_before_insert
-- Modify calls to match new signatures and use COALESCE for montant_cny
CREATE OR REPLACE FUNCTION validate_transaction_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT validate_transaction_data(NEW.montant, NEW.devise, NEW.type_transaction, NEW.motif) THEN
    RAISE EXCEPTION 'Données de transaction invalides';
  END IF;

  -- Frais: Manual override allowed (previous fix maintained)
  NEW.frais := COALESCE(NEW.frais, calculate_transaction_frais(NEW.montant, NEW.motif, NEW.type_transaction));
  
  -- Benefice: Updated call with type_transaction
  NEW.benefice := calculate_transaction_benefice(NEW.montant, NEW.frais, NEW.motif, NEW.type_transaction);
  
  -- Montant CNY: Respect manual override (Swap), else auto-calc
  NEW.montant_cny := COALESCE(NEW.montant_cny, calculate_montant_cny(NEW.montant, NEW.frais, NEW.devise));

  -- Taux: Always fresh
  NEW.taux_usd_cny := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCny' AND categorie = 'taux_change');
  NEW.taux_usd_cdf := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCdf' AND categorie = 'taux_change');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
