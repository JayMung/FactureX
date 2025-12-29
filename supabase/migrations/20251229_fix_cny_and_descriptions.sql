-- Fix calculate_montant_cny to support CNY input
CREATE OR REPLACE FUNCTION calculate_montant_cny(
  p_montant numeric,
  p_frais numeric,
  p_devise text
)
RETURNS numeric AS $$
DECLARE
  montant_net numeric;
  montant_cny numeric;
BEGIN
  -- Validation des entrées
  IF p_montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être positif';
  END IF;
  
  -- Frais peut etre 0 ou NULL, on assume 0 si NULL mais ici p_frais < 0 check
  IF COALESCE(p_frais, 0) < 0 THEN
    RAISE EXCEPTION 'Les frais ne peuvent être négatifs';
  END IF;

  -- Updated validation to include CNY
  IF p_devise NOT IN ('USD', 'CDF', 'CNY') THEN
    RAISE EXCEPTION 'Devise non supportée: %', p_devise;
  END IF;

  -- Calculer le montant net (après frais)
  montant_net := p_montant - COALESCE(p_frais, 0);
  
  -- Convertir vers CNY
  IF p_devise = 'CNY' THEN
    montant_cny := montant_net;
  ELSE
    montant_cny := convert_currency_secure(montant_net, p_devise, 'CNY');
  END IF;
  
  RETURN montant_cny;
END;
$$ LANGUAGE plpgsql;

-- Fix convert_currency_secure to support CNY source
CREATE OR REPLACE FUNCTION convert_currency_secure(
  p_montant numeric,
  p_devise_source text,
  p_devise_cible text
)
RETURNS numeric AS $$
DECLARE
  taux_usd_cny numeric := 7.25;
  taux_usd_cdf numeric := 2850;
  montant_usd numeric;
  montant_final numeric;
BEGIN
  -- Validation des entrées
  IF p_montant IS NULL THEN
     RETURN 0;
  END IF;
  
  IF p_montant <= 0 THEN
    RETURN 0; 
  END IF;
  
  IF p_devise_source NOT IN ('USD', 'CDF', 'CNY') OR p_devise_cible NOT IN ('USD', 'CDF', 'CNY') THEN
    RAISE EXCEPTION 'Devise non supportée: Source=%, Cible=%', p_devise_source, p_devise_cible;
  END IF;
  
  IF p_devise_source = p_devise_cible THEN
    RETURN p_montant;
  END IF;

  -- Récupérer les taux depuis settings
  SELECT valeur::numeric INTO taux_usd_cny
  FROM settings
  WHERE cle = 'usdToCny' AND categorie = 'taux_change';
  
  SELECT valeur::numeric INTO taux_usd_cdf
  FROM settings
  WHERE cle = 'usdToCdf' AND categorie = 'taux_change';
  
  -- Valeurs par défaut si pas trouvées
  IF taux_usd_cny IS NULL THEN taux_usd_cny := 7.25; END IF;
  IF taux_usd_cdf IS NULL THEN taux_usd_cdf := 2850; END IF;

  -- Convertir vers USD d'abord
  IF p_devise_source = 'USD' THEN
    montant_usd := p_montant;
  ELSIF p_devise_source = 'CDF' THEN
    montant_usd := p_montant / taux_usd_cdf;
  ELSIF p_devise_source = 'CNY' THEN
    montant_usd := p_montant / taux_usd_cny;
  END IF;

  -- Puis convertir vers la devise cible
  IF p_devise_cible = 'USD' THEN
    montant_final := montant_usd;
  ELSIF p_devise_cible = 'CDF' THEN
    montant_final := montant_usd * taux_usd_cdf;
  ELSIF p_devise_cible = 'CNY' THEN
    montant_final := montant_usd * taux_usd_cny;
  END IF;

  RETURN montant_final;
END;
$$ LANGUAGE plpgsql;

-- Enhance create_mouvement_from_transaction trigger description logic
CREATE OR REPLACE FUNCTION create_mouvement_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_solde_avant_source DECIMAL(15, 2);
  v_solde_apres_source DECIMAL(15, 2);
  v_solde_avant_dest DECIMAL(15, 2);
  v_solde_apres_dest DECIMAL(15, 2);
  v_description TEXT;
  v_organization_id UUID;
BEGIN
  -- Get organization_id from transaction
  v_organization_id := NEW.organization_id;

  -- 1. REVENUS: Mouvement CREDIT sur le compte destination
  IF NEW.type_transaction = 'revenue' AND NEW.compte_destination_id IS NOT NULL THEN
    -- Get current solde
    SELECT solde_actuel INTO v_solde_apres_dest
    FROM comptes_financiers
    WHERE id = NEW.compte_destination_id;
    
    -- Calculate solde before
    v_solde_avant_dest := v_solde_apres_dest - NEW.montant;
    
    -- Build description: "Revenue - Client - Motif(Notes)"
    v_description := 'Revenue';
    IF NEW.client_id IS NOT NULL THEN
      v_description := v_description || ' - ' || COALESCE((SELECT nom FROM clients WHERE id = NEW.client_id LIMIT 1), 'Client inconnu');
    END IF;
    IF NEW.motif IS NOT NULL AND NEW.motif != '' THEN
      v_description := v_description || ' - ' || NEW.motif;
    END IF;
    -- Add notes if available to clarify
    IF NEW.notes IS NOT NULL AND LENGTH(TRIM(NEW.notes)) > 0 THEN
       v_description := v_description || ' (' || NEW.notes || ')';
    END IF;
    
    INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
    VALUES (NEW.compte_destination_id, NEW.id, 'credit', NEW.montant, v_solde_avant_dest, v_solde_apres_dest, v_description, NEW.date_paiement, v_organization_id);
  END IF;

  -- 2. DÉPENSES: Mouvement DEBIT sur le compte source
  IF NEW.type_transaction = 'depense' AND NEW.compte_source_id IS NOT NULL THEN
    -- Get current solde
    SELECT solde_actuel INTO v_solde_apres_source
    FROM comptes_financiers
    WHERE id = NEW.compte_source_id;
    
    -- Calculate solde before (current + montant because debit reduced it)
    v_solde_avant_source := v_solde_apres_source + NEW.montant;
    
    -- Build description: "Dépense - Categorie (Notes/Motif)"
    v_description := 'Dépense';
    IF NEW.categorie IS NOT NULL AND NEW.categorie != '' THEN
      v_description := v_description || ' - ' || NEW.categorie;
    END IF;
    
    -- Add Notes OR Motif (if different from category) in parentheses
    IF NEW.notes IS NOT NULL AND LENGTH(TRIM(NEW.notes)) > 0 THEN
      v_description := v_description || ' (' || NEW.notes || ')';
    ELSIF NEW.motif IS NOT NULL AND NEW.motif != '' AND NEW.motif != NEW.categorie THEN
      v_description := v_description || ' (' || NEW.motif || ')';
    END IF;
    
    INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
    VALUES (NEW.compte_source_id, NEW.id, 'debit', NEW.montant, v_solde_avant_source, v_solde_apres_source, v_description, NEW.date_paiement, v_organization_id);
  END IF;

  -- 3. TRANSFERTS (SWAP): Débit Source + Crédit Destination
  IF NEW.type_transaction = 'transfert' THEN
    -- Mouvement DEBIT sur compte source
    IF NEW.compte_source_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres_source
      FROM comptes_financiers
      WHERE id = NEW.compte_source_id;
      
      v_solde_avant_source := v_solde_apres_source + NEW.montant;
      
      v_description := 'Transfert vers ' || COALESCE((SELECT nom FROM comptes_financiers WHERE id = NEW.compte_destination_id LIMIT 1), 'Compte inconnu');
       -- Add Notes for context if available
      IF NEW.notes IS NOT NULL AND LENGTH(TRIM(NEW.notes)) > 0 THEN
         v_description := v_description || ' (' || NEW.notes || ')';
      END IF;
      
      INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
      VALUES (NEW.compte_source_id, NEW.id, 'debit', NEW.montant, v_solde_avant_source, v_solde_apres_source, v_description, NEW.date_paiement, v_organization_id);
    END IF;

    -- Mouvement CREDIT sur compte destination
    IF NEW.compte_destination_id IS NOT NULL THEN
      SELECT solde_actuel INTO v_solde_apres_dest
      FROM comptes_financiers
      WHERE id = NEW.compte_destination_id;
      
      v_solde_avant_dest := v_solde_apres_dest - NEW.montant;
      
      v_description := 'Transfert depuis ' || COALESCE((SELECT nom FROM comptes_financiers WHERE id = NEW.compte_source_id LIMIT 1), 'Compte inconnu');
      -- Add Notes for context if available
      IF NEW.notes IS NOT NULL AND LENGTH(TRIM(NEW.notes)) > 0 THEN
         v_description := v_description || ' (' || NEW.notes || ')';
      END IF;
      
      INSERT INTO mouvements_comptes (compte_id, transaction_id, type_mouvement, montant, solde_avant, solde_apres, description, date_mouvement, organization_id)
      VALUES (NEW.compte_destination_id, NEW.id, 'credit', NEW.montant, v_solde_avant_dest, v_solde_apres_dest, v_description, NEW.date_paiement, v_organization_id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating mouvement: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Data Migration: Backfill existing descriptions
UPDATE mouvements_comptes m
SET description = CASE
  WHEN t.type_transaction = 'revenue' THEN
     'Revenue' 
     || CASE WHEN t.client_id IS NOT NULL THEN ' - ' || COALESCE(c.nom, 'Client inconnu') ELSE '' END
     || CASE WHEN t.motif IS NOT NULL AND t.motif != '' THEN ' - ' || t.motif ELSE '' END
     || CASE WHEN t.notes IS NOT NULL AND LENGTH(TRIM(t.notes)) > 0 THEN ' (' || t.notes || ')' ELSE '' END
  WHEN t.type_transaction = 'depense' THEN
     'Dépense'
     || CASE WHEN t.categorie IS NOT NULL AND t.categorie != '' THEN ' - ' || t.categorie ELSE '' END
     || CASE
        WHEN t.notes IS NOT NULL AND LENGTH(TRIM(t.notes)) > 0 THEN ' (' || t.notes || ')'
        WHEN t.motif IS NOT NULL AND t.motif != '' AND t.motif != t.categorie THEN ' (' || t.motif || ')'
        ELSE ''
     END
  WHEN t.type_transaction = 'transfert' THEN
     -- Determine if this is source or dest movement based on type_mouvement
     CASE
        WHEN m.type_mouvement = 'debit' THEN -- Source
           'Transfert vers ' || COALESCE(dest.nom, 'Compte inconnu') ||
           CASE WHEN t.notes IS NOT NULL AND LENGTH(TRIM(t.notes)) > 0 THEN ' (' || t.notes || ')' ELSE '' END
        WHEN m.type_mouvement = 'credit' THEN -- Dest
           'Transfert depuis ' || COALESCE(src.nom, 'Compte inconnu') ||
           CASE WHEN t.notes IS NOT NULL AND LENGTH(TRIM(t.notes)) > 0 THEN ' (' || t.notes || ')' ELSE '' END
        ELSE m.description -- Keep original if unknown type
     END
  ELSE m.description -- Keep original if unknown transaction type
END
FROM transactions t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN comptes_financiers src ON t.compte_source_id = src.id
LEFT JOIN comptes_financiers dest ON t.compte_destination_id = dest.id
WHERE m.transaction_id = t.id
  AND t.id IS NOT NULL;
