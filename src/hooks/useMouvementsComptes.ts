import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MouvementCompte, MouvementFilters, PaginatedResponse } from '@/types';

const PAGE_SIZE = 20;

export const useMouvementsComptes = (page: number = 1, filters: MouvementFilters = {}) => {
  const [mouvements, setMouvements] = useState<MouvementCompte[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<MouvementCompte> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMouvements = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate offset for pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Build query
      let query = supabase
        .from('mouvements_comptes')
        .select(`
          *,
          compte:comptes_financiers(id, nom, type_compte, devise),
          transaction:transactions(id, motif, type_transaction)
        `, { count: 'exact' })
        .order('date_mouvement', { ascending: false })
        .range(from, to);

      // Apply filters
      if (filters.compte_id) {
        query = query.eq('compte_id', filters.compte_id);
      }
      if (filters.type_mouvement) {
        query = query.eq('type_mouvement', filters.type_mouvement);
      }
      if (filters.dateFrom) {
        query = query.gte('date_mouvement', filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte('date_mouvement', filters.dateTo);
      }

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setMouvements(data || []);

      if (count !== null) {
        setPagination({
          data: data || [],
          count,
          page,
          pageSize: PAGE_SIZE,
          totalPages: Math.ceil(count / PAGE_SIZE)
        });
      }
    } catch (err: any) {
      console.error('Error fetching mouvements:', err);
      setError(err.message || 'Erreur lors du chargement des mouvements');
    } finally {
      setIsLoading(false);
    }
  }, [page, filters.compte_id, filters.type_mouvement, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    fetchMouvements();
  }, [fetchMouvements]);

  return {
    mouvements,
    pagination,
    isLoading,
    error,
    refetch: fetchMouvements
  };
};

// Hook to get mouvements for a specific compte
export const useCompteMouvements = (compteId: string, limit: number = 10) => {
  const [mouvements, setMouvements] = useState<MouvementCompte[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMouvements = useCallback(async () => {
    if (!compteId) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('mouvements_comptes')
        .select(`
          *,
          transaction:transactions(id, motif, type_transaction, client_id)
        `)
        .eq('compte_id', compteId)
        .order('date_mouvement', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setMouvements(data || []);
    } catch (err: any) {
      console.error('Error fetching compte mouvements:', err);
      setError(err.message || 'Erreur lors du chargement des mouvements');
    } finally {
      setIsLoading(false);
    }
  }, [compteId, limit]);

  useEffect(() => {
    fetchMouvements();
  }, [fetchMouvements]);

  return {
    mouvements,
    isLoading,
    error,
    refetch: fetchMouvements
  };
};

// Hook to get statistics for a compte
export const useCompteStats = (compteId: string) => {
  const [stats, setStats] = useState({
    totalDebits: 0,
    totalCredits: 0,
    nombreDebits: 0,
    nombreCredits: 0,
    soldeActuel: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!compteId) return;

      try {
        setIsLoading(true);

        // Get all mouvements for this compte
        const { data: mouvements } = await supabase
          .from('mouvements_comptes')
          .select('type_mouvement, montant, solde_apres')
          .eq('compte_id', compteId);

        if (mouvements) {
          const debits = mouvements.filter(m => m.type_mouvement === 'debit');
          const credits = mouvements.filter(m => m.type_mouvement === 'credit');

          setStats({
            totalDebits: debits.reduce((sum, m) => sum + m.montant, 0),
            totalCredits: credits.reduce((sum, m) => sum + m.montant, 0),
            nombreDebits: debits.length,
            nombreCredits: credits.length,
            soldeActuel: mouvements.length > 0 ? mouvements[0].solde_apres : 0
          });
        }
      } catch (err) {
        console.error('Error fetching compte stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [compteId]);

  return { stats, isLoading };
};
