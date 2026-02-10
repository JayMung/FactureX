import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

interface UseDepensesOptions {
  status?: 'en_attente' | 'servi' | 'tous';
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

export function useDepenses(options: UseDepensesOptions = {}) {
  return useQuery({
    queryKey: ['depenses', options],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('type_transaction', 'depense')
        .order('date_paiement', { ascending: false });

      if (options.status && options.status !== 'tous') {
        if (options.status === 'en_attente') {
          query = query.eq('statut', 'En attente');
        } else if (options.status === 'servi') {
          query = query.eq('statut', 'Servi');
        }
      }

      if (options.startDate) {
        query = query.gte('date_paiement', options.startDate.toISOString());
      }

      if (options.endDate) {
        query = query.lte('date_paiement', options.endDate.toISOString());
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
