/**
 * Agent Comptable - Core logic (parsing, DB queries, transaction creation)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Create a service-role client for DB operations
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

// ─── MESSAGE PARSING ────────────────────────────────────────────

export function parseTransaction(message: string): {
  type: 'depense' | 'revenue' | 'question' | null;
  montant: number | null;
  devise: 'CDF' | 'USD';
  motif: string;
  compte: string;
  categorie: string;
  confiance: number;
} {
  const lowerMsg = message.toLowerCase().trim();

  // Detect questions
  if (lowerMsg.includes('solde') || lowerMsg.includes('bilan') || lowerMsg.includes('combien')) {
    return { type: 'question', montant: null, devise: 'CDF', motif: '', compte: '', categorie: '', confiance: 1 };
  }

  // Detect type: revenue or expense
  const isRevenu = lowerMsg.includes('revenu') ||
    lowerMsg.includes('reçu') ||
    lowerMsg.includes('recu') ||
    lowerMsg.includes('vente') ||
    lowerMsg.includes('paiement facture') ||
    lowerMsg.includes('paiement client') ||
    lowerMsg.includes('entrée') ||
    lowerMsg.includes('entree') ||
    lowerMsg.includes('encaissement') ||
    lowerMsg.includes('client a payé') ||
    lowerMsg.includes('client a paye');

  const isDepense = lowerMsg.includes('dépense') ||
    lowerMsg.includes('depense') ||
    lowerMsg.includes('acheté') ||
    lowerMsg.includes('achete') ||
    lowerMsg.includes('frais') ||
    (lowerMsg.includes('payé') && !isRevenu) ||
    (lowerMsg.includes('paye') && !isRevenu);

  let type: 'depense' | 'revenue' | null = null;
  if (isRevenu) type = 'revenue';
  else if (isDepense) type = 'depense';
  else {
    const hasMontant = /\d/.test(message);
    if (hasMontant) type = 'depense'; // Default to expense
  }

  // Detect currency FIRST (needed for amount parsing)
  let devise: 'CDF' | 'USD' = 'CDF';
  if (lowerMsg.includes('usd') || lowerMsg.includes('$') || lowerMsg.includes('dollar')) {
    devise = 'USD';
  }

  // Extract amount
  let montant: number | null = null;
  const montantMatch = message.match(/(\d+[.,]?\d*)\s*(k|cdf|usd|\$)?/i);
  if (montantMatch) {
    let rawMontant = montantMatch[1].replace(/,/g, '.');
    montant = parseFloat(rawMontant);
    // Only multiply by 1000 if 'k' suffix is explicitly next to the number
    const kSuffix = montantMatch[2]?.toLowerCase() === 'k';
    if (kSuffix && montant < 10000) {
      montant = montant * 1000;
    }
  }

  // Extract motif - combine everything that's not a number, currency, account, or type keyword
  let motif = 'Divers';
  // Remove amount+currency pattern, then clean up type/account keywords
  let cleaned = message
    .replace(/\d+[.,]?\d*\s*(k|cdf|usd|\$)?/gi, '')
    .replace(/\b(reçu|recu|revenu|dépense|depense|acheté|achete|payé|paye|encaissement|entrée|entree|vente)\b/gi, '')
    .replace(/\b(mpesa|m-pesa|airtel|illico|illicocash|orange|rawbank|alipay|cash)\b/gi, '')
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned && cleaned.length > 1) {
    motif = cleaned;
  } else {
    // Fallback: try to get text after the amount
    const afterAmount = message.match(/\d+[.,]?\d*\s*(k|cdf|usd|\$)?\s+(.+)/i);
    if (afterAmount && afterAmount[2]) {
      motif = afterAmount[2].replace(/\b(mpesa|m-pesa|airtel|illico|cash)\b/gi, '').trim() || 'Divers';
    }
  }

  // Detect account
  let compte = 'Cash Bureau';
  if (lowerMsg.includes('m-pesa') || lowerMsg.includes('mpesa')) {
    compte = 'M-Pesa';
  } else if (lowerMsg.includes('airtel')) {
    compte = 'Airtel Money';
  } else if (lowerMsg.includes('illico')) {
    compte = 'Illicocash';
  } else if (lowerMsg.includes('orange')) {
    compte = 'Orange Money';
  } else if (lowerMsg.includes('rawbank')) {
    compte = 'Rawbank';
  } else if (lowerMsg.includes('alipay')) {
    compte = 'Alipay';
  }

  const categorie = suggestCategory(motif);

  let confiance = 0.8;
  if (!type) confiance -= 0.3;
  if (!montant) confiance -= 0.5;
  if (motif === 'Divers') confiance -= 0.1;

  return {
    type,
    montant,
    devise,
    motif: motif || 'Divers',
    compte,
    categorie,
    confiance: Math.max(0, confiance)
  };
}

function suggestCategory(motif: string): string {
  const m = motif.toLowerCase();

  if (/essence|carburant|gasoil|taxi|transport|bus|moto/.test(m)) return '62 - Transport';
  if (/repas|restaurant|bouffe|nourriture|déjeuner|diner/.test(m)) return '63 - Frais repas';
  if (/téléphone|telephone|crédit|credit|communication|airtime/.test(m)) return '64 - Télécom';
  if (/course|marché|marche|alimentation|supermarché|achat/.test(m)) return '61 - Achats';
  if (/bureau|papeterie|matériel|materiel|imprimante|ordinateur/.test(m)) return '65 - Fournitures bureau';
  if (/entrepôt|entrepot|stockage|douane|transit/.test(m)) return '66 - Logistique';
  if (/banque|frais bancaire|retrait|transfert/.test(m)) return '67 - Frais bancaires';
  if (/salaire|employé|employe|personnel|agent/.test(m)) return '68 - Salaires';
  if (/loyer|location|bail/.test(m)) return '69 - Loyer';
  if (/fournisseur|1688|alibaba|taobao/.test(m)) return '60 - Achats fournisseurs';

  return '68 - Charges diverses';
}

export function detectCommand(message: string): { command: string; params: string } | null {
  const lowerMsg = message.toLowerCase().trim();

  if (lowerMsg.startsWith('/')) {
    const parts = lowerMsg.split(' ');
    return { command: parts[0], params: parts.slice(1).join(' ') };
  }

  // Only match exact short messages as commands, not transaction messages
  // e.g. "solde" or "solde ?" but NOT "paiement facture client"
  const words = lowerMsg.split(/\s+/);
  if (words.length <= 3) {
    const commands = [
      { match: ['solde', 'soldes', 'bilan', 'combien'], cmd: '/solde' },
      { match: ['aide', 'help', 'commandes'], cmd: '/aide' },
      { match: ['historique', 'historiques', 'dernières'], cmd: '/historique' },
    ];

    for (const cmd of commands) {
      if (cmd.match.some(m => lowerMsg.includes(m))) {
        return { command: cmd.cmd, params: '' };
      }
    }
  }

  return null;
}

// ─── DATABASE QUERIES ───────────────────────────────────────────

export async function getSoldesActuels() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('comptes_financiers')
    .select('id, nom, solde_actuel, devise, type_compte, is_active')
    .eq('is_active', true)
    .order('solde_actuel', { ascending: false });

  if (error) {
    console.error('Error fetching soldes:', error);
    throw error;
  }
  return data || [];
}

function getDateRange(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const dateStr = d.toISOString().split('T')[0];
  return { debut: dateStr + 'T00:00:00', fin: dateStr + 'T23:59:59' };
}

export async function getEntreesHier() {
  const supabase = getSupabaseAdmin();
  const { debut, fin } = getDateRange(1);

  const { data, error } = await supabase
    .from('transactions')
    .select('motif, montant, devise')
    .eq('type_transaction', 'revenue')
    .gte('date_paiement', debut)
    .lte('date_paiement', fin)
    .order('date_paiement', { ascending: false });

  if (error) {
    console.error('Error fetching entrees:', error);
    return [];
  }
  return data || [];
}

export async function getDepensesHier() {
  const supabase = getSupabaseAdmin();
  const { debut, fin } = getDateRange(1);

  const { data, error } = await supabase
    .from('transactions')
    .select('motif, montant, devise')
    .eq('type_transaction', 'depense')
    .gte('date_paiement', debut)
    .lte('date_paiement', fin)
    .order('date_paiement', { ascending: false });

  if (error) {
    console.error('Error fetching depenses:', error);
    return [];
  }
  return data || [];
}

export async function getDepensesAujourdhui() {
  const supabase = getSupabaseAdmin();
  const { debut, fin } = getDateRange(0);

  const { data, error } = await supabase
    .from('transactions')
    .select('montant, devise')
    .eq('type_transaction', 'depense')
    .gte('date_paiement', debut)
    .lte('date_paiement', fin);

  if (error) {
    console.error('Error fetching depenses today:', error);
    return { nombre: 0, totalCDF: 0 };
  }

  let total = 0;
  for (const t of data || []) {
    if (t.devise === 'CDF') total += t.montant;
    else if (t.devise === 'USD') total += t.montant * 2200;
  }

  return { nombre: data?.length || 0, totalCDF: total };
}

export async function getRevenusAujourdhui() {
  const supabase = getSupabaseAdmin();
  const { debut, fin } = getDateRange(0);

  const { data, error } = await supabase
    .from('transactions')
    .select('montant, devise')
    .eq('type_transaction', 'revenue')
    .gte('date_paiement', debut)
    .lte('date_paiement', fin);

  if (error) {
    console.error('Error fetching revenus today:', error);
    return { nombre: 0, totalUSD: 0 };
  }

  let total = 0;
  for (const t of data || []) {
    if (t.devise === 'USD') total += t.montant;
    else if (t.devise === 'CDF') total += t.montant / 2200;
  }

  return { nombre: data?.length || 0, totalUSD: total };
}

export async function createTransactionInDB(txData: {
  type: 'depense' | 'revenue';
  montant: number;
  devise: string;
  motif: string;
  compte: string;
  categorie: string;
}) {
  const supabase = getSupabaseAdmin();

  // Find account ID
  const { data: compteData, error: compteError } = await supabase
    .from('comptes_financiers')
    .select('id')
    .ilike('nom', `%${txData.compte}%`)
    .eq('is_active', true)
    .single();

  if (compteError || !compteData) {
    throw new Error(`Compte "${txData.compte}" non trouvé`);
  }

  const transactionData: Record<string, unknown> = {
    type_transaction: txData.type,
    montant: txData.montant,
    devise: txData.devise,
    motif: txData.motif,
    date_paiement: new Date().toISOString(),
    statut: 'Servi',
    compte_source_id: txData.type === 'depense' ? compteData.id : null,
    compte_destination_id: txData.type === 'revenue' ? compteData.id : null,
    notes: `Agent Comptable - ${txData.categorie}`,
    organization_id: '00000000-0000-0000-0000-000000000001',
  };

  const { data: result, error } = await supabase
    .from('transactions')
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }

  return result;
}

export async function checkLowBalances(seuils: Record<string, number>) {
  const supabase = getSupabaseAdmin();
  const { data: comptes, error } = await supabase
    .from('comptes_financiers')
    .select('nom, solde_actuel, devise')
    .eq('is_active', true);

  if (error) {
    console.error('Error checking balances:', error);
    return [];
  }

  const alerts = [];
  for (const compte of comptes || []) {
    const seuil = seuils[compte.nom] || 100;
    if (compte.solde_actuel < seuil) {
      alerts.push({ compte: compte.nom, solde: compte.solde_actuel, devise: compte.devise, seuil });
    }
  }
  return alerts;
}

// ─── PENDING TRANSACTIONS ───────────────────────────────────────

export async function savePendingTransaction(chatId: string, txData: {
  type: 'depense' | 'revenue';
  montant: number;
  devise: string;
  motif: string;
  compte: string;
  categorie: string;
}) {
  const supabase = getSupabaseAdmin();

  // Cancel any existing pending transactions for this chat
  await supabase
    .from('pending_transactions')
    .update({ status: 'expired' })
    .eq('chat_id', chatId)
    .eq('status', 'pending');

  const { data, error } = await supabase
    .from('pending_transactions')
    .insert({
      chat_id: chatId,
      type_transaction: txData.type,
      montant: txData.montant,
      devise: txData.devise,
      motif: txData.motif,
      compte: txData.compte,
      categorie: txData.categorie,
    })
    .select()
    .single();

  if (error) {
    console.error('Error saving pending transaction:', error);
    throw error;
  }
  return data;
}

export async function getPendingTransaction(chatId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('pending_transactions')
    .select('*')
    .eq('chat_id', chatId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data;
}

export async function confirmPendingTransaction(chatId: string) {
  const pending = await getPendingTransaction(chatId);
  if (!pending) return null;

  const supabase = getSupabaseAdmin();

  // Create the real transaction
  const result = await createTransactionInDB({
    type: pending.type_transaction,
    montant: pending.montant,
    devise: pending.devise,
    motif: pending.motif,
    compte: pending.compte,
    categorie: pending.categorie,
  });

  // Mark as confirmed
  await supabase
    .from('pending_transactions')
    .update({ status: 'confirmed' })
    .eq('id', pending.id);

  return result;
}

export async function cancelPendingTransaction(chatId: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from('pending_transactions')
    .update({ status: 'cancelled' })
    .eq('chat_id', chatId)
    .eq('status', 'pending');
}

export async function getRecentTransactions(limit: number = 10) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('transactions')
    .select('type_transaction, montant, devise, motif, date_paiement')
    .order('date_paiement', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent transactions:', error);
    return [];
  }
  return data || [];
}
