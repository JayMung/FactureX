import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCompteTrend } from '@/hooks/useMouvementsComptes';
import { formatCurrency } from '@/utils/formatCurrency';

interface TrendBadgeProps {
  compteId: string;
  soldeActuel: number;
  devise: string;
  variant?: 'card' | 'inline';
}

export const TrendBadge: React.FC<TrendBadgeProps> = ({ compteId, soldeActuel, devise, variant = 'card' }) => {
  const { trend, isLoading } = useCompteTrend(compteId, soldeActuel);

  if (isLoading) {
    return <span className="h-4 w-16 bg-white/20 animate-pulse rounded inline-block" />;
  }

  if (!trend || trend.direction === 'flat') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${variant === 'card' ? 'text-white/60' : 'text-gray-400'}`}>
        <Minus className="h-3 w-3" />
        Stable
      </span>
    );
  }

  const isUp = trend.direction === 'up';
  const pct = Math.abs(trend.pct).toFixed(1);

  if (variant === 'card') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${
        isUp ? 'bg-white/20 text-white' : 'bg-black/20 text-white/80'
      }`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isUp ? '+' : '-'}{pct}% vs mois préc.
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
      isUp ? 'text-green-600' : 'text-red-600'
    }`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? '+' : ''}{formatCurrency(trend.diff, devise)} ({isUp ? '+' : ''}{trend.pct.toFixed(1)}%)
    </span>
  );
};
