-- F6-4: Export Comptable RPC
-- Retourne les mouvements comptables filtrés par période et organisation

CREATE OR REPLACE FUNCTION public.export_accounting_entries(
  p_start date,
  p_end   date
)
RETURNS TABLE(
  date_mouvement  date,
  compte          text,
  type_mouvement  text,
  montant         numeric,
  devise          text,
  reference       text,
  description     text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.date_mouvement::date,
    c.nom,
    m.type_mouvement,
    m.montant,
    c.devise,
    m.transaction_id::text,
    m.description
  FROM public.mouvements_comptes m
  JOIN public.comptes_financiers c ON c.id = m.compte_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE m.organization_id = p.organization_id
    AND c.is_active = true
    AND m.date_mouvement::date BETWEEN p_start AND p_end
  ORDER BY m.date_mouvement ASC, c.nom ASC;
$$;
