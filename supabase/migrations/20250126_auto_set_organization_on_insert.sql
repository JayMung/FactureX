-- Auto-set organization_id on INSERT for clients table
-- This ensures that when a client is created, it automatically gets the user's organization_id

CREATE OR REPLACE FUNCTION public.set_organization_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If organization_id is not provided, set it from the user's profile
  IF NEW.organization_id IS NULL THEN
    NEW.organization_id := (
      SELECT organization_id 
      FROM public.profiles 
      WHERE id = auth.uid()
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger to clients table
DROP TRIGGER IF EXISTS set_organization_id_on_clients_insert ON public.clients;
CREATE TRIGGER set_organization_id_on_clients_insert
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

COMMENT ON FUNCTION public.set_organization_id() IS 
'Automatically sets organization_id from user profile on INSERT if not provided';
