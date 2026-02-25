import React from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { useCompteSparkline } from '@/hooks/useMouvementsComptes';

interface SparklineChartProps {
  compteId: string;
  devise: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value as number;
  return (
    <div className="bg-gray-900 text-white text-[10px] px-2 py-1 rounded shadow">
      {val >= 0 ? '+' : ''}{val.toFixed(2)}
    </div>
  );
};

export const SparklineChart: React.FC<SparklineChartProps> = ({ compteId, devise }) => {
  const { points, isLoading } = useCompteSparkline(compteId, devise);

  if (isLoading) {
    return <div className="h-10 w-24 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />;
  }

  if (!points.length) return null;

  const hasPositive = points.some(p => p.net > 0);
  const hasNegative = points.some(p => p.net < 0);
  const color = hasNegative && !hasPositive ? '#ef4444' : hasPositive ? '#10b981' : '#6b7280';

  return (
    <div className="h-10 w-28" title="Flux net 30 derniers jours">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={`spark-${compteId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="net"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#spark-${compteId})`}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
