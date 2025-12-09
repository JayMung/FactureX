-- Migration: Ajout des webhooks pour les encaissements (paiements)
-- Date: 2025-11-14
-- Description: Créer les triggers webhook pour la table paiements (encaissements factures et colis)

-- ============================================
-- 1. FONCTION TRIGGER POUR PAIEMENTS
-- ============================================

CREATE OR REPLACE FUNCTION webhook_trigger_paiements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_type TEXT;
  v_data JSONB;
BEGIN
  -- Déterminer le type d'événement
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'paiement.created';
    v_data := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_event_type := 'paiement.updated';
    v_data := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'paiement.deleted';
    v_data := to_jsonb(OLD);
  ELSE
    RETURN NEW;
  END IF;

  -- Déclencher les webhooks
  PERFORM trigger_webhooks(
    v_event_type,
    v_data,
    COALESCE(NEW.organization_id, OLD.organization_id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- 2. CRÉER LES TRIGGERS
-- ============================================

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS webhook_paiements_trigger ON paiements;

-- Créer le trigger pour INSERT, UPDATE, DELETE
CREATE TRIGGER webhook_paiements_trigger
AFTER INSERT OR UPDATE OR DELETE ON paiements
FOR EACH ROW
EXECUTE FUNCTION webhook_trigger_paiements();

-- ============================================
-- 3. COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION webhook_trigger_paiements() IS 
'Trigger function pour envoyer des webhooks lors de la création, modification ou suppression d''encaissements (paiements)';

COMMENT ON TRIGGER webhook_paiements_trigger ON paiements IS 
'Déclenche les webhooks pour les événements: paiement.created, paiement.updated, paiement.deleted';

-- ============================================
-- 4. VÉRIFICATION
-- ============================================

-- Vérifier que le trigger est créé
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'webhook_paiements_trigger'
    AND event_object_table = 'paiements'
  ) THEN
    RAISE NOTICE '✅ Trigger webhook_paiements_trigger créé avec succès';
  ELSE
    RAISE EXCEPTION '❌ Échec de la création du trigger webhook_paiements_trigger';
  END IF;
END $$;
