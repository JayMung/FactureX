import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [stats, setStats] = useState<ColisStats>({
    totalCount: 0,
    enTransit: 0,
    livres: 0,
    enAttente: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchColisStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Compter tous les colis
        const { count: totalCount, error: totalError } = await supabase
          .from('colis')
          .select('*', { count: 'exact', head: true });

        if (totalError) throw totalError;

        // Compter les colis en transit
        const { count: enTransit, error: transitError } = await supabase
          .from('colis')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'En transit');

        if (transitError) throw transitError;

        // Compter les colis livrés
        const { count: livres, error: livresError } = await supabase
          .from('colis')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'Livré');

        if (livresError) throw livresError;

        // Compter les colis en attente
        const { count: enAttente, error: attenteError } = await supabase
          .from('colis')
          .select('*', { count: 'exact', head: true })
          .eq('statut', 'En attente');

        if (attenteError) throw attenteError;

        setStats({
          totalCount: totalCount || 0,
          enTransit: enTransit || 0,
          livres: livres || 0,
          enAttente: enAttente || 0
        });
      } catch (err: any) {
        console.error('Error fetching colis stats:', err);
        setError(err.message || 'Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchColisStats();
  }, [page, filters]);

  return {
    stats,
    loading,
    error
  };
};
