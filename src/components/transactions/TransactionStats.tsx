import React from 'react';
import { KpiCard } from '@/components/ui/kpi-card';
import { DollarSign, Wallet, TrendingUp, TrendingDown, Receipt } from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';

interface TransactionStatsProps {
  globalTotals: {
    totalUSD: number;
    totalCDF: number;
    totalCNY: number;
    totalFrais: number;
    totalBenefice: number;
    totalDepenses: number;
    totalCount: number;
  };
}

export const TransactionStats: React.FC<TransactionStatsProps> = ({ globalTotals }) => {
  const { totalUSD, totalFrais, totalBenefice, totalDepenses, totalCount } = globalTotals;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
      <KpiCard title="Total encaissé" value={formatCurrency(totalUSD, 'USD')} icon={DollarSign} iconColor="#21ac74" iconBg="#dcfce7" />
      <KpiCard title="Total frais" value={formatCurrency(totalFrais, 'USD')} icon={Wallet} iconColor="#3b82f6" iconBg="#dbeafe" />
      <KpiCard title="Bénéfice net" value={formatCurrency(totalBenefice, 'USD')} icon={TrendingUp} iconColor="#8b5cf6" iconBg="#ede9fe" />
      <KpiCard title="Dépenses" value={formatCurrency(totalDepenses, 'USD')} icon={TrendingDown} iconColor="#ef4444" iconBg="#fee2e2" />
      <KpiCard title="Transactions" value={totalCount || 0} icon={Receipt} iconColor="#64748b" iconBg="#f1f5f9" className="col-span-2 lg:col-span-1" />
    </div>
  );
};
