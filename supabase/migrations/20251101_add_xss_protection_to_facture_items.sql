-- Add XSS protection to facture_items table
-- This prevents stored XSS attacks by sanitizing HTML content

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS sanitize_html(TEXT);

-- Create trigger function to sanitize facture_items before insert/update
CREATE OR REPLACE FUNCTION sanitize_facture_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sanitize description field
  IF NEW.description IS NOT NULL THEN
    NEW.description := public.sanitize_html(NEW.description);
  END IF;
  
  -- Sanitize image_url field (remove any script/content)
  IF NEW.image_url IS NOT NULL THEN
    -- Basic URL sanitization - remove script tags and javascript: protocols
    NEW.image_url := regexp_replace(
      regexp_replace(NEW.image_url, '<script[^>]*>.*?</script>', '', 'gi'),
      'javascript:', '', 'gi'
    );
  END IF;
  
  -- Sanitize product_url field (remove any script/content)
  IF NEW.product_url IS NOT NULL THEN
    -- Basic URL sanitization - remove script tags and javascript: protocols
    NEW.product_url := regexp_replace(
      regexp_replace(NEW.product_url, '<script[^>]*>.*?</script>', '', 'gi'),
      'javascript:', '', 'gi'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS facture_items_insert_trigger ON facture_items;
DROP TRIGGER IF EXISTS facture_items_update_trigger ON facture_items;

-- Create triggers for automatic sanitization
CREATE TRIGGER facture_items_insert_trigger
  BEFORE INSERT ON facture_items
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_facture_items();

CREATE TRIGGER facture_items_update_trigger
  BEFORE UPDATE ON facture_items
  FOR EACH ROW
  EXECUTE FUNCTION sanitize_facture_items();

-- Create a more comprehensive sanitization function if it doesn't exist
CREATE OR REPLACE FUNCTION sanitize_html(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  sanitized TEXT;
BEGIN
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove script tags and their content
  sanitized := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove all HTML tags except safe ones
  sanitized := regexp_replace(sanitized, '<(?!\/?(p|br|b|i|strong|em|u|span)\b)[^>]*>', '', 'gi');
  
  -- Remove event handlers (onclick, onload, etc.)
  sanitized := regexp_replace(sanitized, '\s*on\w+\s*=\s*["''][^"'']*["'']', '', 'gi');
  
  -- Remove javascript: protocols
  sanitized := regexp_replace(sanitized, 'javascript:', '', 'gi');
  
  -- Remove vbscript: protocols
  sanitized := regexp_replace(sanitized, 'vbscript:', '', 'gi');
  
  -- Remove data: URLs that could contain scripts
  sanitized := regexp_replace(sanitized, 'data:(?!image/)', '', 'gi');
  
  -- Remove iframe, object, embed tags
  sanitized := regexp_replace(sanitized, '<\/?(iframe|object|embed)[^>]*>', '', 'gi');
  
  -- Remove meta tags
  sanitized := regexp_replace(sanitized, '<\/?meta[^>]*>', '', 'gi');
  
  -- Remove link tags
  sanitized := regexp_replace(sanitized, '<\/?link[^>]*>', '', 'gi');
  
  -- Remove style tags with content
  sanitized := regexp_replace(sanitized, '<style[^>]*>.*?</style>', '', 'gi');
  
  -- Remove HTML comments
  sanitized := regexp_replace(sanitized, '<!--.*?-->', '', 'gi');
  
  -- Trim whitespace
  sanitized := trim(sanitized);
  
  RETURN sanitized;
END;
$$;
