-- Insert default fees settings
-- These are the default percentages for different types of fees

INSERT INTO public.settings (categorie, cle, valeur, description, organization_id)
VALUES 
  ('frais', 'transfert', '5', 'Frais de transfert en pourcentage', '00000000-0000-0000-0000-000000000001'),
  ('frais', 'commande', '15', 'Frais de commande en pourcentage (pour factures)', '00000000-0000-0000-0000-000000000001'),
  ('frais', 'partenaire', '3', 'Frais partenaire en pourcentage', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (categorie, cle, organization_id) 
DO UPDATE SET 
  valeur = EXCLUDED.valeur,
  description = EXCLUDED.description,
  updated_at = NOW();

COMMENT ON TABLE public.settings IS 
'Application settings including fees, exchange rates, and other configuration';
