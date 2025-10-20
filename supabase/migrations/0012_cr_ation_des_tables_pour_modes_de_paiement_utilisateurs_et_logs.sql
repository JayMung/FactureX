-- Table pour les modes de paiement
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les utilisateurs étendus (au-delà de auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(200),
  role VARCHAR(50) DEFAULT 'operateur',
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table pour les logs d'activité
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(200) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS sur ces tables
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour payment_methods
CREATE POLICY "Enable read for authenticated users" ON payment_methods
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for admin users" ON payment_methods
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for admin users" ON payment_methods
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for admin users" ON payment_methods
FOR DELETE USING (auth.role() = 'authenticated');

-- Politiques RLS pour user_profiles
CREATE POLICY "Enable read for authenticated users" ON user_profiles
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for admin users" ON user_profiles
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for admin users" ON user_profiles
FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for admin users" ON user_profiles
FOR DELETE USING (auth.role() = 'authenticated');

-- Politiques RLS pour activity_logs
CREATE POLICY "Enable read for authenticated users" ON activity_logs
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON activity_logs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');