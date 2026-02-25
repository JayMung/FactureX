-- Migration to add date_echeance to factures table
ALTER TABLE public.factures ADD COLUMN IF NOT EXISTS date_echeance date;

-- Update existing records to have a date_echeance (e.g., date_emission + 30 days)
UPDATE public.factures 
SET date_echeance = (date_emission + interval '30 days')::date 
WHERE date_echeance IS NULL;
