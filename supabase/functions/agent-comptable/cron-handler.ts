/**
 * Cron handlers for morning and evening points
 */
import {
  getSoldesActuels,
  getEntreesHier,
  getDepensesHier,
  getDepensesAujourdhui,
  getRevenusAujourdhui,
  checkLowBalances,
} from "../_shared/agent-comptable.ts";
import {
  sendMorningPoint,
  sendEveningPoint,
  sendLowBalanceAlert,
} from "../_shared/telegram.ts";

const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";

const SEUILS_ALERTE: Record<string, number> = {
  "Cash Bureau": 500,
  "M-Pesa": 100,
  "Airtel Money": 100,
  "Illicocash": 200,
  "Orange Money": 50,
  "Rawbank": 50,
};

/**
 * Point matinal - 8h00
 */
export async function morningPoint() {
  console.log("🌅 Point matinal...");

  try {
    const soldes = await getSoldesActuels();
    const entreesHier = await getEntreesHier();
    const depensesHier = await getDepensesHier();

    await sendMorningPoint(TELEGRAM_CHAT_ID, soldes, entreesHier, depensesHier);

    // Check low balances
    const alerts = await checkLowBalances(SEUILS_ALERTE);
    for (const alert of alerts) {
      await sendLowBalanceAlert(TELEGRAM_CHAT_ID, alert.compte, alert.solde, alert.seuil);
    }

    console.log("✅ Point matinal envoyé");
  } catch (error) {
    console.error("❌ Erreur point matinal:", error);
  }
}

/**
 * Point du soir - 18h00
 */
export async function eveningPoint() {
  console.log("🌆 Point du soir...");

  try {
    const depenses = await getDepensesAujourdhui();
    const revenus = await getRevenusAujourdhui();

    await sendEveningPoint(
      TELEGRAM_CHAT_ID,
      depenses.totalCDF,
      revenus.totalUSD,
      depenses.nombre + revenus.nombre
    );

    console.log("✅ Point du soir envoyé");
  } catch (error) {
    console.error("❌ Erreur point du soir:", error);
  }
}
