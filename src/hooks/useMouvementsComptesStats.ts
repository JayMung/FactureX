import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MouvementFilters } from '@/types';

interface MouvementsStats {
  // Real business activity (excludes internal transfers)
  totalDebits: number;      // Real expenses (depense)
  totalCredits: number;     // Real revenues (revenue)
  nombreDebits: number;
  nombreCredits: number;
  nombreMouvements: number;
  soldeNet: number;
  // Internal transfers (informational)
  totalSwapVolume: number;  // Total $ moved via swaps
  totalSwapFees: number;    // Fees paid on swaps
  nombreSwaps: number;
}

/**
 * Hook pour récupérer les statistiques globales des mouvements de comptes
 * - Exclut les swaps des totaux Entrées/Sorties (logique bancaire)
 * - Les swaps sont des transferts internes qui ne changent pas la valeur nette
 * - Seuls les frais de swap impactent le solde
 */
export const useMouvementsComptesStats = (filters?: MouvementFilters) => {
  const [stats, setStats] = useState<MouvementsStats>({
    totalDebits: 0,
    totalCredits: 0,
    nombreDebits: 0,
    nombreCredits: 0,
    nombreMouvements: 0,
    soldeNet: 0,
    totalSwapVolume: 0,
    totalSwapFees: 0,
    nombreSwaps: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
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

      // Construct query with account info AND transaction type
      let query = supabase
        .from('mouvements_comptes')
        .select(`
          type_mouvement,
          montant,
          compte:comptes_financiers!compte_id(devise),
          transaction:transactions!transaction_id(type_transaction, frais)
        `);

      // Apply filters
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

      // Helper function to convert amount to USD
      const convertToUSD = (montant: number, devise: string): number => {
        if (devise === 'USD') return montant;
        if (devise === 'CNY') return montant / rates.usdToCny;
        if (devise === 'CDF') return montant / rates.usdToCdf;
        return montant;
      };

      const mouvements = data || [];

      // Separate swaps from real transactions
      const swapMouvements = mouvements.filter(m =>
        (m.transaction as any)?.type_transaction === 'transfert'
      );
      const realMouvements = mouvements.filter(m =>
        (m.transaction as any)?.type_transaction !== 'transfert'
      );

      // Calculate REAL debits (expenses only, not swaps)
      const realDebits = realMouvements.filter(m => m.type_mouvement === 'debit');
      const totalDebits = realDebits.reduce((sum, m) => {
        const devise = (m.compte as any)?.devise || 'USD';
        return sum + convertToUSD(m.montant || 0, devise);
      }, 0);

      // Calculate REAL credits (revenues only, not swaps)
      const realCredits = realMouvements.filter(m => m.type_mouvement === 'credit');
      const totalCredits = realCredits.reduce((sum, m) => {
        const devise = (m.compte as any)?.devise || 'USD';
        return sum + convertToUSD(m.montant || 0, devise);
      }, 0);

      // Calculate swap statistics (informational only)
      // Only count the debit side to avoid double-counting
      const swapDebits = swapMouvements.filter(m => m.type_mouvement === 'debit');
      const totalSwapVolume = swapDebits.reduce((sum, m) => {
        const devise = (m.compte as any)?.devise || 'USD';
        return sum + convertToUSD(m.montant || 0, devise);
      }, 0);

      // Calculate total swap fees (from transaction.frais)
      const seenTransactions = new Set<string>();
      let totalSwapFees = 0;
      swapMouvements.forEach(m => {
        const txId = (m as any).transaction_id;
        if (txId && !seenTransactions.has(txId)) {
          seenTransactions.add(txId);
          totalSwapFees += (m.transaction as any)?.frais || 0;
        }
      });

      // Fetch actual account balances for the real solde net
      const { data: comptes } = await supabase
        .from('comptes_financiers')
        .select('solde_actuel, devise')
        .eq('is_active', true);

      const soldeGlobal = (comptes || []).reduce((sum, c) => {
        return sum + convertToUSD(c.solde_actuel || 0, c.devise || 'USD');
      }, 0);

      setStats({
        totalDebits,
        totalCredits,
        nombreDebits: realDebits.length,
        nombreCredits: realCredits.length,
        nombreMouvements: mouvements.length,
        soldeNet: soldeGlobal, // Real balance across all accounts
        totalSwapVolume,
        totalSwapFees,
        nombreSwaps: swapDebits.length
      });
    } catch (err: any) {
      console.error('Error fetching mouvements stats:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
      setStats({
        totalDebits: 0,
        totalCredits: 0,
        nombreDebits: 0,
        nombreCredits: 0,
        nombreMouvements: 0,
        soldeNet: 0,
        totalSwapVolume: 0,
        totalSwapFees: 0,
        nombreSwaps: 0
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

