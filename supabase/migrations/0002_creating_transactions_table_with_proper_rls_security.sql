-- Create transactions table
CREATE TABLE public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date_paiement TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  montant DECIMAL(15,2) NOT NULL,
  devise TEXT NOT NULL CHECK (devise IN ('USD', 'CDF')),
  motif TEXT NOT NULL CHECK (motif IN ('Commande', 'Transfert')),
  frais DECIMAL(15,2) NOT NULL,
  taux_usd_cny DECIMAL(10,4) NOT NULL,
  taux_usd_cdf DECIMAL(10,2) NOT NULL,
  benefice DECIMAL(15,2) NOT NULL,
  montant_cny DECIMAL(15,2) NOT NULL,
  mode_paiement TEXT NOT NULL,
  statut TEXT DEFAULT 'En attente' CHECK (statut IN ('En attente', 'Servi', 'Remboursé', 'Annulé')),
  valide_par UUID REFERENCES auth.users(id),
  date_validation TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "transactions_select_policy" ON public.transactions 
FOR SELECT TO authenticated USING (true);

CREATE POLICY "transactions_insert_policy" ON public.transactions 
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "transactions_update_policy" ON public.transactions 
FOR UPDATE TO authenticated USING (true);

CREATE POLICY "transactions_delete_policy" ON public.transactions 
FOR DELETE TO authenticated USING (auth.jwt() ->> 'role' = 'admin');