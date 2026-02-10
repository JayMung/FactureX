import { useQuery } from '@tanstack/react-query';
import { supabase } from '../integrations/supabase/client';

export function useLastReconciliation() {
  return useQuery({
    queryKey: ['lastReconciliation'],
    queryFn: async () => {
      // Use mouvements_comptes as a proxy for reconciliation activity.
      // The last mouvement date indicates the last time accounts were actively managed.
      const { data, error } = await supabase
        .from('mouvements_comptes')
        .select('id, created_at, type_mouvement, montant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
      return data ? { date: data.created_at, ...data } : null;
    },
    staleTime: 10 * 60 * 1000,
  });
}
