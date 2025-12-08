// Fonctions de calcul pour les transactions
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_RATES, DEFAULT_FEES, MOTIF_TO_FEE_KEY } from './constants';

export interface RatesAndFees {
  rates: Record<string, number>;
  fees: Record<string, number>;
}

/**
 * Récupère les taux de change et frais depuis la base de données
 */
export async function fetchRatesAndFees(): Promise<RatesAndFees> {
  const { data: settings } = await supabase
    .from('settings')
    .select('cle, valeur, categorie')
    .in('categorie', ['taux_change', 'frais'])
    .in('cle', ['usdToCny', 'usdToCdf', 'transfert', 'commande', 'partenaire']);

  const rates: Record<string, number> = { ...DEFAULT_RATES };
  const fees: Record<string, number> = { ...DEFAULT_FEES };

  settings?.forEach((setting: any) => {
    if (setting.categorie === 'taux_change') {
      rates[setting.cle] = parseFloat(setting.valeur);
    } else if (setting.categorie === 'frais') {
      fees[setting.cle] = parseFloat(setting.valeur);
    }
  });

  return { rates, fees };
}

/**
 * Obtient la clé de frais correspondant au motif
 */
export function getFeeKey(motif: string): string {
  const motifLower = motif?.toLowerCase() || '';
  
  // 1. Mapping exact
  if (MOTIF_TO_FEE_KEY[motifLower]) {
    return MOTIF_TO_FEE_KEY[motifLower];
  }

  // 2. Logique floue (fallback)
  if (motifLower.includes('transfert')) {
    return 'transfert';
  }
  if (motifLower.includes('commande') || motifLower.includes('facture')) {
    return 'commande';
  }
  if (motifLower.includes('colis')) {
    return 'paiement colis';
  }

  return motifLower;
}

/**
 * Calcule les frais, bénéfice et montant CNY pour une transaction
 */
export function calculateTransactionAmounts(
  montant: number,
  devise: string,
  motif: string,
  typeTransaction: string,
  rates: Record<string, number>,
  fees: Record<string, number>
) {
  const tauxUSD = devise === 'USD' ? 1 : rates.usdToCdf;
  
  let fraisUSD = 0;
  let benefice = 0;
  
  if (typeTransaction === 'revenue') {
    const feeKey = getFeeKey(motif);
    const fraisRate = fees[feeKey as keyof typeof fees] || 0;
    
    fraisUSD = montant * (fraisRate / 100);
    const commissionPartenaire = montant * (fees.partenaire / 100);
    benefice = fraisUSD - commissionPartenaire;
  }
  // Pour les dépenses, frais et bénéfice restent à 0
  
  const montantNet = montant - fraisUSD;
  const montantCNY = devise === 'USD' 
    ? montantNet * rates.usdToCny 
    : (montantNet / tauxUSD) * rates.usdToCny;

  return {
    frais: fraisUSD,
    benefice,
    montant_cny: montantCNY,
    taux_usd_cny: rates.usdToCny,
    taux_usd_cdf: rates.usdToCdf
  };
}
