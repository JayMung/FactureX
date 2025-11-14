-- Migration: Fix all mouvements soldes by recalculating them chronologically
-- This ensures that solde_avant and solde_apres are correct for each mouvement

DO $$
DECLARE
  v_compte RECORD;
  v_mouvement RECORD;
  v_solde_courant DECIMAL(15,2);
  v_solde_initial DECIMAL(15,2);
BEGIN
  -- Pour chaque compte
  FOR v_compte IN 
    SELECT id, nom FROM comptes_financiers ORDER BY nom
  LOOP
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Traitement du compte: % (%)', v_compte.nom, v_compte.id;
    
    -- Initialiser le solde à 0 (tous les comptes commencent à 0)
    v_solde_courant := 0;
    v_solde_initial := 0;
    
    RAISE NOTICE 'Solde initial: %', v_solde_initial;
    
    -- Parcourir tous les mouvements de ce compte dans l'ordre chronologique
    FOR v_mouvement IN 
      SELECT * FROM mouvements_comptes
      WHERE compte_id = v_compte.id
      ORDER BY date_mouvement ASC, created_at ASC
    LOOP
      RAISE NOTICE '  Mouvement % du %: % %', 
        v_mouvement.id, v_mouvement.date_mouvement, v_mouvement.type_mouvement, v_mouvement.montant;
      RAISE NOTICE '    Avant correction: solde_avant=%, solde_apres=%', 
        v_mouvement.solde_avant, v_mouvement.solde_apres;
      
      -- Calculer le nouveau solde_avant (= solde courant avant ce mouvement)
      -- et le nouveau solde_apres
      IF v_mouvement.type_mouvement = 'credit' THEN
        -- Crédit: ajouter au solde
        UPDATE mouvements_comptes
        SET solde_avant = v_solde_courant,
            solde_apres = v_solde_courant + v_mouvement.montant
        WHERE id = v_mouvement.id;
        
        v_solde_courant := v_solde_courant + v_mouvement.montant;
      ELSIF v_mouvement.type_mouvement = 'debit' THEN
        -- Débit: retirer du solde
        UPDATE mouvements_comptes
        SET solde_avant = v_solde_courant,
            solde_apres = v_solde_courant - v_mouvement.montant
        WHERE id = v_mouvement.id;
        
        v_solde_courant := v_solde_courant - v_mouvement.montant;
      END IF;
      
      RAISE NOTICE '    Après correction: solde_avant=%, solde_apres=%', 
        v_solde_courant - (CASE WHEN v_mouvement.type_mouvement = 'credit' THEN v_mouvement.montant ELSE -v_mouvement.montant END),
        v_solde_courant;
    END LOOP;
    
    -- Mettre à jour le solde actuel du compte
    UPDATE comptes_financiers
    SET solde_actuel = v_solde_courant,
        updated_at = NOW()
    WHERE id = v_compte.id;
    
    RAISE NOTICE 'Solde final du compte: %', v_solde_courant;
    RAISE NOTICE '========================================';
  END LOOP;
END $$;
