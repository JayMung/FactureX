import { History, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useExchangeRateHistory,
    formatRateKeyLabel,
    formatVariation,
    formatHistoryDate
} from '@/hooks/useExchangeRateHistory';

interface ExchangeRateHistoryProps {
    /** Nombre d'entrées à afficher */
    limit?: number;
    /** Afficher ou non le header */
    showHeader?: boolean;
    /** Classe CSS additionnelle */
    className?: string;
}

/**
 * Composant d'affichage de l'historique des taux de change
 * 
 * Affiche un tableau avec les dernières modifications des taux USD/CNY et USD/CDF
 */
export const ExchangeRateHistory = ({
    limit = 15,
    showHeader = true,
    className = ''
}: ExchangeRateHistoryProps) => {
    const { history, isLoading, error, refetch } = useExchangeRateHistory({ limit });

    // Icône de variation
    const VariationIcon = ({ value }: { value: number | null }) => {
        if (value === null) return <Minus className="h-4 w-4 text-gray-400" />;
        if (value > 0) return <TrendingUp className="h-4 w-4 text-emerald-500" />;
        if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
        return <Minus className="h-4 w-4 text-gray-400" />;
    };

    // Badge coloré pour le type de taux
    const RateTypeBadge = ({ rateKey }: { rateKey: string }) => {
        const isCny = rateKey === 'usdToCny';
        return (
            <Badge
                variant="outline"
                className={`${isCny ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-blue-500 text-blue-700 bg-blue-50'}`}
            >
                {formatRateKeyLabel(rateKey)}
            </Badge>
        );
    };

    // État de chargement
    if (isLoading) {
        return (
            <Card className={className}>
                {showHeader && (
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                            <History className="mr-2 h-4 w-4" />
                            Historique des modifications
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center space-x-4">
                                <Skeleton className="h-6 w-24" />
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-32" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    // État d'erreur
    if (error) {
        return (
            <Card className={className}>
                {showHeader && (
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                            <History className="mr-2 h-4 w-4" />
                            Historique des modifications
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>
                    <div className="text-center py-4 text-gray-500">
                        <p>Erreur lors du chargement de l'historique</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="mt-2"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Réessayer
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // État vide
    if (history.length === 0) {
        return (
            <Card className={className}>
                {showHeader && (
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center text-base">
                            <History className="mr-2 h-4 w-4" />
                            Historique des modifications
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>
                    <div className="text-center py-8 text-gray-500">
                        <History className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="font-medium">Aucun historique disponible</p>
                        <p className="text-sm mt-1">
                            Les modifications de taux seront enregistrées automatiquement
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Affichage normal
    return (
        <Card className={className}>
            {showHeader && (
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center text-base">
                            <History className="mr-2 h-4 w-4" />
                            Historique des modifications
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => refetch()}
                            className="h-8 w-8 p-0"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
            )}
            <CardContent className="pt-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-gray-500">
                                <th className="pb-2 font-medium">Date</th>
                                <th className="pb-2 font-medium">Type</th>
                                <th className="pb-2 font-medium text-right">Avant</th>
                                <th className="pb-2 font-medium text-right">Après</th>
                                <th className="pb-2 font-medium text-right">Variation</th>
                                <th className="pb-2 font-medium">Par</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((entry) => {
                                const variation = formatVariation(entry.variation_percent);
                                return (
                                    <tr
                                        key={entry.id}
                                        className="border-b last:border-0 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="py-3 text-gray-600">
                                            {formatHistoryDate(entry.changed_at)}
                                        </td>
                                        <td className="py-3">
                                            <RateTypeBadge rateKey={entry.rate_key} />
                                        </td>
                                        <td className="py-3 text-right font-mono text-gray-500">
                                            {entry.old_value?.toLocaleString('fr-FR', {
                                                minimumFractionDigits: entry.rate_key === 'usdToCny' ? 4 : 2,
                                                maximumFractionDigits: entry.rate_key === 'usdToCny' ? 4 : 2
                                            }) || '-'}
                                        </td>
                                        <td className="py-3 text-right font-mono font-medium">
                                            {entry.new_value.toLocaleString('fr-FR', {
                                                minimumFractionDigits: entry.rate_key === 'usdToCny' ? 4 : 2,
                                                maximumFractionDigits: entry.rate_key === 'usdToCny' ? 4 : 2
                                            })}
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className={`flex items-center justify-end gap-1 ${variation.color}`}>
                                                <VariationIcon value={entry.variation_percent} />
                                                {variation.text}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-600 max-w-[150px] truncate" title={entry.user_name || entry.user_email || 'Système'}>
                                            {entry.user_name || entry.user_email || 'Système'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {history.length >= limit && (
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Affichage des {limit} dernières modifications
                    </p>
                )}
            </CardContent>
        </Card>
    );
};

export default ExchangeRateHistory;
