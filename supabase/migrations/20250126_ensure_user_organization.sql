-- Ensure all users have an organization_id
-- Create a default organization if needed and assign users to it

DO $$
DECLARE
  default_org_id uuid;
  user_record RECORD;
BEGIN
  -- Check if there's already a default organization
  SELECT id INTO default_org_id
  FROM public.organizations
  WHERE name = 'Organisation par défaut'
  LIMIT 1;
  
  -- If no default organization exists, create one
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (name, created_at)
    VALUES ('Organisation par défaut', NOW())
    RETURNING id INTO default_org_id;
    
    RAISE NOTICE 'Created default organization with id: %', default_org_id;
  END IF;
  
  -- Update all profiles without organization_id
  UPDATE public.profiles
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Updated profiles to have organization_id';
  
END $$;

-- Make sure organization_id is set for new profiles via trigger
CREATE OR REPLACE FUNCTION public.assign_default_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- If organization_id is not set, assign default organization
  IF NEW.organization_id IS NULL THEN
    SELECT id INTO default_org_id
    FROM public.organizations
    WHERE name = 'Organisation par défaut'
    LIMIT 1;
    
    -- If no default org exists, create one
    IF default_org_id IS NULL THEN
      INSERT INTO public.organizations (name, created_at)
      VALUES ('Organisation par défaut', NOW())
      RETURNING id INTO default_org_id;
    END IF;
    
    NEW.organization_id := default_org_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS assign_organization_on_profile_insert ON public.profiles;
CREATE TRIGGER assign_organization_on_profile_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_organization();

COMMENT ON FUNCTION public.assign_default_organization() IS 
'Automatically assigns default organization to new profiles if organization_id is null';
