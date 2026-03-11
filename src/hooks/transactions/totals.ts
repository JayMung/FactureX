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
export function calculateGlobalTotals(
  transactions: any[], 
  rates: { usdToCdf: number; usdToCny: number } = { usdToCdf: 2200, usdToCny: 6.95 }
): Omit<GlobalTotals, 'totalCount'> {
  return transactions.reduce((acc, transaction) => {
    // Total USD/CDF compte UNIQUEMENT les revenues
    if (transaction.type_transaction === 'revenue') {
      let montantUSD = transaction.montant || 0;

      if (transaction.devise === 'USD') {
        // Déjà en USD
      } else if (transaction.devise === 'CDF') {
        acc.totalCDF += transaction.montant || 0;
        montantUSD = montantUSD / (rates.usdToCdf || 1);
      } else if (transaction.devise === 'CNY') {
        // On n'ajoute pas au totalCNY ici car totalCNY semble réservé au montant_cny des transferts commerciaux
        // Mais on convertit quand même pour le total global
        montantUSD = montantUSD / (rates.usdToCny || 1);
      }
      
      // On accumule tout dans totalUSD pour avoir le Volume Global en USD
      acc.totalUSD += montantUSD;

      // CNY, Frais et Bénéfice ne concernent que les transactions commerciales (Revenue)
      if (COMMERCIAL_MOTIFS.includes(transaction.motif)) {
        acc.totalCNY += transaction.montant_cny || 0;
        
        let frais = transaction.frais || 0;
        let benefice = transaction.benefice || 0;

        // Conversion des frais et bénéfices en USD si nécessaire
        if (transaction.devise === 'CNY') {
          frais = frais / (rates.usdToCny || 1);
          benefice = benefice / (rates.usdToCny || 1);
        } else if (transaction.devise === 'CDF') {
          frais = frais / (rates.usdToCdf || 1);
          benefice = benefice / (rates.usdToCdf || 1);
        }

        acc.totalFrais += frais;
        acc.totalBenefice += benefice;
      }
    }

    // Calculer les dépenses séparément avec conversion en USD
    if (transaction.type_transaction === 'depense') {
      let montantUSD = transaction.montant || 0;
      
      // Conversion si nécessaire
      if (transaction.devise === 'CNY') {
        montantUSD = montantUSD / (rates.usdToCny || 1);
      } else if (transaction.devise === 'CDF') {
        montantUSD = montantUSD / (rates.usdToCdf || 1);
      }
      
      acc.totalDepenses += montantUSD;
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
