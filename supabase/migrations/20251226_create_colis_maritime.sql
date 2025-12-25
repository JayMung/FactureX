-- Create containers_maritime table
CREATE TABLE IF NOT EXISTS public.containers_maritime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(50) NOT NULL,
    transitaire_id UUID REFERENCES public.transitaires(id),
    statut VARCHAR(50) DEFAULT 'En préparation', -- 'En préparation', 'En transit', 'Arrivé', 'Dédouané', 'Livré'
    date_depart DATE,
    date_arrivee_prevue DATE,
    date_arrivee_effective DATE,
    bateau VARCHAR(100),
    numero_voyage VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES public.organizations(id)
);

-- Create colis_maritime table
CREATE TABLE IF NOT EXISTS public.colis_maritime (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) NOT NULL,
    tracking_number VARCHAR(100),
    description TEXT,
    
    -- Dimensions & Poids
    cbm NUMERIC(10, 4) DEFAULT 0, -- Volume en m3
    poids NUMERIC(10, 2) DEFAULT 0, -- Poids en kg (optionnel pour maritime, mais utile)
    quantite INTEGER DEFAULT 1,
    
    -- Finance (Optionnel, calculé souvent au niveau container ou cbm)
    tarif_cbm NUMERIC(10, 2), 
    montant_total NUMERIC(10, 2),
    statut_paiement VARCHAR(50) DEFAULT 'Non payé',
    
    -- Logistique
    container_id UUID REFERENCES public.containers_maritime(id),
    statut VARCHAR(50) DEFAULT 'Reçu Entrepôt Chine', -- 'Reçu Entrepôt Chine', 'Chargé', 'En Mer', 'Arrivé Kinshasa', 'Livré Client'
    date_reception_chine DATE DEFAULT CURRENT_DATE,
    date_chargement DATE,
    date_arrivee DATE,
    date_livraison DATE,
    
    -- Meta
    notes TEXT,
    photos TEXT[], -- Array of URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    organization_id UUID REFERENCES public.organizations(id)
);

-- Add indexes for performance
CREATE INDEX idx_colis_maritime_client ON public.colis_maritime(client_id);
CREATE INDEX idx_colis_maritime_container ON public.colis_maritime(container_id);
CREATE INDEX idx_colis_maritime_statut ON public.colis_maritime(statut);
CREATE INDEX idx_containers_maritime_statut ON public.containers_maritime(statut);

-- Enable RLS
ALTER TABLE public.containers_maritime ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colis_maritime ENABLE ROW LEVEL SECURITY;

-- Add policies (Assuming standard authenticated access for now, similar to other tables)
CREATE POLICY "Enable all access for authenticated users" ON public.containers_maritime
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON public.colis_maritime
    FOR ALL USING (auth.role() = 'authenticated');

-- Trigger to update updated_at
CREATE TRIGGER handle_updated_at_containers_maritime
    BEFORE UPDATE ON public.containers_maritime
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER handle_updated_at_colis_maritime
    BEFORE UPDATE ON public.colis_maritime
    FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
