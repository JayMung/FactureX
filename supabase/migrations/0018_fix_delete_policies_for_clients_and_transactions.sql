-- =====================================================
-- FIX COMPLET POUR LA SUPPRESSION DES CLIENTS ET TRANSACTIONS
-- =====================================================
-- 
-- Ce script corrige les politiques RLS qui empêchent la suppression
-- et ajoute des triggers pour maintenir l'intégrité des données
-- 
-- INSTRUCTIONS:
-- 1. Allez sur votre Dashboard Supabase (https://supabase.com/dashboard)
-- 2. Sélectionnez votre projet CoxiPay
-- 3. Allez dans SQL Editor (menu de gauche)
-- 4. Créez une nouvelle requête
-- 5. Copiez-collez ce script et exécutez-le (Run ou Ctrl+Enter)
-- 
-- =====================================================

-- =====================================================
-- 1. CORRIGER LES POLICIES DE SUPPRESSION
-- =====================================================

-- Supprimer les anciennes policies restrictives pour TRANSACTIONS
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- Créer une nouvelle policy permissive pour tous les utilisateurs authentifiés
CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated USING (true);

-- Supprimer les anciennes policies restrictives pour CLIENTS
DROP POLICY IF EXISTS "clients_delete_policy" ON public.clients;

-- Créer une nouvelle policy permissive pour tous les utilisateurs authentifiés
CREATE POLICY "clients_delete_policy" ON public.clients 
FOR DELETE TO authenticated USING (true);

-- =====================================================
-- 2. CRÉER UNE FONCTION POUR RECALCULER LE TOTAL_PAYE
-- =====================================================

-- Cette fonction recalcule automatiquement le total_paye d'un client
CREATE OR REPLACE FUNCTION recalculate_client_total_paye()
RETURNS TRIGGER AS $$
BEGIN
  -- Cas de suppression de transaction
  IF TG_OP = 'DELETE' THEN
    UPDATE public.clients
    SET total_paye = COALESCE((
      SELECT SUM(montant)
      FROM public.transactions
      WHERE client_id = OLD.client_id
    ), 0),
    updated_at = NOW()
    WHERE id = OLD.client_id;
    RETURN OLD;
  END IF;

  -- Cas d'insertion de transaction
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clients
    SET total_paye = COALESCE((
      SELECT SUM(montant)
      FROM public.transactions
      WHERE client_id = NEW.client_id
    ), 0),
    updated_at = NOW()
    WHERE id = NEW.client_id;
    RETURN NEW;
  END IF;

  -- Cas de mise à jour de transaction
  IF TG_OP = 'UPDATE' THEN
    -- Recalculer pour l'ancien client si le client_id a changé
    IF OLD.client_id != NEW.client_id THEN
      UPDATE public.clients
      SET total_paye = COALESCE((
        SELECT SUM(montant)
        FROM public.transactions
        WHERE client_id = OLD.client_id
      ), 0),
      updated_at = NOW()
      WHERE id = OLD.client_id;
    END IF;

    -- Recalculer pour le nouveau client
    UPDATE public.clients
    SET total_paye = COALESCE((
      SELECT SUM(montant)
      FROM public.transactions
      WHERE client_id = NEW.client_id
    ), 0),
    updated_at = NOW()
    WHERE id = NEW.client_id;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. CRÉER LE TRIGGER POUR AUTO-RECALCUL
-- =====================================================

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trigger_recalculate_client_total_paye ON public.transactions;

-- Créer le trigger qui se déclenche après INSERT, UPDATE, DELETE sur transactions
CREATE TRIGGER trigger_recalculate_client_total_paye
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION recalculate_client_total_paye();

-- =====================================================
-- 4. RECALCULER TOUS LES TOTAUX EXISTANTS
-- =====================================================

-- Mettre à jour tous les clients avec les totaux corrects
UPDATE public.clients c
SET total_paye = COALESCE((
  SELECT SUM(t.montant)
  FROM public.transactions t
  WHERE t.client_id = c.id
), 0),
updated_at = NOW();

-- =====================================================
-- 5. VÉRIFIER LES CHANGEMENTS
-- =====================================================

-- Afficher les policies de suppression pour vérification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('transactions', 'clients') 
  AND policyname LIKE '%delete%'
ORDER BY tablename, policyname;

-- Afficher les triggers créés
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_recalculate_client_total_paye';

-- Afficher un résumé des clients et leurs totaux
SELECT 
    c.id,
    c.nom,
    c.total_paye as total_enregistre,
    COALESCE(SUM(t.montant), 0) as total_calcule,
    COUNT(t.id) as nombre_transactions
FROM public.clients c
LEFT JOIN public.transactions t ON t.client_id = c.id
GROUP BY c.id, c.nom, c.total_paye
ORDER BY c.nom;
