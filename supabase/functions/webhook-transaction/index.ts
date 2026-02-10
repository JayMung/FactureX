import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

/**
 * Webhook Transaction - API endpoint for external services (VPS, etc.)
 * 
 * POST /functions/v1/webhook-transaction
 * Headers: x-webhook-secret: <WEBHOOK_SECRET>  (preferred)
 *      OR: Authorization: Bearer <WEBHOOK_SECRET>
 * 
 * Body for depense/revenue:
 * {
 *   "type": "depense" | "revenue",
 *   "montant": 350,
 *   "devise": "USD" | "CDF",
 *   "motif": "paiement facture Starlink",
 *   "compte": "M-Pesa",
 *   "categorie": "64 - Télécom"  (optional)
 * }
 * 
 * Body for transfert:
 * {
 *   "type": "transfert",
 *   "montant": 10,
 *   "devise": "USD" | "CDF",
 *   "motif": "Rechargement Airtel",
 *   "compte_source": "Illicocash",
 *   "compte_destination": "Airtel Money"
 * }
 */

const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID") || "";
const ORG_ID = "00000000-0000-0000-0000-000000000001";

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
        },
      },
    }
  );
}

// ─── CORS headers ───────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-webhook-secret, authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ─── Authentication (custom header OR Bearer) ─────────────
  const customSecret = req.headers.get("x-webhook-secret") || "";
  const authHeader = req.headers.get("authorization") || "";
  const bearerToken = authHeader.replace("Bearer ", "").trim();
  const token = customSecret || bearerToken;

  console.log("Auth check - has WEBHOOK_SECRET:", !!WEBHOOK_SECRET, "token length:", token.length);

  if (!WEBHOOK_SECRET || token !== WEBHOOK_SECRET) {
    console.error("Unauthorized webhook attempt");
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body));

    // ─── Validation ─────────────────────────────────────────
    const { type, montant, devise, motif } = body;

    if (!type || !["depense", "revenue", "transfert"].includes(type)) {
      return jsonResponse({ error: "type must be 'depense', 'revenue', or 'transfert'" }, 400);
    }
    if (!montant || typeof montant !== "number" || montant <= 0) {
      return jsonResponse({ error: "montant must be a positive number" }, 400);
    }
    if (!devise || !["USD", "CDF"].includes(devise)) {
      return jsonResponse({ error: "devise must be 'USD' or 'CDF'" }, 400);
    }
    if (!motif || typeof motif !== "string") {
      return jsonResponse({ error: "motif is required" }, 400);
    }

    const supabase = getSupabaseAdmin();

    // ─── Handle transfert ───────────────────────────────────
    if (type === "transfert") {
      const { compte_source, compte_destination } = body;
      if (!compte_source || !compte_destination) {
        return jsonResponse({ error: "compte_source and compte_destination are required for transfert" }, 400);
      }

      const sourceId = await findCompteId(supabase, compte_source);
      const destId = await findCompteId(supabase, compte_destination);

      const txData = {
        type_transaction: "transfert",
        montant,
        devise,
        motif,
        date_paiement: new Date().toISOString(),
        statut: "Servi",
        compte_source_id: sourceId,
        compte_destination_id: destId,
        notes: `Webhook API - Transfert ${compte_source} → ${compte_destination}`,
        organization_id: ORG_ID,
      };

      const { data: result, error } = await supabase
        .from("transactions")
        .insert(txData)
        .select()
        .single();

      if (error) throw error;

      await notifyTelegram(`🔄 *Transfert via API*\n\n• ${montant} ${devise}\n• ${compte_source} → ${compte_destination}\n• ${motif}`);

      return jsonResponse({ success: true, transaction: result });
    }

    // ─── Handle depense / revenue ───────────────────────────
    const compte = body.compte || "Cash Bureau";
    const categorie = body.categorie || "68 - Charges diverses";
    const compteId = await findCompteId(supabase, compte);

    const txData: Record<string, unknown> = {
      type_transaction: type,
      montant,
      devise,
      motif,
      date_paiement: new Date().toISOString(),
      statut: "Servi",
      compte_source_id: type === "depense" ? compteId : null,
      compte_destination_id: type === "revenue" ? compteId : null,
      notes: `Webhook API - ${categorie}`,
      organization_id: ORG_ID,
    };

    const { data: result, error } = await supabase
      .from("transactions")
      .insert(txData)
      .select()
      .single();

    if (error) throw error;

    const emoji = type === "revenue" ? "💰" : "💸";
    await notifyTelegram(`${emoji} *${type === "revenue" ? "Revenu" : "Dépense"} via API*\n\n• ${montant} ${devise}\n• ${motif}\n• Compte: ${compte}`);

    return jsonResponse({ success: true, transaction: result });

  } catch (error) {
    console.error("Webhook error:", error);
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});

// ─── Helpers ──────────────────────────────────────────────────

async function findCompteId(supabase: any, compteName: string): Promise<string> {
  const { data, error } = await supabase
    .from("comptes_financiers")
    .select("id")
    .ilike("nom", `%${compteName}%`)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new Error(`Compte "${compteName}" non trouvé`);
  }
  return data.id;
}

async function notifyTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: "Markdown",
      }),
    });
  } catch (e) {
    console.error("Telegram notification failed:", e);
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
