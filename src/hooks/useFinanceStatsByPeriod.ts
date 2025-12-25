import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDateRange, getPeriodLabel, PeriodFilter } from '@/utils/dateUtils';
export type { PeriodFilter };

interface FinanceStats {
    totalRevenue: number;
    totalDepenses: number;
    totalTransferts: number;
    soldeNet: number;
    revenueChange: number;
    depensesChange: number;
    transactionsCount: number;
    transactions: any[];
}

// Motifs de revenus (entrées d'argent - paiements clients)
const REVENUE_MOTIFS = [
    'Commande (Facture)',
    'Transfert (Argent)',    // Paiement transfert = REVENU
    'Transfert Reçu',        // Paiement transfert = REVENU
    'Autres Paiements',
    'Encaissement',
    'Commande',              // Legacy
    'Transfert',             // Legacy transfert = revenu
    'Paiement Colis'
];

// Motifs de dépenses (sorties d'argent)
const EXPENSE_MOTIFS = [
    'Depense',
    'Dépense',
    'depense',
    'Achat',
    'Sortie'
];

// Motifs de transferts INTERNES (échanges entre comptes seulement)
const INTERNAL_TRANSFER_MOTIFS = [
    'Swap'  // Uniquement les swaps entre comptes
];


const classifyTransaction = (t: { montant?: number; motif?: string; type_transaction?: string; benefice?: number }) => {
    const montant = Math.abs(t.montant || 0);
    const motif = (t.motif || '').toLowerCase();
    const typeTransaction = (t.type_transaction || '').toLowerCase();
    const benefice = t.benefice || 0;

    // Check for expenses first
    if (EXPENSE_MOTIFS.some(m => motif.includes(m.toLowerCase())) ||
        typeTransaction === 'depense' ||
        typeTransaction === 'sortie') {
        return { type: 'depense', montant, benefice };
    }

    // Check for INTERNAL swaps ONLY (not regular transfers which are revenue)
    if (INTERNAL_TRANSFER_MOTIFS.some(m => motif.includes(m.toLowerCase())) ||
        typeTransaction === 'swap') {
        return { type: 'transfert', montant, benefice };
    }

    // Check for revenue (includes Transfert payments which are client payments)
    if (REVENUE_MOTIFS.some(m => motif.includes(m.toLowerCase())) ||
        typeTransaction === 'commande' ||
        typeTransaction === 'entree' ||
        typeTransaction === 'commercial' ||
        typeTransaction === 'paiement' ||
        typeTransaction === 'transfert') {  // transfert type = revenue
        return { type: 'revenue', montant, benefice };
    }

    // Default: treat as revenue
    return { type: 'revenue', montant, benefice };
};

export const useFinanceStatsByPeriod = (period: PeriodFilter = 'month') => {
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { current: currentRange, previous: previousRange } = useMemo(() => getDateRange(period), [period]);
    const periodLabel = useMemo(() => getPeriodLabel(period), [period]);

    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            setError(null);

            try {
                console.log('📊 Fetching finance stats for period:', period);
                console.log('📅 Date range:', currentRange.start.toISOString(), 'to', currentRange.end.toISOString());

                // Fetch transactions for current period
                const { data: currentData, error: currentError } = await supabase
                    .from('transactions')
                    .select('montant, motif, type_transaction, devise, benefice')
                    .gte('created_at', currentRange.start.toISOString())
                    .lte('created_at', currentRange.end.toISOString());

                if (currentError) {
                    console.error('❌ Error fetching current data:', currentError);
                    throw currentError;
                }

                console.log('📦 Current period transactions:', currentData?.length || 0);
                if (currentData?.length) {
                    console.log('📋 Sample transaction:', currentData[0]);
                }

                // Fetch transactions for previous period
                const { data: previousData, error: previousError } = await supabase
                    .from('transactions')
                    .select('montant, motif, type_transaction, devise, benefice')
                    .gte('created_at', previousRange.start.toISOString())
                    .lte('created_at', previousRange.end.toISOString());

                if (previousError) {
                    console.error('❌ Error fetching previous data:', previousError);
                    throw previousError;
                }

                // Calculate current stats
                let currentRevenue = 0;
                let currentDepenses = 0;
                let currentTransferts = 0;
                let totalBenefice = 0;

                (currentData || []).forEach(t => {
                    const classified = classifyTransaction(t);

                    if (classified.type === 'revenue') {
                        currentRevenue += classified.montant;
                        totalBenefice += classified.benefice;
                    } else if (classified.type === 'depense') {
                        currentDepenses += classified.montant;
                    } else if (classified.type === 'transfert') {
                        currentTransferts += classified.montant;
                    }
                });

                console.log('💰 Calculated:', { currentRevenue, currentDepenses, currentTransferts, totalBenefice });

                // Calculate previous stats
                let previousRevenue = 0;
                let previousDepenses = 0;

                (previousData || []).forEach(t => {
                    const classified = classifyTransaction(t);

                    if (classified.type === 'revenue') {
                        previousRevenue += classified.montant;
                    } else if (classified.type === 'depense') {
                        previousDepenses += classified.montant;
                    }
                });

                // Calculate percentage changes
                const revenueChange = previousRevenue > 0
                    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100 * 10) / 10
                    : 0;
                const depensesChange = previousDepenses > 0
                    ? Math.round(((currentDepenses - previousDepenses) / previousDepenses) * 100 * 10) / 10
                    : 0;

                setStats({
                    totalRevenue: currentRevenue,
                    totalDepenses: currentDepenses,
                    totalTransferts: currentTransferts,
                    soldeNet: currentRevenue - currentDepenses,
                    revenueChange,
                    depensesChange,
                    transactionsCount: (currentData || []).length,
                    transactions: currentData || []
                });
            } catch (err: any) {
                console.error('❌ Error fetching finance stats:', err);
                setError(err.message || 'Erreur lors du chargement des statistiques');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [currentRange, previousRange, period]);

    return {
        stats,
        transactions: stats?.transactions || [],
        isLoading,
        error,
        periodLabel,
        dateRange: currentRange
    };
};

export default useFinanceStatsByPeriod;
