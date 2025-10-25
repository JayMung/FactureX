-- Migration: Input Validation Constraints
-- Description: Add database-level validation constraints
-- Date: 2025-01-26
-- Security Task: #9 - Input Validation (HIGH)

-- ============================================================================
-- PART 1: Email Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN email ~* '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    AND LENGTH(email) <= 254
    AND email NOT LIKE '%@%@%'; -- No multiple @
END;
$$;

COMMENT ON FUNCTION public.is_valid_email(TEXT) IS 
'Validates email format according to RFC 5322 simplified pattern';

-- ============================================================================
-- PART 2: Phone Validation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_phone(phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Remove spaces and common separators
  phone := REGEXP_REPLACE(phone, '[\s\-\(\)]', '', 'g');
  
  -- Check if it's between 10 and 20 digits
  RETURN phone ~ '^\+?[\d]{10,20}$';
END;
$$;

COMMENT ON FUNCTION public.is_valid_phone(TEXT) IS 
'Validates phone number format (10-20 digits with optional + prefix)';

-- ============================================================================
-- PART 3: SIRET Validation Function (French Business ID)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_siret(siret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
  sum INTEGER := 0;
  digit INTEGER;
  i INTEGER;
BEGIN
  -- Remove spaces
  cleaned := REGEXP_REPLACE(siret, '\s', '', 'g');
  
  -- Check length
  IF LENGTH(cleaned) != 14 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if all digits
  IF cleaned !~ '^\d{14}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Luhn algorithm validation
  FOR i IN REVERSE 14..1 LOOP
    digit := SUBSTRING(cleaned FROM i FOR 1)::INTEGER;
    
    IF (14 - i + 1) % 2 = 0 THEN
      digit := digit * 2;
      IF digit > 9 THEN
        digit := digit - 9;
      END IF;
    END IF;
    
    sum := sum + digit;
  END LOOP;
  
  RETURN sum % 10 = 0;
END;
$$;

COMMENT ON FUNCTION public.is_valid_siret(TEXT) IS 
'Validates SIRET number using Luhn algorithm';

-- ============================================================================
-- PART 4: SIREN Validation Function (French Business ID)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_valid_siren(siren TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
  sum INTEGER := 0;
  digit INTEGER;
  i INTEGER;
BEGIN
  -- Remove spaces
  cleaned := REGEXP_REPLACE(siren, '\s', '', 'g');
  
  -- Check length
  IF LENGTH(cleaned) != 9 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if all digits
  IF cleaned !~ '^\d{9}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Luhn algorithm validation
  FOR i IN REVERSE 9..1 LOOP
    digit := SUBSTRING(cleaned FROM i FOR 1)::INTEGER;
    
    IF (9 - i + 1) % 2 = 0 THEN
      digit := digit * 2;
      IF digit > 9 THEN
        digit := digit - 9;
      END IF;
    END IF;
    
    sum := sum + digit;
  END LOOP;
  
  RETURN sum % 10 = 0;
END;
$$;

COMMENT ON FUNCTION public.is_valid_siren(TEXT) IS 
'Validates SIREN number using Luhn algorithm';

-- ============================================================================
-- PART 5: Sanitization Functions
-- ============================================================================

-- Sanitize HTML to prevent XSS
CREATE OR REPLACE FUNCTION public.sanitize_html(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(input, '&', '&amp;', 'g'),
          '<', '&lt;', 'g'
        ),
        '>', '&gt;', 'g'
      ),
      '"', '&quot;', 'g'
    ),
    '''', '&#x27;', 'g'
  );
END;
$$;

COMMENT ON FUNCTION public.sanitize_html(TEXT) IS 
'Sanitizes HTML to prevent XSS attacks';

-- Strip HTML tags
CREATE OR REPLACE FUNCTION public.strip_html(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN REGEXP_REPLACE(input, '<[^>]*>', '', 'g');
END;
$$;

COMMENT ON FUNCTION public.strip_html(TEXT) IS 
'Removes all HTML tags from input';

-- Sanitize filename
CREATE OR REPLACE FUNCTION public.sanitize_filename(filename TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Replace dangerous characters with underscore
  filename := REGEXP_REPLACE(filename, '[^a-zA-Z0-9._-]', '_', 'g');
  
  -- Remove multiple dots
  filename := REGEXP_REPLACE(filename, '\.{2,}', '.', 'g');
  
  -- Remove leading dots
  filename := REGEXP_REPLACE(filename, '^\.+', '', 'g');
  
  -- Limit length
  filename := SUBSTRING(filename FROM 1 FOR 255);
  
  RETURN filename;
END;
$$;

COMMENT ON FUNCTION public.sanitize_filename(TEXT) IS 
'Sanitizes filename to prevent path traversal attacks';

-- ============================================================================
-- PART 6: Add Check Constraints to Existing Tables
-- ============================================================================

-- Add email validation to profiles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Drop existing constraint if it exists
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_check;
    
    -- Add new constraint
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_email_check
    CHECK (email IS NULL OR public.is_valid_email(email));
  END IF;
END $$;

-- Add phone validation to profiles table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_check;
    
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_phone_check
    CHECK (phone IS NULL OR public.is_valid_phone(phone));
  END IF;
END $$;

-- Add SIRET validation to clients table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_siret_check;
    
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_siret_check
    CHECK (siret IS NULL OR public.is_valid_siret(siret));
  END IF;
END $$;

-- Add email validation to clients table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_email_check;
    
    ALTER TABLE public.clients
    ADD CONSTRAINT clients_email_check
    CHECK (email IS NULL OR public.is_valid_email(email));
  END IF;
END $$;

-- ============================================================================
-- PART 7: Create Trigger for Auto-Sanitization
-- ============================================================================

-- Function to sanitize text fields before insert/update
CREATE OR REPLACE FUNCTION public.sanitize_text_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sanitize common text fields (customize based on your schema)
  IF TG_TABLE_NAME = 'clients' THEN
    IF NEW.nom IS NOT NULL THEN
      NEW.nom := public.strip_html(NEW.nom);
    END IF;
    IF NEW.prenom IS NOT NULL THEN
      NEW.prenom := public.strip_html(NEW.prenom);
    END IF;
    IF NEW.adresse IS NOT NULL THEN
      NEW.adresse := public.strip_html(NEW.adresse);
    END IF;
  END IF;
  
  IF TG_TABLE_NAME = 'transactions' THEN
    IF NEW.description IS NOT NULL THEN
      NEW.description := public.strip_html(NEW.description);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sanitize_text_fields() IS 
'Trigger function to auto-sanitize text fields before insert/update';

-- Apply trigger to clients table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN
    DROP TRIGGER IF EXISTS sanitize_clients_text ON public.clients;
    
    CREATE TRIGGER sanitize_clients_text
    BEFORE INSERT OR UPDATE ON public.clients
    FOR EACH ROW
    EXECUTE FUNCTION public.sanitize_text_fields();
  END IF;
END $$;

-- Apply trigger to transactions table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    DROP TRIGGER IF EXISTS sanitize_transactions_text ON public.transactions;
    
    CREATE TRIGGER sanitize_transactions_text
    BEFORE INSERT OR UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.sanitize_text_fields();
  END IF;
END $$;

-- ============================================================================
-- PART 8: Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.is_valid_email(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_phone(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_siret(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_siren(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_html(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.strip_html(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_filename(TEXT) TO authenticated;

-- ============================================================================
-- PART 9: Documentation
-- ============================================================================

-- Migration completed successfully
DO $$
BEGIN
  RAISE NOTICE 'Input validation constraints migration completed successfully';
  RAISE NOTICE 'Added validation functions: is_valid_email, is_valid_phone, is_valid_siret, is_valid_siren';
  RAISE NOTICE 'Added sanitization functions: sanitize_html, strip_html, sanitize_filename';
  RAISE NOTICE 'Added check constraints to profiles and clients tables';
  RAISE NOTICE 'Added auto-sanitization triggers to clients and transactions tables';
END $$;
