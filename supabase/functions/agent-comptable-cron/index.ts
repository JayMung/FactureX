import "jsr:@supabase/functions-js/edge-runtime.d.ts";
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

Deno.serve(async (req: Request) => {
  try {
    const { action } = await req.json();

    if (action === "morning") {
      console.log("🌅 CRON: Point matinal (8h00)");

      const soldes = await getSoldesActuels();
      const entreesHier = await getEntreesHier();
      const depensesHier = await getDepensesHier();

      await sendMorningPoint(TELEGRAM_CHAT_ID, soldes, entreesHier, depensesHier);

      const alerts = await checkLowBalances(SEUILS_ALERTE);
      for (const alert of alerts) {
        await sendLowBalanceAlert(TELEGRAM_CHAT_ID, alert.compte, alert.solde, alert.seuil);
      }

      return new Response(JSON.stringify({ ok: true, action: "morning_sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "evening") {
      console.log("🌆 CRON: Point du soir (18h00)");

      const depenses = await getDepensesAujourdhui();
      const revenus = await getRevenusAujourdhui();

      await sendEveningPoint(
        TELEGRAM_CHAT_ID,
        depenses.totalCDF,
        revenus.totalUSD,
        depenses.nombre + revenus.nombre
      );

      return new Response(JSON.stringify({ ok: true, action: "evening_sent" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'morning' or 'evening'." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Agent Comptable Cron error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
