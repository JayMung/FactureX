import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OperationsStats {
  totalDepenses: number;
  totalRevenus: number;
  nombreDepenses: number;
  nombreRevenus: number;
  nombreOperations: number;
}

/**
 * Hook pour récupérer les statistiques globales des opérations financières
 * (dépenses et revenus) sans pagination
 */
export const useOperationsFinancieres = () => {
  const [stats, setStats] = useState<OperationsStats>({
    totalDepenses: 0,
    totalRevenus: 0,
    nombreDepenses: 0,
    nombreRevenus: 0,
    nombreOperations: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Récupérer TOUTES les opérations financières (depense et revenue) sans pagination
      const { data, error: queryError } = await supabase
        .from('transactions')
        .select('type_transaction, montant, devise')
        .in('type_transaction', ['depense', 'revenue']);

      if (queryError) throw queryError;

      // Calculer les statistiques
      const operations = data || [];
      const depenses = operations.filter(op => op.type_transaction === 'depense');
      const revenus = operations.filter(op => op.type_transaction === 'revenue');

      // Calculer les totaux (convertir tout en USD pour simplifier)
      // Note: Pour une meilleure précision, il faudrait récupérer le taux de change
      const totalDepenses = depenses.reduce((sum, op) => {
        // Pour l'instant, on suppose que tout est en USD
        // Si besoin de conversion CDF->USD, ajouter la logique ici
        return sum + (op.montant || 0);
      }, 0);

      const totalRevenus = revenus.reduce((sum, op) => {
        return sum + (op.montant || 0);
      }, 0);

      setStats({
        totalDepenses,
        totalRevenus,
        nombreDepenses: depenses.length,
        nombreRevenus: revenus.length,
        nombreOperations: operations.length
      });
    } catch (err: any) {
      console.error('Error fetching operations stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
      // En cas d'erreur, réinitialiser les stats
      setStats({
        totalDepenses: 0,
        totalRevenus: 0,
        nombreDepenses: 0,
        nombreRevenus: 0,
        nombreOperations: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

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
