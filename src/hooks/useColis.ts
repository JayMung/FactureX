import { useMemo } from 'react';
import { useSupabaseQuery } from './useSupabaseQuery';

interface ColisStats {
  totalCount: number;
  enTransit: number;
  livres: number;
  enAttente: number;
}

interface ColisFilters {
  status?: string;
  clientId?: string;
}

export const useColis = (page: number = 1, filters: ColisFilters = {}) => {
  const { data, isLoading: loading, error, refetch } = useSupabaseQuery<{ statut: string }>({
    table: 'colis',
    queryKey: 'colis-stats',
    select: 'statut',
  });

  const allColis = data as { statut: string }[];

  // Calculer les statistiques à partir des données React Query
  const stats: ColisStats = useMemo(() => {
    if (!allColis || allColis.length === 0) {
      return { totalCount: 0, enTransit: 0, livres: 0, enAttente: 0 };
    }
    return {
      totalCount: allColis.length,
      enTransit: allColis.filter(c => c.statut === 'en_transit').length,
      livres: allColis.filter(c => c.statut === 'livre').length,
      enAttente: allColis.filter(c => c.statut === 'en_preparation').length,
    };
  }, [allColis]);

  return {
    stats,
    loading,
    error,
    refetch
  };
};
