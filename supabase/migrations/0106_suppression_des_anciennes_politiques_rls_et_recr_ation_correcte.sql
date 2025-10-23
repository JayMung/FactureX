-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can view all permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;

-- Créer la table des permissions (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  module VARCHAR(50) NOT NULL, -- 'clients', 'transactions', 'settings', 'payment_methods', 'activity_logs'
  can_read BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, module) -- Une seule entrée par utilisateur par module
);

-- Activer RLS (Row Level Security) - OBLIGATOIRE
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Politique pour que l'utilisateur puisse voir ses propres permissions
CREATE POLICY "Users can view own permissions" ON user_permissions 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Politique pour que les admins puissent voir toutes les permissions
CREATE POLICY "Admins can view all permissions" ON user_permissions 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Politique pour que les admins puissent gérer les permissions
CREATE POLICY "Admins can manage permissions" ON user_permissions 
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);