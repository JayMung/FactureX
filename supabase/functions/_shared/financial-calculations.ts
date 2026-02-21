/**
 * Financial Calculations for Edge Functions
 * 
 * Ported from src/hooks/transactions/calculations.ts and constants.ts
 * to be usable in Deno Edge Functions without frontend dependencies.
 * 
 * IMPORTANT: Keep these values synchronized with the frontend constants.
 * The source of truth is the DB `settings` table; these are fallback defaults.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Constants (synced with src/hooks/transactions/constants.ts)
// ============================================================================

/** Default exchange rates — fallback when DB settings are unavailable */
export const DEFAULT_RATES: Record<string, number> = {
  usdToCny: 6.95,
  usdToCdf: 2200,
};

/** Default fee percentages — fallback when DB settings are unavailable */
export const DEFAULT_FEES: Record<string, number> = {
  transfert: 5,
  commande: 15,
  partenaire: 3,
};

/** Mapping from motif labels to fee keys */
const MOTIF_TO_FEE_KEY: Record<string, string> = {
  'commande (facture)': 'commande',
  'transfert (argent)': 'transfert',
  'transfert reçu': 'transfert',
  'autres paiements': 'transfert',
  'commande': 'commande',
  'transfert': 'transfert',
  'paiement colis': 'paiement colis',
};

// ============================================================================
// Types
// ============================================================================

export interface RatesAndFees {
  rates: Record<string, number>;
  fees: Record<string, number>;
}

export interface TransactionAmounts {
  frais: number;
  benefice: number;
  montant_cny: number;
  taux_usd_cny: number;
  taux_usd_cdf: number;
}

// ============================================================================
// Fetch from DB
// ============================================================================

/**
 * Fetch exchange rates and fee percentages from the `settings` table.
 * Falls back to DEFAULT_RATES / DEFAULT_FEES if the query fails.
 */
export async function fetchRatesAndFees(
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<RatesAndFees> {
  const rates: Record<string, number> = { ...DEFAULT_RATES };
  const fees: Record<string, number> = { ...DEFAULT_FEES };

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: settings } = await supabase
      .from('settings')
      .select('cle, valeur, categorie')
      .in('categorie', ['taux_change', 'frais'])
      .in('cle', ['usdToCny', 'usdToCdf', 'transfert', 'commande', 'partenaire']);

    settings?.forEach((setting: any) => {
      if (setting.categorie === 'taux_change') {
        rates[setting.cle] = parseFloat(setting.valeur);
      } else if (setting.categorie === 'frais') {
        fees[setting.cle] = parseFloat(setting.valeur);
      }
    });
  } catch (error) {
    console.error('Failed to fetch rates/fees from DB, using defaults:', error);
  }

  return { rates, fees };
}

// ============================================================================
// Fee Key Resolution
// ============================================================================

/**
 * Resolve the fee key for a given motif string.
 * Mirrors src/hooks/transactions/calculations.ts → getFeeKey()
 */
export function getFeeKey(motif: string): string {
  const motifLower = motif?.toLowerCase() || '';

  // 1. Exact mapping
  if (MOTIF_TO_FEE_KEY[motifLower]) {
    return MOTIF_TO_FEE_KEY[motifLower];
  }

  // 2. Fuzzy fallback
  if (motifLower.includes('transfert')) return 'transfert';
  if (motifLower.includes('commande') || motifLower.includes('facture')) return 'commande';
  if (motifLower.includes('colis')) return 'paiement colis';

  return motifLower;
}

// ============================================================================
// Transaction Amount Calculations
// ============================================================================

/**
 * Calculate fees, profit, and CNY amount for a transaction.
 * Mirrors src/hooks/transactions/calculations.ts → calculateTransactionAmounts()
 *
 * For revenue transactions: computes frais, commission partenaire, bénéfice, and CNY.
 * For depense/transfert: frais, bénéfice, and CNY are 0.
 */
export function calculateTransactionAmounts(
  montant: number,
  devise: string,
  motif: string,
  typeTransaction: string,
  rates: Record<string, number>,
  fees: Record<string, number>
): TransactionAmounts {
  // Special case: Paiement Colis has no fees, profit, or CNY conversion
  const isPaiementColis =
    motif?.toLowerCase().includes('paiement colis') ||
    motif?.toLowerCase().includes('colis');

  if (isPaiementColis) {
    return {
      frais: 0,
      benefice: 0,
      montant_cny: 0,
      taux_usd_cny: rates.usdToCny,
      taux_usd_cdf: rates.usdToCdf,
    };
  }

  const tauxUSD = devise === 'USD' ? 1 : rates.usdToCdf;

  let fraisUSD = 0;
  let benefice = 0;
  let montantCNY = 0;

  // Revenue transactions: compute fees, partner commission, profit, CNY
  if (typeTransaction === 'revenue') {
    const feeKey = getFeeKey(motif);
    const fraisRate = fees[feeKey] || 0;

    fraisUSD = montant * (fraisRate / 100);
    const commissionPartenaire = montant * (fees.partenaire / 100);
    benefice = fraisUSD - commissionPartenaire;

    // CNY conversion only for commercial transactions
    const montantNet = montant - fraisUSD;
    montantCNY = devise === 'USD'
      ? montantNet * rates.usdToCny
      : (montantNet / tauxUSD) * rates.usdToCny;
  }
  // For depense/transfert: frais, benefice, CNY stay at 0

  return {
    frais: fraisUSD,
    benefice,
    montant_cny: montantCNY,
    taux_usd_cny: rates.usdToCny,
    taux_usd_cdf: rates.usdToCdf,
  };
}
