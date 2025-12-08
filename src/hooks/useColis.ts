import { useState, useEffect, useCallback } from 'react';
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

  const fetchColisStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Fetching colis stats...');

      // Récupérer TOUS les colis en une seule requête
      const { data: allColis, error: fetchError } = await supabase
        .from('colis')
        .select('statut');

      if (fetchError) {
        console.error('❌ Supabase error:', fetchError);
        throw new Error(fetchError.message || 'Erreur de connexion à la base de données');
      }

      console.log('✅ Colis fetched:', allColis?.length || 0);

      if (!allColis) {
        throw new Error('Aucune donnée retournée');
      }

      // Calculer les statistiques
      const totalCount = allColis.length;
      const enTransit = allColis.filter(c => c.statut === 'en_transit').length;
      const livres = allColis.filter(c => c.statut === 'livre').length;
      const enAttente = allColis.filter(c => c.statut === 'en_preparation').length;

      console.log('📊 Stats calculées:', { totalCount, enTransit, livres, enAttente });

      setStats({
        totalCount,
        enTransit,
        livres,
        enAttente
      });
    } catch (err: any) {
      console.error('❌ Error fetching colis stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
      // En cas d'erreur, mettre des valeurs par défaut
      setStats({
        totalCount: 0,
        enTransit: 0,
        livres: 0,
        enAttente: 0
      });
    } finally {
      setLoading(false);
    }
  }, []); // Pas de dépendances pour éviter les boucles infinies

  useEffect(() => {
    fetchColisStats();
  }, [fetchColisStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchColisStats
  };
};
