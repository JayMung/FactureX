-- Migration: Fix Transaction Fee Overwrite Bug
-- The previous trigger logic blindly overwrote 'frais' even if the user provided a specific value.
-- This change ensures we respect the user-provided 'frais' if it's not NULL, and only auto-calculate if it's missing (NULL).

CREATE OR REPLACE FUNCTION validate_transaction_before_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Valider les données avant insertion
  IF NOT validate_transaction_data(
    NEW.montant,
    NEW.devise,
    NEW.type_transaction,
    NEW.motif
  ) THEN
    RAISE EXCEPTION 'Données de transaction invalides';
  END IF;

  -- Calculer les frais UNIQUEMENT si non fourni (NULL)
  -- Si l'utilisateur envoie explicitement 0 ou une valeur, on garde sa valeur.
  -- Pour les transferts, le front envoie la valeur. Pour les revenus, le front ne l'envoie pas (donc NULL car pas de default).
  NEW.frais := COALESCE(NEW.frais, calculate_transaction_frais(NEW.montant, NEW.motif, NEW.type_transaction));
  
  -- Recalculer le bénéfice en fonction des frais finaux (qu'ils soient manuels ou auto)
  NEW.benefice := calculate_transaction_benefice(NEW.montant, NEW.frais, NEW.motif);
  
  -- Recalculer le montant CNY en fonction des frais finaux
  NEW.montant_cny := calculate_montant_cny(NEW.montant, NEW.frais, NEW.devise);

  -- Récupérer les taux actuels
  NEW.taux_usd_cny := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCny' AND categorie = 'taux_change');
  NEW.taux_usd_cdf := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCdf' AND categorie = 'taux_change');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
