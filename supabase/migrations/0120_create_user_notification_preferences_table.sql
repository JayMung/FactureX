-- Migration: Créer la table des préférences de notifications utilisateur
-- Date: 2025-10-23

-- Créer la table user_notification_preferences
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Préférences générales
  enable_notifications BOOLEAN DEFAULT true,
  enable_browser_notifications BOOLEAN DEFAULT false,
  
  -- Préférences par type d'activité
  notify_on_creation BOOLEAN DEFAULT true,
  notify_on_modification BOOLEAN DEFAULT true,
  notify_on_deletion BOOLEAN DEFAULT true,
  notify_on_auth BOOLEAN DEFAULT false,
  notify_on_settings BOOLEAN DEFAULT true,
  
  -- Préférences par entité
  notify_on_client_activity BOOLEAN DEFAULT true,
  notify_on_transaction_activity BOOLEAN DEFAULT true,
  notify_on_user_activity BOOLEAN DEFAULT true,
  
  -- Filtres
  notify_only_own_activities BOOLEAN DEFAULT false,
  notify_only_important BOOLEAN DEFAULT false,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Contrainte unique pour éviter les doublons
  CONSTRAINT unique_user_notification_preferences UNIQUE (user_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user_id 
  ON public.user_notification_preferences(user_id);

-- Politique RLS: Les utilisateurs peuvent seulement voir et modifier leurs propres préférences
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: L'utilisateur peut voir ses propres préférences
CREATE POLICY "Users can view their own notification preferences"
  ON public.user_notification_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Politique INSERT: L'utilisateur peut créer ses propres préférences
CREATE POLICY "Users can create their own notification preferences"
  ON public.user_notification_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Politique UPDATE: L'utilisateur peut modifier ses propres préférences
CREATE POLICY "Users can update their own notification preferences"
  ON public.user_notification_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique DELETE: L'utilisateur peut supprimer ses propres préférences
CREATE POLICY "Users can delete their own notification preferences"
  ON public.user_notification_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Fonction trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER update_notification_preferences_timestamp
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Commentaires
COMMENT ON TABLE public.user_notification_preferences IS 'Table des préférences de notifications pour chaque utilisateur';
COMMENT ON COLUMN public.user_notification_preferences.enable_notifications IS 'Active ou désactive toutes les notifications';
COMMENT ON COLUMN public.user_notification_preferences.enable_browser_notifications IS 'Active les notifications push du navigateur';
COMMENT ON COLUMN public.user_notification_preferences.notify_only_own_activities IS 'Notifier uniquement pour les activités de l''utilisateur';
