-- Migration: Recalculate all compte soldes from mouvements
-- This ensures that compte balances are correct based on actual mouvements

DO $$
DECLARE
  v_compte RECORD;
  v_solde_calcule DECIMAL(15,2);
  v_dernier_mouvement RECORD;
BEGIN
  -- Pour chaque compte
  FOR v_compte IN 
    SELECT id, nom, solde_actuel FROM comptes_financiers
  LOOP
    -- Récupérer le dernier mouvement pour ce compte
    SELECT * INTO v_dernier_mouvement
    FROM mouvements_comptes
    WHERE compte_id = v_compte.id
    ORDER BY date_mouvement DESC, created_at DESC
    LIMIT 1;

    IF FOUND THEN
      -- Le solde correct est le solde_apres du dernier mouvement
      v_solde_calcule := v_dernier_mouvement.solde_apres;
      
      -- Mettre à jour si différent
      IF v_compte.solde_actuel != v_solde_calcule THEN
        UPDATE comptes_financiers
        SET solde_actuel = v_solde_calcule,
            updated_at = NOW()
        WHERE id = v_compte.id;
        
        RAISE NOTICE 'Compte % (%) : solde corrigé de % à %', 
          v_compte.nom, v_compte.id, v_compte.solde_actuel, v_solde_calcule;
      ELSE
        RAISE NOTICE 'Compte % (%) : solde déjà correct (%)', 
          v_compte.nom, v_compte.id, v_compte.solde_actuel;
      END IF;
    ELSE
      RAISE NOTICE 'Compte % (%) : aucun mouvement trouvé', 
        v_compte.nom, v_compte.id;
    END IF;
  END LOOP;
END $$;
