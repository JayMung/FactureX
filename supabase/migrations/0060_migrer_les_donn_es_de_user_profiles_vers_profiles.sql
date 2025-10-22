-- Ajouter les colonnes manquantes à profiles si elles n'existent pas
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operateur',
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mettre à jour profiles avec les données de user_profiles
UPDATE profiles 
SET 
    role = up.role,
    phone = up.phone,
    is_active = up.is_active
FROM user_profiles up 
WHERE profiles.id = up.user_id;