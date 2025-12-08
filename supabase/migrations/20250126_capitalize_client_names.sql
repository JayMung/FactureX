-- Capitalize client names: first letter of each word uppercase
-- Example: "jean mukendi" => "Jean Mukendi"

-- Function to capitalize words
CREATE OR REPLACE FUNCTION capitalize_words(text_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  words TEXT[];
  word TEXT;
  result TEXT := '';
BEGIN
  -- Split text into words
  words := string_to_array(lower(text_input), ' ');
  
  -- Capitalize first letter of each word
  FOREACH word IN ARRAY words
  LOOP
    IF word != '' THEN
      IF result != '' THEN
        result := result || ' ';
      END IF;
      result := result || upper(substring(word from 1 for 1)) || substring(word from 2);
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;

-- Update all existing client names
UPDATE public.clients
SET nom = capitalize_words(nom)
WHERE nom IS NOT NULL;

COMMENT ON FUNCTION capitalize_words(TEXT) IS 
'Capitalizes the first letter of each word in the input text';
