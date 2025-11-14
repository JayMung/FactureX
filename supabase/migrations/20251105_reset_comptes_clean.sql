-- Migration: Clean reset of all comptes and mouvements
-- This removes all inconsistent data and starts fresh

-- 1. Supprimer tous les mouvements de comptes
DELETE FROM mouvements_comptes;

-- 2. Réinitialiser tous les soldes de comptes à 0
UPDATE comptes_financiers
SET solde_actuel = 0,
    updated_at = NOW();

-- 3. Supprimer toutes les transactions de type transfert
DELETE FROM transactions
WHERE type_transaction = 'transfert';

-- 4. Recalculer les soldes à partir des transactions restantes (revenue, depense)
DO $$
DECLARE
  v_transaction RECORD;
BEGIN
  -- Traiter toutes les transactions dans l'ordre chronologique
  FOR v_transaction IN 
    SELECT * FROM transactions
    ORDER BY date_paiement ASC, created_at ASC
  LOOP
    -- Pour les revenues: augmenter le solde du compte destination
    IF v_transaction.type_transaction = 'revenue' AND v_transaction.compte_destination_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel + v_transaction.montant
      WHERE id = v_transaction.compte_destination_id;
    END IF;

    -- Pour les dépenses: diminuer le solde du compte source
    IF v_transaction.type_transaction = 'depense' AND v_transaction.compte_source_id IS NOT NULL THEN
      UPDATE comptes_financiers
      SET solde_actuel = solde_actuel - v_transaction.montant
      WHERE id = v_transaction.compte_source_id;
    END IF;
  END LOOP;
END $$;

-- 5. Recalculer les soldes à partir des paiements
DO $$
DECLARE
  v_paiement RECORD;
BEGIN
  FOR v_paiement IN 
    SELECT * FROM paiements
    ORDER BY date_paiement ASC, created_at ASC
  LOOP
    -- Les paiements sont toujours des crédits
    UPDATE comptes_financiers
    SET solde_actuel = solde_actuel + v_paiement.montant_paye
    WHERE id = v_paiement.compte_id;
  END LOOP;
END $$;

-- 6. Recréer les mouvements à partir des transactions
DO $$
DECLARE
  v_transaction RECORD;
  v_compte RECORD;
  v_solde_avant DECIMAL(15,2);
  v_solde_apres DECIMAL(15,2);
BEGIN
  -- Pour chaque compte
  FOR v_compte IN SELECT id FROM comptes_financiers
  LOOP
    v_solde_avant := 0;
    
    -- Créer les mouvements pour les revenues
    FOR v_transaction IN 
      SELECT * FROM transactions
      WHERE type_transaction = 'revenue' 
        AND compte_destination_id = v_compte.id
      ORDER BY date_paiement ASC, created_at ASC
    LOOP
      v_solde_apres := v_solde_avant + v_transaction.montant;
      
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
        v_compte.id,
        'credit',
        v_transaction.montant,
        v_solde_avant,
        v_solde_apres,
        'Revenue - ' || v_transaction.motif,
        v_transaction.date_paiement,
        v_transaction.organization_id,
        v_transaction.created_at
      );
      
      v_solde_avant := v_solde_apres;
    END LOOP;
    
    -- Créer les mouvements pour les dépenses
    FOR v_transaction IN 
      SELECT * FROM transactions
      WHERE type_transaction = 'depense' 
        AND compte_source_id = v_compte.id
      ORDER BY date_paiement ASC, created_at ASC
    LOOP
      v_solde_apres := v_solde_avant - v_transaction.montant;
      
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
        v_compte.id,
        'debit',
        v_transaction.montant,
        v_solde_avant,
        v_solde_apres,
        'Dépense - ' || v_transaction.motif,
        v_transaction.date_paiement,
        v_transaction.organization_id,
        v_transaction.created_at
      );
      
      v_solde_avant := v_solde_apres;
    END LOOP;
  END LOOP;
END $$;

-- 7. Recréer les mouvements à partir des paiements
DO $$
DECLARE
  v_paiement RECORD;
  v_compte RECORD;
  v_solde_avant DECIMAL(15,2);
  v_solde_apres DECIMAL(15,2);
  v_description TEXT;
BEGIN
  FOR v_compte IN SELECT id FROM comptes_financiers
  LOOP
    -- Récupérer le solde actuel après les transactions
    SELECT COALESCE(MAX(solde_apres), 0) INTO v_solde_avant
    FROM mouvements_comptes
    WHERE compte_id = v_compte.id;
    
    -- Créer les mouvements pour les paiements
    FOR v_paiement IN 
      SELECT * FROM paiements
      WHERE compte_id = v_compte.id
      ORDER BY date_paiement ASC, created_at ASC
    LOOP
      v_solde_apres := v_solde_avant + v_paiement.montant_paye;
      
      v_description := 'Encaissement - ';
      IF v_paiement.type_paiement = 'facture' THEN
        v_description := v_description || 'Paiement facture';
      ELSIF v_paiement.type_paiement = 'colis' THEN
        v_description := v_description || 'Paiement colis';
      END IF;
      
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
        v_compte.id,
        'credit',
        v_paiement.montant_paye,
        v_solde_avant,
        v_solde_apres,
        v_description,
        v_paiement.date_paiement,
        v_paiement.organization_id,
        v_paiement.created_at
      );
      
      v_solde_avant := v_solde_apres;
    END LOOP;
  END LOOP;
END $$;

-- 8. Vérifier la cohérence finale
DO $$
DECLARE
  v_compte RECORD;
  v_solde_calcule DECIMAL(15,2);
  v_dernier_mouvement RECORD;
BEGIN
  FOR v_compte IN SELECT id, nom, solde_actuel FROM comptes_financiers
  LOOP
    -- Récupérer le dernier mouvement
    SELECT * INTO v_dernier_mouvement
    FROM mouvements_comptes
    WHERE compte_id = v_compte.id
    ORDER BY date_mouvement DESC, created_at DESC
    LIMIT 1;
    
    IF FOUND THEN
      v_solde_calcule := v_dernier_mouvement.solde_apres;
      
      -- Mettre à jour si différent
      IF v_compte.solde_actuel != v_solde_calcule THEN
        UPDATE comptes_financiers
        SET solde_actuel = v_solde_calcule
        WHERE id = v_compte.id;
        
        RAISE NOTICE 'Compte %: solde corrigé de % à %', 
          v_compte.nom, v_compte.solde_actuel, v_solde_calcule;
      END IF;
    END IF;
  END LOOP;
END $$;
