-- Add unique constraint on telephone within organization
-- Prevents duplicate clients with same phone number in the same organization

-- First, clean up any existing duplicates (keep the oldest one)
WITH duplicates AS (
  SELECT 
    id,
    telephone,
    organization_id,
    ROW_NUMBER() OVER (
      PARTITION BY telephone, organization_id 
      ORDER BY created_at ASC
    ) as rn
  FROM public.clients
)
DELETE FROM public.clients
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add unique constraint on (telephone, organization_id)
-- This ensures no duplicate phone numbers within the same organization
ALTER TABLE public.clients
DROP CONSTRAINT IF EXISTS clients_telephone_organization_unique;

ALTER TABLE public.clients
ADD CONSTRAINT clients_telephone_organization_unique 
UNIQUE (telephone, organization_id);

-- Add index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_clients_telephone_org 
ON public.clients(telephone, organization_id);

COMMENT ON CONSTRAINT clients_telephone_organization_unique ON public.clients IS 
'Ensures telephone numbers are unique within each organization to prevent duplicate clients';
