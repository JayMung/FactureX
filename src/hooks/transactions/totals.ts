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
    // Total USD/CDF compte TOUTES les revenues (Commercial + Autres Paiements)
    if (transaction.type_transaction === 'revenue' || COMMERCIAL_MOTIFS.includes(transaction.motif)) {
      if (transaction.devise === 'USD') {
        acc.totalUSD += transaction.montant || 0;
      } else if (transaction.devise === 'CDF') {
        acc.totalCDF += transaction.montant || 0;
      }

      // CNY, Frais et Bénéfice ne concernent que les motifs commerciaux
      // CNY, Frais et Bénéfice ne concernent que les motifs commerciaux
      if (COMMERCIAL_MOTIFS.includes(transaction.motif)) {
        acc.totalCNY += transaction.montant_cny || 0;
        const frais = transaction.frais || 0;
        const benefice = transaction.benefice || 0;

        acc.totalFrais += frais;
        acc.totalBenefice += benefice;

        // Ajouter la commission partenaire (Frais - Bénéfice) aux dépenses
        // "la somme qui resort c'est ca qu'on depenses"
        acc.totalDepenses += (frais - benefice);
      }
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
