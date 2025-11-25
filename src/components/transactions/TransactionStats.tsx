import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
      {/* Total USD Card */}
      <Card className="card-base transition-shadow-hover">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total USD</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                {formatCurrency(totalUSD, 'USD')}
              </p>
            </div>
            <div className="p-3 rounded-full bg-green-500 flex-shrink-0">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Frais Card */}
      <Card className="card-base transition-shadow-hover">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Frais</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                {formatCurrency(totalFrais, 'USD')}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-500 flex-shrink-0">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bénéfice Card */}
      <Card className="card-base transition-shadow-hover">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Bénéfice total</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                {formatCurrency(totalBenefice, 'USD')}
              </p>
            </div>
            <div className="p-3 rounded-full bg-purple-500 flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Dépenses Card */}
      <Card className="card-base transition-shadow-hover">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Dépenses</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                {formatCurrency(totalDepenses, 'USD')}
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-500 flex-shrink-0">
              <TrendingDown className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Count Card */}
      <Card className="card-base transition-shadow-hover">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transactions</p>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate mt-2">
                {totalCount || 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Toutes pages confondues</p>
            </div>
            <div className="p-3 rounded-full bg-orange-500 flex-shrink-0">
              <Receipt className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
