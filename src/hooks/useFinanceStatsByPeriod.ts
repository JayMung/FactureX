import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getDateRange, getPeriodLabel, PeriodFilter } from '@/utils/dateUtils';
import { useExchangeRates } from './useSettings';

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

    if (typeTransaction === 'depense') {
        return { type: 'depense', montant, benefice };
    }
    if (typeTransaction === 'revenue') {
        return { type: 'revenue', montant, benefice };
    }

    // Legacy support
    if (typeTransaction === 'transfert') {
        return { type: 'revenue', montant, benefice };
    }

    // Legacy fallback based on strings
    if (EXPENSE_MOTIFS.some(m => motif.includes(m.toLowerCase())) ||
        typeTransaction === 'sortie') {
        return { type: 'depense', montant, benefice };
    }

    if (INTERNAL_TRANSFER_MOTIFS.some(m => motif.includes(m.toLowerCase())) ||
        typeTransaction === 'swap') {
        return { type: 'transfert', montant, benefice };
    }

    return { type: 'revenue', montant, benefice };
};

export const useFinanceStatsByPeriod = (period: PeriodFilter = 'month') => {
    const [stats, setStats] = useState<FinanceStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { current: currentRange, previous: previousRange } = useMemo(() => getDateRange(period), [period]);
    const periodLabel = useMemo(() => getPeriodLabel(period), [period]);

    // Get exchange rates for conversion
    const { rates, isLoading: ratesLoading } = useExchangeRates();

    useEffect(() => {
        const fetchStats = async () => {
            // Wait for rates to be available
            if (ratesLoading) return;

            setIsLoading(true);
            setError(null);

            try {
                // Fetch transactions for current period
                const { data: currentData, error: currentError } = await supabase
                    .from('transactions')
                    .select('montant, motif, type_transaction, devise, benefice, categorie')
                    .gte('created_at', currentRange.start.toISOString())
                    .lte('created_at', currentRange.end.toISOString());

                if (currentError) throw currentError;

                // Fetch transactions for previous period
                const { data: previousData, error: previousError } = await supabase
                    .from('transactions')
                    .select('montant, motif, type_transaction, devise, benefice, categorie')
                    .gte('created_at', previousRange.start.toISOString())
                    .lte('created_at', previousRange.end.toISOString());

                if (previousError) throw previousError;

                // Helper for conversion
                const convertToUsd = (amount: number, currency: string) => {
                    if (!amount) return 0;
                    if (currency === 'CDF' && rates?.usdToCdf) {
                        return amount / rates.usdToCdf;
                    }
                    if (currency === 'CNY' && rates?.usdToCny) {
                        return amount / rates.usdToCny;
                    }
                    return amount; // Default USD
                };

                // Calculate current stats
                let currentRevenue = 0;
                let currentDepenses = 0;
                let currentTransferts = 0;
                let totalBenefice = 0;

                (currentData || []).forEach(t => {
                    const classified = classifyTransaction(t);
                    const amountUSD = convertToUsd(classified.montant, t.devise || 'USD');
                    const beneficeUSD = convertToUsd(classified.benefice, t.devise || 'USD'); // Assuming benefice is same currency as transaction

                    if (classified.type === 'revenue') {
                        currentRevenue += amountUSD;
                        totalBenefice += beneficeUSD;
                    } else if (classified.type === 'depense') {
                        currentDepenses += amountUSD;
                    } else if (classified.type === 'transfert') {
                        currentTransferts += amountUSD;
                    }
                });

                // Calculate previous stats
                let previousRevenue = 0;
                let previousDepenses = 0;

                (previousData || []).forEach(t => {
                    const classified = classifyTransaction(t);
                    const amountUSD = convertToUsd(classified.montant, t.devise || 'USD');

                    if (classified.type === 'revenue') {
                        previousRevenue += amountUSD;
                    } else if (classified.type === 'depense') {
                        previousDepenses += amountUSD;
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

        if (!ratesLoading) {
            fetchStats();
        }
    }, [currentRange, previousRange, period, rates, ratesLoading]);

    return {
        stats,
        transactions: stats?.transactions || [],
        isLoading: isLoading || ratesLoading,
        error,
        periodLabel,
        dateRange: currentRange
    };
};

export default useFinanceStatsByPeriod;
