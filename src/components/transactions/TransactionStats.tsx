import React from 'react';
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
      {/* Total USD Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 md:p-5 shadow-lg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-white/20 p-2">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] md:text-xs font-medium text-white">
              USD
            </span>
          </div>
          <div className="mt-3">
            <p className="text-lg md:text-2xl font-bold text-white truncate">{formatCurrency(totalUSD, 'USD')}</p>
            <p className="mt-0.5 text-xs md:text-sm text-emerald-100">Total encaissé</p>
          </div>
        </div>
      </div>

      {/* Total Frais Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 md:p-5 shadow-lg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-white/20 p-2">
              <Wallet className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-blue-100">Frais</span>
          </div>
          <div className="mt-3">
            <p className="text-lg md:text-2xl font-bold text-white truncate">{formatCurrency(totalFrais, 'USD')}</p>
            <p className="mt-0.5 text-xs md:text-sm text-blue-100">Total perçu</p>
          </div>
        </div>
      </div>

      {/* Bénéfice Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 md:p-5 shadow-lg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-white/20 p-2">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] md:text-xs font-medium text-white">
              +{((totalBenefice / (totalUSD || 1)) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="mt-3">
            <p className="text-lg md:text-2xl font-bold text-white truncate">{formatCurrency(totalBenefice, 'USD')}</p>
            <p className="mt-0.5 text-xs md:text-sm text-purple-100">Bénéfice net</p>
          </div>
        </div>
      </div>

      {/* Total Dépenses Card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-4 md:p-5 shadow-lg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-white/20 p-2">
              <TrendingDown className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-red-100">Sorties</span>
          </div>
          <div className="mt-3">
            <p className="text-lg md:text-2xl font-bold text-white truncate">{formatCurrency(totalDepenses, 'USD')}</p>
            <p className="mt-0.5 text-xs md:text-sm text-red-100">Dépenses</p>
          </div>
        </div>
      </div>

      {/* Transactions Count Card */}
      <div className="col-span-2 lg:col-span-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-4 md:p-5 shadow-lg">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/5"></div>
        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-white/10 p-2">
              <Receipt className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <span className="text-[10px] md:text-xs font-medium text-slate-400">Total</span>
          </div>
          <div className="mt-3">
            <p className="text-lg md:text-2xl font-bold text-white">{totalCount || 0}</p>
            <p className="mt-0.5 text-xs md:text-sm text-slate-400">Transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
};
