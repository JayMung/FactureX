-- =====================================================
-- SÉCURITÉ CRITIQUE - FONCTIONS FINANCIÈRES SERVEUR
-- =====================================================
-- Migration pour déplacer les calculs financiers côté serveur
-- Auteur: Security Audit - Phase 1.3
-- Date: 2025-01-11

-- 1. FONCTION DE CALCUL DES FRAIS SÉCURISÉE
CREATE OR REPLACE FUNCTION calculate_transaction_frais(
  p_montant numeric,
  p_motif text,
  p_type_transaction text
)
RETURNS numeric AS $$
DECLARE
  frais_rate numeric;
  frais_amount numeric;
BEGIN
  -- Validation des entrées
  IF p_montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être positif';
  END IF;
  
  IF p_type_transaction NOT IN ('revenue', 'depense', 'transfert') THEN
    RAISE EXCEPTION 'Type de transaction invalide';
  END IF;

  -- Pour les dépenses, pas de frais
  IF p_type_transaction = 'depense' THEN
    RETURN 0;
  END IF;

  -- Récupérer les taux de frais depuis settings
  SELECT valeur::numeric INTO frais_rate
  FROM settings
  WHERE cle = LOWER(p_motif) AND categorie = 'frais';
  
  -- Si pas de taux trouvé, utiliser 0 par défaut
  IF frais_rate IS NULL THEN
    frais_rate := 0;
  END IF;

  -- Calculer les frais
  frais_amount := p_montant * (frais_rate / 100);
  
  RETURN frais_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FONCTION DE CALCUL DU BÉNÉFICE SÉCURISÉE
CREATE OR REPLACE FUNCTION calculate_transaction_benefice(
  p_montant numeric,
  p_frais numeric,
  p_motif text
)
RETURNS numeric AS $$
DECLARE
  commission_partenaire numeric := 0;
  benefice_amount numeric;
BEGIN
  -- Validation des entrées
  IF p_montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être positif';
  END IF;
  
  IF p_frais < 0 THEN
    RAISE EXCEPTION 'Les frais ne peuvent être négatifs';
  END IF;

  -- Récupérer la commission partenaire depuis settings
  SELECT valeur::numeric INTO commission_partenaire
  FROM settings
  WHERE cle = 'partenaire' AND categorie = 'frais';
  
  -- Si pas de commission trouvée, utiliser 3% par défaut
  IF commission_partenaire IS NULL THEN
    commission_partenaire := 3;
  END IF;

  -- Calculer le bénéfice: frais - commission partenaire
  benefice_amount := p_frais - (p_montant * (commission_partenaire / 100));
  
  RETURN benefice_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FONCTION DE CONVERSION DE DEVISE SÉCURISÉE
CREATE OR REPLACE FUNCTION convert_currency_secure(
  p_montant numeric,
  p_devise_source text,
  p_devise_cible text,
  p_date_conversion timestamp DEFAULT now()
)
RETURNS numeric AS $$
DECLARE
  taux_usd_cny numeric := 7.25;
  taux_usd_cdf numeric := 2850;
  montant_usd numeric;
  montant_final numeric;
BEGIN
  -- Validation des entrées
  IF p_montant <= 0 THEN
    RAISE EXCEPTION 'Le montant doit être positif';
  END IF;
  
  IF p_devise_source NOT IN ('USD', 'CDF') OR p_devise_cible NOT IN ('USD', 'CDF', 'CNY') THEN
    RAISE EXCEPTION 'Devise non supportée';
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FONCTION DE CALCUL MONTANT CNY SÉCURISÉE
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
  
  IF p_frais < 0 THEN
    RAISE EXCEPTION 'Les frais ne peuvent être négatifs';
  END IF;

  IF p_devise NOT IN ('USD', 'CDF') THEN
    RAISE EXCEPTION 'Devise non supportée';
  END IF;

  -- Calculer le montant net (après frais)
  montant_net := p_montant - p_frais;
  
  -- Convertir vers CNY
  montant_cny := convert_currency_secure(montant_net, p_devise, 'CNY');
  
  RETURN montant_cny;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FONCTION DE CRÉATION DE TRANSACTION SÉCURISÉE
CREATE OR REPLACE FUNCTION create_transaction_secure(
  p_client_id uuid,
  p_montant numeric,
  p_devise text,
  p_motif text,
  p_mode_paiement text DEFAULT NULL,
  p_compte_source_id uuid DEFAULT NULL,
  p_compte_destination_id uuid DEFAULT NULL,
  p_type_transaction text DEFAULT 'revenue',
  p_notes text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_organization_id uuid;
  v_frais numeric;
  v_benefice numeric;
  v_montant_cny numeric;
  v_transaction_id uuid;
  v_user_role text;
BEGIN
  -- Récupérer l'organization_id de l'utilisateur
  SELECT organization_id INTO v_organization_id
  FROM profiles
  WHERE id = auth.uid();
  
  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non autorisé';
  END IF;

  -- Vérifier les permissions
  SELECT (auth.jwt() ->> 'role') INTO v_user_role;
  
  IF v_user_role NOT IN ('super_admin', 'admin') AND p_type_transaction IN ('revenue', 'depense') THEN
    RAISE EXCEPTION 'Permissions insuffisantes pour ce type de transaction';
  END IF;

  -- Calculer les valeurs financières de manière sécurisée
  v_frais := calculate_transaction_frais(p_montant, p_motif, p_type_transaction);
  v_benefice := calculate_transaction_benefice(p_montant, v_frais, p_motif);
  v_montant_cny := calculate_montant_cny(p_montant, v_frais, p_devise);

  -- Insérer la transaction avec les valeurs calculées
  INSERT INTO transactions (
    client_id,
    montant,
    devise,
    motif,
    frais,
    benefice,
    montant_cny,
    mode_paiement,
    compte_source_id,
    compte_destination_id,
    type_transaction,
    notes,
    organization_id,
    created_by,
    taux_usd_cny,
    taux_usd_cdf
  ) VALUES (
    p_client_id,
    p_montant,
    p_devise,
    p_motif,
    v_frais,
    v_benefice,
    v_montant_cny,
    p_mode_paiement,
    p_compte_source_id,
    p_compte_destination_id,
    p_type_transaction,
    p_notes,
    v_organization_id,
    auth.uid(),
    (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCny' AND categorie = 'taux_change'),
    (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCdf' AND categorie = 'taux_change')
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FONCTION DE VALIDATION DE TRANSACTION SÉCURISÉE
CREATE OR REPLACE FUNCTION validate_transaction_data(
  p_montant numeric,
  p_devise text,
  p_type_transaction text,
  p_motif text
)
RETURNS boolean AS $$
BEGIN
  -- Validation complète des données
  IF p_montant <= 0 OR p_montant > 999999999.99 THEN
    RETURN false;
  END IF;
  
  IF p_devise NOT IN ('USD', 'CDF') THEN
    RETURN false;
  END IF;
  
  IF p_type_transaction NOT IN ('revenue', 'depense', 'transfert') THEN
    RETURN false;
  END IF;
  
  IF p_motif IS NULL OR LENGTH(TRIM(p_motif)) = 0 THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. TRIGGER DE VALIDATION AUTOMATIQUE
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

  -- Calculer automatiquement les valeurs financières
  NEW.frais := calculate_transaction_frais(NEW.montant, NEW.motif, NEW.type_transaction);
  NEW.benefice := calculate_transaction_benefice(NEW.montant, NEW.frais, NEW.motif);
  NEW.montant_cny := calculate_montant_cny(NEW.montant, NEW.frais, NEW.devise);

  -- Récupérer les taux actuels
  NEW.taux_usd_cny := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCny' AND categorie = 'taux_change');
  NEW.taux_usd_cdf := (SELECT valeur::numeric FROM settings WHERE cle = 'usdToCdf' AND categorie = 'taux_change');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TRIGGER DE CALCUL AUTOMATIQUE
DROP TRIGGER IF EXISTS auto_calculate_transaction_values ON transactions;
CREATE TRIGGER auto_calculate_transaction_values
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION validate_transaction_before_insert();

-- 9. VALIDATION FINALE
SELECT 
  'Financial Server Functions Created Successfully' as status,
  proname as function_name,
  pronargs as parameter_count
FROM pg_proc 
WHERE proname LIKE '%_secure' 
OR proname LIKE 'calculate_%' 
OR proname LIKE 'validate_%'
ORDER BY proname;
