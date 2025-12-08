-- Auto-set organization_id on INSERT for factures and transactions tables
-- This ensures that when a facture or transaction is created, it automatically gets the user's organization_id

-- Apply trigger to factures table
DROP TRIGGER IF EXISTS set_organization_id_on_factures_insert ON public.factures;
CREATE TRIGGER set_organization_id_on_factures_insert
  BEFORE INSERT ON public.factures
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

-- Apply trigger to transactions table
DROP TRIGGER IF EXISTS set_organization_id_on_transactions_insert ON public.transactions;
CREATE TRIGGER set_organization_id_on_transactions_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_organization_id();

COMMENT ON TRIGGER set_organization_id_on_factures_insert ON public.factures IS 
'Automatically sets organization_id from user profile on INSERT';

COMMENT ON TRIGGER set_organization_id_on_transactions_insert ON public.transactions IS 
'Automatically sets organization_id from user profile on INSERT';
