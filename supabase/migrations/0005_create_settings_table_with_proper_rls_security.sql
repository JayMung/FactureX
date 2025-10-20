-- Create settings table
CREATE TABLE public.settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categorie TEXT NOT NULL,
  cle TEXT NOT NULL,
  valeur TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(categorie, cle)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "settings_select_policy" ON public.settings 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "settings_insert_policy" ON public.settings 
FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "settings_update_policy" ON public.settings 
FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "settings_delete_policy" ON public.settings 
FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');

-- Insert default settings
INSERT INTO public.settings (categorie, cle, valeur, description) VALUES
('taux', 'usd_cny', '7.25', 'Taux de change USD vers CNY'),
('taux', 'usd_cdf', '2850', 'Taux de change USD vers CDF'),
('frais', 'transfert', '5', 'Frais de transfert en pourcentage'),
('frais', 'commande', '10', 'Frais de commande en pourcentage'),
('frais', 'partenaire', '3', 'Commission partenaire en pourcentage');