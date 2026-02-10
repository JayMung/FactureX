-- Migration: Fix Fee Logic for Internal Transfers
-- The user specified that the 5% fee should ONLY apply to "Transfert Reçu" (Revenue), NOT internal transfers (Swap).
-- Currently, internal transfers are auto-calculating 5% because they match the key 'transfert'.
-- We update the calculation function to skipp fees for 'transfert' type (Internal), defaulting to 0.
-- Note: Manual fees are already preserved by the previous trigger fix.

CREATE OR REPLACE FUNCTION calculate_transaction_frais(
  p_montant numeric, 
  p_motif text, 
  p_type_transaction text
)
RETURNS numeric AS $$
DECLARE
  frais_rate numeric;
  frais_amount numeric;
  v_cle text;
BEGIN
  -- Validation des entrées
  IF p_montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être positif';
  END IF;
  
  -- TYPE CHECK
  -- 1. Depense: 0 frais
  IF p_type_transaction = 'depense' THEN
    RETURN 0;
  END IF;

  -- 2. Transfert (Internal Swap): 0 auto-calculated fees.
  -- Users can still manually add fees (handled by trigger COALESCE logic).
  IF p_type_transaction = 'transfert' THEN
    RETURN 0;
  END IF;

  -- 3. Revenue: Apply Settings Logic
  -- Normalisation de la clé
  v_cle := LOWER(p_motif);
  
  -- Mapping explicite pour les variantes connues
  IF v_cle LIKE '%transfert%' THEN
    v_cle := 'transfert'; -- This picks up the 5% rate for 'Transfert Reçu'
  ELSIF v_cle LIKE '%commande%' OR v_cle LIKE '%facture%' THEN
    v_cle := 'commande';
  ELSIF v_cle LIKE '%colis%' THEN
    v_cle := 'paiement colis';
  END IF;

  -- Récupérer les taux de frais depuis settings
  SELECT valeur::numeric INTO frais_rate
  FROM settings
  WHERE cle = v_cle AND categorie = 'frais';
  
  -- Si toujours pas trouvé, essayer avec la clé brute
  IF frais_rate IS NULL THEN
    SELECT valeur::numeric INTO frais_rate
    FROM settings
    WHERE cle = LOWER(p_motif) AND categorie = 'frais';
  END IF;

  -- Si pas de taux trouvé, utiliser 0 par défaut
  IF frais_rate IS NULL THEN
    frais_rate := 0;
  END IF;

  -- Calculer les frais
  frais_amount := p_montant * (frais_rate / 100);
  
  RETURN frais_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
