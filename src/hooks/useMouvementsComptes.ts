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
        .order('created_at', { ascending: false })
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

      // Si pas de filtre de compte, calculer le solde global cumulé
      let mouvementsWithGlobalSolde = data || [];

      if (!filters.compte_id && data && data.length > 0) {
        // Fetch exchange rates from settings
        const { data: settingsData } = await supabase
          .from('settings')
          .select('cle, valeur')
          .eq('categorie', 'taux_change')
          .in('cle', ['usdToCny', 'usdToCdf']);

        const rates: Record<string, number> = { usdToCny: 6.95, usdToCdf: 2200 };
        settingsData?.forEach((s: any) => {
          rates[s.cle] = parseFloat(s.valeur) || rates[s.cle];
        });

        // Helper function to convert amount to USD
        const convertToUSD = (montant: number, devise: string): number => {
          if (devise === 'USD') return montant;
          if (devise === 'CNY') return montant / rates.usdToCny;
          if (devise === 'CDF') return montant / rates.usdToCdf;
          return montant;
        };

        // Récupérer TOUS les mouvements pour calculer le solde global (avec devise du compte)
        const { data: allMouvements } = await supabase
          .from('mouvements_comptes')
          .select(`
            id, date_mouvement, created_at, type_mouvement, montant,
            compte:comptes_financiers!compte_id(devise)
          `)
          .order('date_mouvement', { ascending: true })
          .order('created_at', { ascending: true });

        if (allMouvements) {
          // Calculer le solde global cumulé pour chaque mouvement (converted to USD)
          let soldeGlobal = 0;
          const soldesMap = new Map<string, number>();

          allMouvements.forEach(m => {
            const devise = (m.compte as any)?.devise || 'USD';
            const montantUSD = convertToUSD(m.montant || 0, devise);

            if (m.type_mouvement === 'credit') {
              soldeGlobal += montantUSD;
            } else {
              soldeGlobal -= montantUSD;
            }
            soldesMap.set(m.id, soldeGlobal);
          });

          // Appliquer le solde global aux mouvements paginés
          mouvementsWithGlobalSolde = data.map(m => ({
            ...m,
            solde_global: soldesMap.get(m.id) || m.solde_apres
          }));
        }
      }


      setMouvements(mouvementsWithGlobalSolde);

      if (count !== null) {
        setPagination({
          data: mouvementsWithGlobalSolde,
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

// Hook to get mouvements for a specific compte with pagination
export const useCompteMouvements = (compteId: string, limit: number = 10, page: number = 1) => {
  const [mouvements, setMouvements] = useState<MouvementCompte[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchMouvements = useCallback(async () => {
    if (!compteId) return;

    try {
      setIsLoading(true);
      setError(null);

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error: fetchError, count } = await supabase
        .from('mouvements_comptes')
        .select(`
          *,
          transaction:transactions(id, motif, type_transaction, client_id)
        `, { count: 'exact' })
        .eq('compte_id', compteId)
        .order('date_mouvement', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      setMouvements(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error('Error fetching compte mouvements:', err);
      setError(err.message || 'Erreur lors du chargement des mouvements');
    } finally {
      setIsLoading(false);
    }
  }, [compteId, limit, page]);

  useEffect(() => {
    fetchMouvements();
  }, [fetchMouvements]);

  return {
    mouvements,
    isLoading,
    error,
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
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

        // Get the compte to get the actual current balance
        const { data: compte } = await supabase
          .from('comptes_financiers')
          .select('solde_actuel')
          .eq('id', compteId)
          .single();

        // Get all mouvements for this compte
        const { data: mouvements } = await supabase
          .from('mouvements_comptes')
          .select('type_mouvement, montant, solde_apres, date_mouvement, created_at')
          .eq('compte_id', compteId)
          .order('date_mouvement', { ascending: false })
          .order('created_at', { ascending: false });

        if (mouvements) {
          const debits = mouvements.filter(m => m.type_mouvement === 'debit');
          const credits = mouvements.filter(m => m.type_mouvement === 'credit');

          // Use the actual compte balance instead of last mouvement's solde_apres
          // This ensures we include the initial balance even if no mouvements exist
          const soldeActuel = compte?.solde_actuel || 0;

          setStats({
            totalDebits: debits.reduce((sum, m) => sum + m.montant, 0),
            totalCredits: credits.reduce((sum, m) => sum + m.montant, 0),
            nombreDebits: debits.length,
            nombreCredits: credits.length,
            soldeActuel: soldeActuel
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

// Hook to get global balance across all comptes
// Excludes swaps from credits/debits (they are internal transfers)
export const useGlobalBalance = () => {
  const [balance, setBalance] = useState({
    totalCredits: 0,
    totalDebits: 0,
    soldeNet: 0,
    nombreComptes: 0,
    totalSwapVolume: 0,
    totalSwapFees: 0,
    nombreSwaps: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalBalance = async () => {
      try {
        setIsLoading(true);

        // Fetch exchange rates from settings
        const { data: settingsData } = await supabase
          .from('settings')
          .select('cle, valeur')
          .eq('categorie', 'taux_change')
          .in('cle', ['usdToCny', 'usdToCdf']);

        const rates: Record<string, number> = { usdToCny: 6.95, usdToCdf: 2200 };
        settingsData?.forEach((s: any) => {
          rates[s.cle] = parseFloat(s.valeur) || rates[s.cle];
        });

        // Helper function to convert amount to USD
        const convertToUSD = (montant: number, devise: string): number => {
          if (devise === 'USD') return montant;
          if (devise === 'CNY') return montant / rates.usdToCny;
          if (devise === 'CDF') return montant / rates.usdToCdf;
          return montant;
        };

        // Get all comptes with their current balance
        const { data: comptes } = await supabase
          .from('comptes_financiers')
          .select('id, nom, solde_actuel, devise');

        if (comptes) {
          // Sum all balances (convert to USD)
          const totalSolde = comptes.reduce((sum, compte) => {
            const soldeUSD = convertToUSD(compte.solde_actuel || 0, compte.devise || 'USD');
            return sum + soldeUSD;
          }, 0);

          // Get mouvements with transaction type to exclude swaps
          const { data: mouvements } = await supabase
            .from('mouvements_comptes')
            .select(`
              type_mouvement,
              montant,
              compte:comptes_financiers!compte_id(devise),
              transaction:transactions!transaction_id(type_transaction, frais)
            `);

          let totalCredits = 0;
          let totalDebits = 0;
          let totalSwapVolume = 0;
          let totalSwapFees = 0;
          const seenSwapTransactions = new Set<string>();

          if (mouvements) {
            mouvements.forEach(m => {
              const devise = (m.compte as any)?.devise || 'USD';
              const montantUSD = convertToUSD(m.montant || 0, devise);
              const isSwap = (m.transaction as any)?.type_transaction === 'transfert';

              if (isSwap) {
                // Only count debit side for swap volume
                if (m.type_mouvement === 'debit') {
                  totalSwapVolume += montantUSD;

                  // Track swap fees (avoid double counting)
                  const txId = (m as any).transaction_id;
                  if (txId && !seenSwapTransactions.has(txId)) {
                    seenSwapTransactions.add(txId);
                    totalSwapFees += (m.transaction as any)?.frais || 0;
                  }
                }
              } else {
                // Real transactions (not swaps)
                if (m.type_mouvement === 'credit') {
                  totalCredits += montantUSD;
                } else {
                  totalDebits += montantUSD;
                }
              }
            });
          }

          setBalance({
            totalCredits,
            totalDebits,
            soldeNet: totalSolde,
            nombreComptes: comptes.length,
            totalSwapVolume,
            totalSwapFees,
            nombreSwaps: seenSwapTransactions.size
          });
        }
      } catch (err) {
        console.error('Error fetching global balance:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGlobalBalance();
  }, []);

  return { balance, isLoading };
};

// P7: Hook to compare current month solde vs previous month for trend indicator
export const useCompteTrend = (compteId: string, soldeActuel: number) => {
  const [trend, setTrend] = useState<{ diff: number; pct: number; direction: 'up' | 'down' | 'flat' } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!compteId) return;
    const fetch = async () => {
      try {
        setIsLoading(true);
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

        // Get the last mouvement before start of current month = solde fin du mois précédent
        const { data } = await supabase
          .from('mouvements_comptes')
          .select('solde_apres, date_mouvement')
          .eq('compte_id', compteId)
          .gte('date_mouvement', startOfPrevMonth)
          .lte('date_mouvement', endOfPrevMonth)
          .order('date_mouvement', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const soldePrevMonth = data[0].solde_apres;
          const diff = soldeActuel - soldePrevMonth;
          const pct = soldePrevMonth !== 0 ? (diff / Math.abs(soldePrevMonth)) * 100 : 0;
          setTrend({
            diff,
            pct,
            direction: diff > 0.01 ? 'up' : diff < -0.01 ? 'down' : 'flat'
          });
        } else {
          setTrend({ diff: 0, pct: 0, direction: 'flat' });
        }
      } catch (err) {
        console.error('Error fetching trend:', err);
        setTrend(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [compteId, soldeActuel]);

  return { trend, isLoading };
};

// P14: Hook to get daily net flux over last 30 days for sparkline
export const useCompteSparkline = (compteId: string, devise: string = 'USD') => {
  const [points, setPoints] = useState<Array<{ day: string; net: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!compteId) return;
    const fetch = async () => {
      try {
        setIsLoading(true);
        const since = new Date();
        since.setDate(since.getDate() - 29);
        since.setHours(0, 0, 0, 0);

        const { data } = await supabase
          .from('mouvements_comptes')
          .select('type_mouvement, montant, date_mouvement')
          .eq('compte_id', compteId)
          .gte('date_mouvement', since.toISOString())
          .order('date_mouvement', { ascending: true });

        // Build a map of day → net
        const dayMap: Record<string, number> = {};
        for (let i = 0; i < 30; i++) {
          const d = new Date(since);
          d.setDate(d.getDate() + i);
          dayMap[d.toISOString().slice(0, 10)] = 0;
        }

        data?.forEach(m => {
          const day = m.date_mouvement.slice(0, 10);
          if (day in dayMap) {
            dayMap[day] += m.type_mouvement === 'credit' ? m.montant : -m.montant;
          }
        });

        setPoints(Object.entries(dayMap).map(([day, net]) => ({ day, net })));
      } catch (err) {
        console.error('Error fetching sparkline:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [compteId]);

  return { points, isLoading };
};


