import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Représente une entrée dans l'historique des taux de change
 */
export interface ExchangeRateHistoryEntry {
    id: string;
    rate_key: 'usdToCny' | 'usdToCdf';
    old_value: number | null;
    new_value: number;
    changed_at: string;
    changed_by: string | null;
    user_email: string | null;
    user_name: string | null;
    variation_percent: number | null;
}

/**
 * Options pour le hook useExchangeRateHistory
 */
export interface UseExchangeRateHistoryOptions {
    /** Nombre maximum d'entrées à récupérer */
    limit?: number;
    /** Offset pour pagination */
    offset?: number;
    /** Filtrer par type de taux */
    rateKey?: 'usdToCny' | 'usdToCdf' | null;
    /** Activer/désactiver la requête */
    enabled?: boolean;
}

/**
 * Hook pour récupérer l'historique des modifications des taux de change
 * 
 * @example
 * ```tsx
 * const { history, isLoading, error } = useExchangeRateHistory({ limit: 10 });
 * 
 * return (
 *   <table>
 *     {history.map(entry => (
 *       <tr key={entry.id}>
 *         <td>{entry.rate_key}</td>
 *         <td>{entry.old_value} → {entry.new_value}</td>
 *       </tr>
 *     ))}
 *   </table>
 * );
 * ```
 */
export const useExchangeRateHistory = (options: UseExchangeRateHistoryOptions = {}) => {
    const {
        limit = 20,
        offset = 0,
        rateKey = null,
        enabled = true
    } = options;

    const query = useQuery({
        queryKey: ['exchangeRateHistory', limit, offset, rateKey],
        queryFn: async (): Promise<ExchangeRateHistoryEntry[]> => {
            // Utiliser la fonction RPC pour récupérer l'historique
            const { data, error } = await supabase.rpc('get_exchange_rate_history', {
                p_limit: limit,
                p_offset: offset,
                p_rate_key: rateKey
            });

            if (error) {
                console.error('Error fetching exchange rate history:', error);
                throw error;
            }

            return (data || []) as ExchangeRateHistoryEntry[];
        },
        enabled,
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: false
    });

    return {
        history: query.data || [],
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch
    };
};

/**
 * Formatte une entrée d'historique pour affichage
 */
export const formatRateKeyLabel = (rateKey: string): string => {
    switch (rateKey) {
        case 'usdToCny':
            return 'USD → CNY';
        case 'usdToCdf':
            return 'USD → CDF';
        default:
            return rateKey;
    }
};

/**
 * Formatte une variation en pourcentage avec signe et couleur
 */
export const formatVariation = (variation: number | null): { text: string; color: string } => {
    if (variation === null || variation === undefined) {
        return { text: '-', color: 'text-gray-500' };
    }

    const sign = variation >= 0 ? '+' : '';
    const color = variation > 0 ? 'text-emerald-600' : variation < 0 ? 'text-red-600' : 'text-gray-500';

    return {
        text: `${sign}${variation.toFixed(2)}%`,
        color
    };
};

/**
 * Formatte la date en format français lisible
 */
export const formatHistoryDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};

export default useExchangeRateHistory;
