-- Migration pour recalculer les bénéfices de toutes les transactions
-- en tenant compte de la commission partenaire (3%)

-- Récupérer le pourcentage de commission partenaire depuis les settings
DO $$
DECLARE
  commission_partenaire NUMERIC;
BEGIN
  -- Obtenir le taux de commission partenaire
  SELECT CAST(valeur AS NUMERIC) INTO commission_partenaire
  FROM settings
  WHERE categorie = 'frais' AND cle = 'partenaire'
  LIMIT 1;
  
  -- Si pas trouvé, utiliser 3% par défaut
  IF commission_partenaire IS NULL THEN
    commission_partenaire := 3;
  END IF;
  
  -- Recalculer le bénéfice pour toutes les transactions
  -- Formule: benefice = frais - (montant * commission_partenaire / 100)
  UPDATE transactions
  SET benefice = frais - (montant * commission_partenaire / 100),
      updated_at = NOW()
  WHERE frais > 0;
  
  -- Afficher le nombre de transactions mises à jour
  RAISE NOTICE 'Bénéfices recalculés pour % transactions avec commission partenaire de %', 
    (SELECT COUNT(*) FROM transactions WHERE frais > 0), 
    commission_partenaire;
END $$;
