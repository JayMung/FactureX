import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MouvementFilters } from '@/types';

interface MouvementsStats {
  totalDebits: number;
  totalCredits: number;
  nombreDebits: number;
  nombreCredits: number;
  nombreMouvements: number;
  soldeNet: number;
}

/**
 * Hook pour récupérer les statistiques globales des mouvements de comptes
 * sans pagination
 */
export const useMouvementsComptesStats = (filters?: MouvementFilters) => {
  const [stats, setStats] = useState<MouvementsStats>({
    totalDebits: 0,
    totalCredits: 0,
    nombreDebits: 0,
    nombreCredits: 0,
    nombreMouvements: 0,
    soldeNet: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Construire la requête
      let query = supabase
        .from('mouvements_comptes')
        .select('type_mouvement, montant');

      // Appliquer les filtres
      if (filters?.compte_id) {
        query = query.eq('compte_id', filters.compte_id);
      }
      if (filters?.type_mouvement) {
        query = query.eq('type_mouvement', filters.type_mouvement);
      }
      if (filters?.dateFrom) {
        query = query.gte('date_mouvement', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('date_mouvement', filters.dateTo);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Calculer les statistiques
      const mouvements = data || [];
      const debits = mouvements.filter(m => m.type_mouvement === 'debit');
      const credits = mouvements.filter(m => m.type_mouvement === 'credit');

      const totalDebits = debits.reduce((sum, m) => sum + (m.montant || 0), 0);
      const totalCredits = credits.reduce((sum, m) => sum + (m.montant || 0), 0);

      setStats({
        totalDebits,
        totalCredits,
        nombreDebits: debits.length,
        nombreCredits: credits.length,
        nombreMouvements: mouvements.length,
        soldeNet: totalCredits - totalDebits
      });
    } catch (err: any) {
      console.error('Error fetching mouvements stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
      // En cas d'erreur, réinitialiser les stats
      setStats({
        totalDebits: 0,
        totalCredits: 0,
        nombreDebits: 0,
        nombreCredits: 0,
        nombreMouvements: 0,
        soldeNet: 0
      });
    } finally {
      setLoading(false);
    }
  }, [filters?.compte_id, filters?.type_mouvement, filters?.dateFrom, filters?.dateTo]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
};
