import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears } from 'date-fns';

export type PeriodFilter = 'day' | 'week' | 'month' | 'year';

interface FinanceStats {
    totalRevenue: number;
    totalDepenses: number;
    totalTransferts: number;
    soldeNet: number;
    revenueChange: number;
    depensesChange: number;
    transactionsCount: number;
}

interface DateRange {
    start: Date;
    end: Date;
}

const getDateRange = (period: PeriodFilter): { current: DateRange; previous: DateRange } => {
    const now = new Date();

    switch (period) {
        case 'day':
            return {
                current: { start: startOfDay(now), end: endOfDay(now) },
                previous: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
            };
        case 'week':
            return {
                current: { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
                previous: { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) }
            };
        case 'month':
            return {
                current: { start: startOfMonth(now), end: endOfMonth(now) },
                previous: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
            };
        case 'year':
            return {
                current: { start: startOfYear(now), end: endOfYear(now) },
                previous: { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) }
            };
        default:
            return {
                current: { start: startOfMonth(now), end: endOfMonth(now) },
                previous: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
            };
    }
};

const getPeriodLabel = (period: PeriodFilter): string => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

    switch (period) {
        case 'day':
            return now.toLocaleDateString('fr-FR', options);
        case 'week':
            const weekStart = startOfWeek(now, { weekStartsOn: 1 });
            const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
            return `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('fr-FR', options)}`;
        case 'month':
            return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
        case 'year':
            return now.getFullYear().toString();
        default:
            return '';
    }
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
                // Fetch transactions for current period
                const { data: currentData, error: currentError } = await supabase
                    .from('transactions')
                    .select('montant, type_operation, motif, devise')
                    .gte('created_at', currentRange.start.toISOString())
                    .lte('created_at', currentRange.end.toISOString());

                if (currentError) throw currentError;

                // Fetch transactions for previous period
                const { data: previousData, error: previousError } = await supabase
                    .from('transactions')
                    .select('montant, type_operation, motif')
                    .gte('created_at', previousRange.start.toISOString())
                    .lte('created_at', previousRange.end.toISOString());

                if (previousError) throw previousError;

                // Calculate current stats
                let currentRevenue = 0;
                let currentDepenses = 0;
                let currentTransferts = 0;

                (currentData || []).forEach(t => {
                    const montant = Math.abs(t.montant || 0);
                    if (t.type_operation === 'entree' || t.motif === 'Encaissement' || t.motif === 'Commande') {
                        currentRevenue += montant;
                    } else if (t.type_operation === 'sortie' || t.motif === 'Depense') {
                        currentDepenses += montant;
                    } else if (t.motif === 'Transfert' || t.motif === 'Swap') {
                        currentTransferts += montant;
                    }
                });

                // Calculate previous stats
                let previousRevenue = 0;
                let previousDepenses = 0;

                (previousData || []).forEach(t => {
                    const montant = Math.abs(t.montant || 0);
                    if (t.type_operation === 'entree' || t.motif === 'Encaissement' || t.motif === 'Commande') {
                        previousRevenue += montant;
                    } else if (t.type_operation === 'sortie' || t.motif === 'Depense') {
                        previousDepenses += montant;
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
                    transactionsCount: (currentData || []).length
                });
            } catch (err: any) {
                console.error('Error fetching finance stats:', err);
                setError(err.message || 'Erreur lors du chargement des statistiques');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [currentRange, previousRange]);

    return {
        stats,
        isLoading,
        error,
        periodLabel,
        dateRange: currentRange
    };
};

export default useFinanceStatsByPeriod;
