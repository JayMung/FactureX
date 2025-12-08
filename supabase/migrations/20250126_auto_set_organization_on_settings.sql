-- Auto-set organization_id on INSERT for settings and other tables
-- This ensures organization_id is automatically set for all multi-tenant tables

-- Apply trigger to settings table
DROP TRIGGER IF EXISTS set_organization_id_on_settings_insert ON public.settings;
CREATE TRIGGER set_organization_id_on_settings_insert
  BEFORE INSERT ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

-- Apply trigger to payment_methods table
DROP TRIGGER IF EXISTS set_organization_id_on_payment_methods_insert ON public.payment_methods;
CREATE TRIGGER set_organization_id_on_payment_methods_insert
  BEFORE INSERT ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

COMMENT ON TRIGGER set_organization_id_on_settings_insert ON public.settings IS 
'Automatically sets organization_id from user profile on INSERT';

COMMENT ON TRIGGER set_organization_id_on_payment_methods_insert ON public.payment_methods IS 
'Automatically sets organization_id from user profile on INSERT';
