-- Migration: Backfill mouvements for existing paiements
-- This creates mouvements_comptes for all existing paiements that don't have them yet

-- Create mouvements for existing paiements
DO $$
DECLARE
  v_paiement RECORD;
  v_solde_avant DECIMAL(15,2);
  v_solde_apres DECIMAL(15,2);
  v_description TEXT;
BEGIN
  -- Pour chaque paiement existant
  FOR v_paiement IN 
    SELECT * FROM paiements ORDER BY date_paiement ASC
  LOOP
    -- Vérifier si un mouvement existe déjà pour ce paiement
    IF NOT EXISTS (
      SELECT 1 FROM mouvements_comptes
      WHERE compte_id = v_paiement.compte_id
        AND montant = v_paiement.montant_paye
        AND date_mouvement = v_paiement.date_paiement
        AND type_mouvement = 'credit'
        AND description LIKE 'Encaissement%'
    ) THEN
      -- Récupérer le solde actuel du compte
      SELECT solde_actuel INTO v_solde_apres
      FROM comptes_financiers
      WHERE id = v_paiement.compte_id;

      -- Calculer le solde avant (approximation)
      v_solde_avant := v_solde_apres - v_paiement.montant_paye;

      -- Construire la description
      v_description := 'Encaissement - ';
      IF v_paiement.type_paiement = 'facture' THEN
        v_description := v_description || 'Paiement facture';
      ELSIF v_paiement.type_paiement = 'colis' THEN
        v_description := v_description || 'Paiement colis';
      END IF;

      -- Créer le mouvement
      INSERT INTO mouvements_comptes (
        compte_id,
        type_mouvement,
        montant,
        solde_avant,
        solde_apres,
        description,
        date_mouvement,
        organization_id,
        created_at
      ) VALUES (
        v_paiement.compte_id,
        'credit',
        v_paiement.montant_paye,
        v_solde_avant,
        v_solde_apres,
        v_description,
        v_paiement.date_paiement,
        v_paiement.organization_id,
        v_paiement.created_at
      );

      RAISE NOTICE 'Mouvement créé pour paiement % (montant: %)', v_paiement.id, v_paiement.montant_paye;
    END IF;
  END LOOP;
END $$;
