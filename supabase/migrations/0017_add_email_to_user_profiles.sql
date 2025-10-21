-- Ajouter la colonne email à la table user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Créer un index sur l'email pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);