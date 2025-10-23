-- Migration pour le module Factures
-- Date: 2025-01-23

-- Table: product_categories
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: factures
CREATE TABLE IF NOT EXISTS public.factures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_number VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('devis', 'facture')),
  statut VARCHAR(20) NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'en_attente', 'validee', 'annulee')),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_emission TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_validation TIMESTAMP WITH TIME ZONE,
  valide_par UUID REFERENCES auth.users(id),
  mode_livraison VARCHAR(20) NOT NULL CHECK (mode_livraison IN ('aerien', 'maritime')),
  devise VARCHAR(10) NOT NULL DEFAULT 'USD' CHECK (devise IN ('USD', 'CDF')),
  shipping_fee DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) DEFAULT 0,
  total_poids DECIMAL(10, 2) DEFAULT 0,
  frais_transport_douane DECIMAL(10, 2) DEFAULT 0,
  total_general DECIMAL(10, 2) DEFAULT 0,
  conditions_vente TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: facture_items
CREATE TABLE IF NOT EXISTS public.facture_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  numero_ligne INTEGER NOT NULL,
  image_url TEXT,
  product_url TEXT,
  quantite INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  prix_unitaire DECIMAL(10, 2) NOT NULL,
  poids DECIMAL(10, 2) NOT NULL DEFAULT 0,
  montant_total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_factures_client_id ON public.factures(client_id);
CREATE INDEX IF NOT EXISTS idx_factures_type ON public.factures(type);
CREATE INDEX IF NOT EXISTS idx_factures_statut ON public.factures(statut);
CREATE INDEX IF NOT EXISTS idx_factures_date_emission ON public.factures(date_emission);
CREATE INDEX IF NOT EXISTS idx_factures_facture_number ON public.factures(facture_number);
CREATE INDEX IF NOT EXISTS idx_facture_items_facture_id ON public.facture_items(facture_id);

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour factures
DROP TRIGGER IF EXISTS update_factures_updated_at ON public.factures;
CREATE TRIGGER update_factures_updated_at
  BEFORE UPDATE ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour product_categories
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour générer le numéro de facture automatiquement
CREATE OR REPLACE FUNCTION generate_facture_number()
RETURNS TRIGGER AS $$
DECLARE
  year_part VARCHAR(4);
  month_part VARCHAR(2);
  day_part VARCHAR(2);
  sequence_num INTEGER;
  new_number VARCHAR(50);
BEGIN
  -- Extraire année, mois, jour
  year_part := TO_CHAR(NEW.date_emission, 'YYYY');
  month_part := TO_CHAR(NEW.date_emission, 'MM');
  day_part := TO_CHAR(NEW.date_emission, 'DD');
  
  -- Obtenir le prochain numéro de séquence pour cette date
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(facture_number FROM LENGTH(facture_number) - 2) AS INTEGER
    )
  ), 0) + 1
  INTO sequence_num
  FROM public.factures
  WHERE facture_number LIKE 'FAC-' || year_part || '-' || month_part || day_part || '-%';
  
  -- Construire le numéro: FAC-2025-2419-001
  new_number := 'FAC-' || year_part || '-' || month_part || day_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  NEW.facture_number := new_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer le numéro de facture
DROP TRIGGER IF EXISTS generate_facture_number_trigger ON public.factures;
CREATE TRIGGER generate_facture_number_trigger
  BEFORE INSERT ON public.factures
  FOR EACH ROW
  WHEN (NEW.facture_number IS NULL OR NEW.facture_number = '')
  EXECUTE FUNCTION generate_facture_number();

-- Insérer les catégories de produits par défaut
INSERT INTO public.product_categories (nom, code) VALUES
  ('Normal', 'NORMAL'),
  ('Liquide', 'LIQUIDE'),
  ('Batterie', 'BATTERIE')
ON CONFLICT (code) DO NOTHING;

-- Insérer les paramètres par défaut pour l'entreprise
INSERT INTO public.settings (categorie, cle, valeur, description) VALUES
  ('company', 'nom_entreprise', '', 'Nom de l''entreprise'),
  ('company', 'logo_url', '', 'URL du logo de l''entreprise'),
  ('company', 'rccm', '', 'Numéro RCCM'),
  ('company', 'idnat', '', 'Numéro IDNAT'),
  ('company', 'nif', '', 'Numéro NIF'),
  ('company', 'email_entreprise', '', 'Email de l''entreprise'),
  ('company', 'telephone_entreprise', '', 'Téléphone de l''entreprise'),
  ('company', 'adresse_entreprise', '', 'Adresse de l''entreprise'),
  ('company', 'signature_url', '', 'URL du stamp/signature'),
  ('shipping', 'frais_aerien_par_kg', '16', 'Frais de livraison aérienne par kg (USD)'),
  ('shipping', 'frais_maritime_par_cbm', '450', 'Frais de livraison maritime par cbm (USD)'),
  ('invoice', 'conditions_vente_defaut', 'Paiement à la livraison. Marchandise contrôlée avant expédition.', 'Conditions de vente par défaut')
ON CONFLICT (categorie, cle) DO NOTHING;

-- Enable RLS (Row Level Security)
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facture_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Policies pour factures
CREATE POLICY "Enable read access for authenticated users" ON public.factures
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.factures
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.factures
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.factures
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policies pour facture_items
CREATE POLICY "Enable read access for authenticated users" ON public.facture_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.facture_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.facture_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.facture_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- Policies pour product_categories
CREATE POLICY "Enable read access for authenticated users" ON public.product_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.product_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON public.product_categories
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON public.product_categories
  FOR DELETE USING (auth.role() = 'authenticated');

-- Commentaires
COMMENT ON TABLE public.factures IS 'Table pour stocker les factures et devis';
COMMENT ON TABLE public.facture_items IS 'Table pour stocker les items/lignes de chaque facture';
COMMENT ON TABLE public.product_categories IS 'Table pour stocker les catégories de produits';
