import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  return useQuery({
    queryKey: ['colis-list', filters],
    queryFn: async () => {
      let query = supabase
        .from('colis')
        .select('*')
        .order('created_at', { ascending: false });

      // Filtrer par client si spécifié
      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      // Filtrer par statut si spécifié
      if (filters?.statut) {
        query = query.eq('statut', filters.statut);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Colis[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
