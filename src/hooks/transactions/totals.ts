// Calcul des totaux pour les transactions
import { COMMERCIAL_MOTIFS } from './constants';

export interface GlobalTotals {
  totalUSD: number;
  totalCDF: number;
  totalCNY: number;
  totalFrais: number;
  totalBenefice: number;
  totalDepenses: number;
  totalCount: number;
}

export const INITIAL_TOTALS: GlobalTotals = {
  totalUSD: 0,
  totalCDF: 0,
  totalCNY: 0,
  totalFrais: 0,
  totalBenefice: 0,
  totalDepenses: 0,
  totalCount: 0
};

/**
 * Calcule les totaux globaux à partir d'une liste de transactions
 */
export function calculateGlobalTotals(transactions: any[]): Omit<GlobalTotals, 'totalCount'> {
  return transactions.reduce((acc, transaction) => {
    // Total USD/CDF ne compte QUE les transactions commerciales
    if (COMMERCIAL_MOTIFS.includes(transaction.motif)) {
      if (transaction.devise === 'USD') {
        acc.totalUSD += transaction.montant || 0;
      } else if (transaction.devise === 'CDF') {
        acc.totalCDF += transaction.montant || 0;
      }
      acc.totalCNY += transaction.montant_cny || 0;
      acc.totalFrais += transaction.frais || 0;
      acc.totalBenefice += transaction.benefice || 0;
    }
    
    // Calculer les dépenses séparément
    if (transaction.type_transaction === 'depense') {
      acc.totalDepenses += transaction.montant || 0;
    }
    
    return acc;
  }, {
    totalUSD: 0,
    totalCDF: 0,
    totalCNY: 0,
    totalFrais: 0,
    totalBenefice: 0,
    totalDepenses: 0
  });
}
