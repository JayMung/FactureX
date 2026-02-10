/**
 * Telegram Bot API helpers for Agent Comptable
 */

const TELEGRAM_API_URL = `https://api.telegram.org/bot${Deno.env.get('TELEGRAM_BOT_TOKEN')}`;

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: callbackQueryId,
      text: text || '',
    }),
  });
  const data = await response.json();
  if (!data.ok) {
    console.error('Telegram answerCallbackQuery error:', data);
  }
  return data;
}

export async function sendTelegramMessage(chatId: string, text: string, parseMode: string = 'Markdown') {
  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: parseMode,
      disable_web_page_preview: true,
    }),
  });
  const data = await response.json();
  if (!data.ok) {
    console.error('Telegram API error:', data);
  }
  return data;
}

export async function sendTelegramButtons(
  chatId: string,
  text: string,
  buttons: Array<{ text: string; callback_data: string }>
) {
  const keyboard = {
    inline_keyboard: buttons.map(btn => ([{
      text: btn.text,
      callback_data: btn.callback_data,
    }])),
  };

  const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    }),
  });
  const data = await response.json();
  if (!data.ok) {
    console.error('Telegram API error:', data);
  }
  return data;
}

function getCompteEmoji(nom: string): string {
  const lower = nom.toLowerCase();
  if (lower.includes('cash')) return '💵';
  if (lower.includes('m-pesa') || lower.includes('mpesa')) return '📱';
  if (lower.includes('airtel')) return '📲';
  if (lower.includes('illico')) return '💳';
  if (lower.includes('orange')) return '🍊';
  if (lower.includes('rawbank') || lower.includes('banque')) return '🏦';
  if (lower.includes('alipay')) return '🇨🇳';
  return '💰';
}

export async function sendMorningPoint(
  chatId: string,
  soldes: Array<{ nom: string; solde_actuel: number; devise: string }>,
  entreesHier: Array<{ motif: string; montant: number }>,
  depensesHier: Array<{ motif: string; montant: number }>
) {
  const date = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  let message = `☀️ *Bonjour Jay !*\n\n`;
  message += `📊 *${date}*\n\n`;

  message += `💰 *SOLDES ACTUELS :*\n`;
  for (const compte of soldes) {
    const emoji = getCompteEmoji(compte.nom);
    message += `${emoji} ${compte.nom} : ${compte.solde_actuel.toLocaleString()} ${compte.devise}\n`;
  }

  if (entreesHier.length > 0) {
    message += `\n📈 *ENTRÉES HIER :*\n`;
    for (const entree of entreesHier) {
      message += `• ${entree.motif} : ${entree.montant.toLocaleString()} $\n`;
    }
  }

  if (depensesHier.length > 0) {
    message += `\n💸 *DÉPENSES HIER :*\n`;
    for (const depense of depensesHier) {
      message += `• ${depense.motif}\n`;
    }
  }

  message += `\n❓ *Qu'est-ce que tu as à me dire aujourd'hui ?*\n`;
  message += `_Ex: "25k essence" ou "Reçu 500$ client"_`;

  await sendTelegramMessage(chatId, message);
}

export async function sendEveningPoint(
  chatId: string,
  depensesAujourdhui: number,
  revenusAujourdhui: number,
  nombreTransactions: number
) {
  let message = `🌆 *Point du Soir*\n\n`;

  message += `📊 *AUJOURD'HUI :*\n`;
  message += `• 💸 Dépenses enregistrées : ${depensesAujourdhui.toLocaleString()} CDF\n`;
  message += `• 💰 Revenus enregistrés : ${revenusAujourdhui.toLocaleString()} $\n`;
  message += `• 📝 Total transactions : ${nombreTransactions}\n\n`;

  if (depensesAujourdhui === 0) {
    message += `⚠️ *Tu n'as rien enregistré aujourd'hui.*\n`;
    message += `T'as pas oublié quelque chose ?\n`;
    message += `_Essence ? Transport ? Repas ?_\n\n`;
  }

  message += `💬 *Dis-moi si t'as autre chose !*`;

  await sendTelegramMessage(chatId, message);
}

export async function sendSoldes(
  chatId: string,
  soldes: Array<{ nom: string; solde_actuel: number; devise: string }>
) {
  let message = `💰 *SOLDES ACTUELS*\n\n`;
  let totalUSD = 0;

  for (const compte of soldes) {
    const emoji = getCompteEmoji(compte.nom);
    message += `${emoji} *${compte.nom}*\n   ${compte.solde_actuel.toLocaleString()} ${compte.devise}\n`;

    if (compte.devise === 'USD') {
      totalUSD += compte.solde_actuel;
    } else if (compte.devise === 'CDF') {
      totalUSD += compte.solde_actuel / 2200;
    } else if (compte.devise === 'CNY') {
      totalUSD += compte.solde_actuel / 6.95;
    }
  }

  message += `\n📊 *TOTAL ESTIMÉ*\n`;
  message += `≈ ${totalUSD.toFixed(2)} USD`;

  await sendTelegramMessage(chatId, message);
}

export async function sendTransactionConfirmation(
  chatId: string,
  transaction: {
    type: 'depense' | 'revenue';
    montant: number;
    devise: string;
    motif: string;
    compte: string;
    categorie: string;
  }
) {
  const emoji = transaction.type === 'revenue' ? '💰' : '💸';
  const typeLabel = transaction.type === 'revenue' ? 'Revenu' : 'Dépense';

  const message = `${emoji} *${typeLabel} détecté*

📊 *Détails :*
• Montant : ${transaction.montant.toLocaleString()} ${transaction.devise}
• Motif : ${transaction.motif}
• Catégorie : ${transaction.categorie}
• Compte : ${transaction.compte}

C'est correct ?`;

  await sendTelegramButtons(chatId, message, [
    { text: '✅ Oui, enregistrer', callback_data: `confirm_yes` },
    { text: '📝 Modifier', callback_data: `confirm_edit` },
    { text: '❌ Annuler', callback_data: `confirm_cancel` },
  ]);
}

export async function sendLowBalanceAlert(
  chatId: string,
  compte: string,
  solde: number,
  seuil: number
) {
  const message = `🚨 *ALERTE SOLDE BAS*

Compte : ${compte}
Solde actuel : ${solde.toLocaleString()} $
Seuil minimum : ${seuil.toLocaleString()} $

💡 *Action recommandée :*
Recharger ce compte rapidement.`;

  await sendTelegramButtons(chatId, message, [
    { text: '💰 Oui, recharger', callback_data: `recharge_${compte}` },
    { text: '✓ Vu, merci', callback_data: 'alert_seen' },
  ]);
}
