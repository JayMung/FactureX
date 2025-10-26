-- Fix sanitize_text_fields trigger - remove reference to non-existent adresse field in clients
-- La table clients n'a que: nom, telephone, ville

CREATE OR REPLACE FUNCTION public.sanitize_text_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Sanitize clients table fields (only existing columns)
  IF TG_TABLE_NAME = 'clients' THEN
    IF NEW.nom IS NOT NULL THEN
      NEW.nom := public.strip_html(NEW.nom);
    END IF;
    IF NEW.ville IS NOT NULL THEN
      NEW.ville := public.strip_html(NEW.ville);
    END IF;
    -- Note: adresse n'existe pas dans la table clients
    -- Note: telephone est sanitizé mais pas avec strip_html (numéros)
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sanitize_text_fields() IS 
'Trigger function to auto-sanitize text fields before insert/update - Fixed to only handle existing columns in clients table';
