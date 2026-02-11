import { useSupabaseQuery } from './useSupabaseQuery';

export interface Colis {
  id: string;
  tracking_chine?: string;
  numero_commande?: string;
  fournisseur?: string;
  statut: string;
  statut_paiement?: string;
  montant_a_payer?: number;
  client_id: string;
  created_at: string;
  updated_at?: string;
  date_arrivee_agence?: string;
  organization_id: string;
}

interface ColisListFilters {
  clientId?: string;
  statut?: string;
}

export function useColisList(filters?: ColisListFilters) {
  const result = useSupabaseQuery<Colis, ColisListFilters>({
    table: 'colis',
    queryKey: 'colis-list',
    select: '*',
    orderBy: { column: 'created_at', ascending: false },
    filters,
    applyFilters: (query, f) => {
      if (f.clientId) query = query.eq('client_id', f.clientId);
      if (f.statut) query = query.eq('statut', f.statut);
      return query;
    },
  });

  // Preserve original return shape for backward compatibility
  return {
    data: result.data as Colis[],
    isLoading: result.isLoading,
    error: result.error ? new Error(result.error) : null,
    refetch: result.refetch,
  };
}
