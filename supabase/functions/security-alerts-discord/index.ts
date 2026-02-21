// @ts-nocheck - Deno Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Severity → Discord embed color mapping
const SEVERITY_COLORS: Record<string, number> = {
  critical: 15158332, // Red
  high: 15105570, // Orange
  medium: 16776960, // Yellow
  low: 3447003, // Blue
};

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🚨",
  high: "⚠️",
  medium: "🔔",
  low: "ℹ️",
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  ROLE_CHANGE: "Changement de Rôle",
  RATE_MODIFICATION: "Modification Taux de Change",
  SENSITIVE_DELETE: "Suppression Sensible",
  FACTURE_SPIKE: "Pic Anormal de Factures",
};

interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  source_table: string | null;
  organization_id: string | null;
  metadata: Record<string, any>;
  status: string;
  created_at: string;
}

function formatAlertForDiscord(alert: SecurityAlert) {
  const emoji = SEVERITY_EMOJI[alert.severity] || "🔔";
  const color = SEVERITY_COLORS[alert.severity] || 9807270;
  const typeLabel =
    ALERT_TYPE_LABELS[alert.alert_type] || alert.alert_type;

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    {
      name: "Type",
      value: typeLabel,
      inline: true,
    },
    {
      name: "Sévérité",
      value: `${emoji} ${alert.severity.toUpperCase()}`,
      inline: true,
    },
    {
      name: "Statut",
      value: alert.status,
      inline: true,
    },
  ];

  if (alert.source_table) {
    fields.push({
      name: "Table",
      value: alert.source_table,
      inline: true,
    });
  }

  // Add metadata-specific fields
  const meta = alert.metadata || {};

  if (alert.alert_type === "ROLE_CHANGE") {
    if (meta.target_email) {
      fields.push({
        name: "Utilisateur",
        value: meta.target_email,
        inline: true,
      });
    }
    if (meta.old_role && meta.new_role) {
      fields.push({
        name: "Changement",
        value: `${meta.old_role} → ${meta.new_role}`,
        inline: true,
      });
    }
  }

  if (alert.alert_type === "RATE_MODIFICATION") {
    if (meta.setting_key) {
      fields.push({
        name: "Paramètre",
        value: meta.setting_key,
        inline: true,
      });
    }
    if (meta.old_value && meta.new_value) {
      fields.push({
        name: "Valeur",
        value: `${meta.old_value} → ${meta.new_value}`,
        inline: true,
      });
    }
  }

  if (alert.alert_type === "SENSITIVE_DELETE" && meta.table) {
    fields.push({
      name: "Enregistrement",
      value: meta.table,
      inline: true,
    });
  }

  if (alert.alert_type === "FACTURE_SPIKE") {
    if (meta.hourly_count) {
      fields.push({
        name: "Factures/heure",
        value: `${meta.hourly_count}`,
        inline: true,
      });
    }
    if (meta.threshold) {
      fields.push({
        name: "Seuil",
        value: `${meta.threshold}`,
        inline: true,
      });
    }
  }

  return {
    embeds: [
      {
        title: `${emoji} ${alert.title}`,
        description: alert.description || "Aucune description",
        color,
        fields,
        footer: { text: "FactureX Security" },
        timestamp: alert.created_at,
      },
    ],
    username: "FactureX Security Bot",
  };
}

async function sendToDiscord(
  webhookUrl: string,
  payload: any
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "FactureX-Security/1.0",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        status: response.status,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return { success: true, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth guard: service_role key, anon key (for pg_cron), or custom secret
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const alertSecret = Deno.env.get("SECURITY_ALERTS_SECRET") || "";

  const authHeader = req.headers.get("authorization") || "";
  const customSecret = req.headers.get("x-security-alerts-secret") || "";
  const bearerToken = authHeader.replace("Bearer ", "").trim();

  const isAuthorizedBySecret = alertSecret && customSecret === alertSecret;
  const isAuthorizedByServiceRole =
    serviceRoleKey && bearerToken === serviceRoleKey;
  const isAuthorizedByAnonKey = anonKey && bearerToken === anonKey;

  if (!isAuthorizedBySecret && !isAuthorizedByServiceRole && !isAuthorizedByAnonKey) {
    console.error("Unauthorized security-alerts-discord attempt");
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get Discord webhook URL from settings or env
    let discordWebhookUrl = Deno.env.get("DISCORD_SECURITY_WEBHOOK_URL") || "";

    // Fallback: read from webhooks table (admin-configured)
    if (!discordWebhookUrl) {
      const { data: webhook } = await supabaseClient
        .from("webhooks")
        .select("url")
        .eq("is_active", true)
        .eq("format", "discord")
        .limit(1)
        .single();

      if (webhook?.url) {
        discordWebhookUrl = webhook.url;
      }
    }

    if (!discordWebhookUrl) {
      return new Response(
        JSON.stringify({
          error: "No Discord webhook URL configured",
          hint: "Set DISCORD_SECURITY_WEBHOOK_URL env var or configure a Discord webhook in settings",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch pending alerts via RPC
    const { data: pendingAlerts, error: fetchError } =
      await supabaseClient.rpc("get_pending_security_alerts", {
        p_limit: 10,
      });

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingAlerts || pendingAlerts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending alerts", sent: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send each alert to Discord
    const results: Array<{
      alert_id: string;
      success: boolean;
      error?: string;
    }> = [];
    const sentIds: string[] = [];

    for (const alert of pendingAlerts as SecurityAlert[]) {
      const discordPayload = formatAlertForDiscord(alert);
      const result = await sendToDiscord(discordWebhookUrl, discordPayload);

      results.push({
        alert_id: alert.id,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        sentIds.push(alert.id);
      }

      // Rate limit: Discord allows 30 requests per minute per webhook
      // Wait 2s between messages to be safe
      if (pendingAlerts.indexOf(alert) < pendingAlerts.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Mark successfully sent alerts
    if (sentIds.length > 0) {
      const { data: markedCount, error: markError } =
        await supabaseClient.rpc("mark_alerts_discord_sent", {
          p_alert_ids: sentIds,
        });

      if (markError) {
        console.error("Error marking alerts as sent:", markError);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Security alerts processed",
        total: pendingAlerts.length,
        sent: sentIds.length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing security alerts:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
