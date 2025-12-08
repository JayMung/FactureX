-- Fix sanitize_text_fields trigger - remove reference to non-existent description field in transactions
-- La table transactions n'a pas de colonne description

CREATE OR REPLACE FUNCTION public.sanitize_text_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitize clients table fields
  IF TG_TABLE_NAME = 'clients' THEN
    IF NEW.nom IS NOT NULL THEN
      NEW.nom := public.strip_html(NEW.nom);
    END IF;
    IF NEW.ville IS NOT NULL THEN
      NEW.ville := public.strip_html(NEW.ville);
    END IF;
    IF NEW.adresse IS NOT NULL THEN
      NEW.adresse := public.strip_html(NEW.adresse);
    END IF;
  END IF;
  
  -- Note: transactions table n'a pas de champ description
  -- Ce bloc a été supprimé pour éviter l'erreur
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sanitize_text_fields() IS 
'Trigger function to auto-sanitize text fields before insert/update - Fixed to only handle existing columns';
