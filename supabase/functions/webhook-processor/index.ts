// @ts-nocheck - Deno Edge Function (TypeScript errors are normal in IDE)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookLog {
  log_id: string;
  webhook_id: string;
  webhook_url: string;
  webhook_format: string;
  event_type: string;
  payload: any;
  webhook_secret: string | null;
}

// Formater le payload selon le format
function formatPayload(format: string, payload: any): any {
  const data = payload.data || {};
  const event = payload.event || 'unknown';

  switch (format) {
    case 'discord':
      return formatDiscordEmbed(event, data);
    case 'slack':
      return formatSlackMessage(event, data);
    case 'n8n':
      return {
        event,
        timestamp: payload.timestamp,
        data,
        metadata: {
          source: 'facturex-api',
          version: '1.0',
          webhook_id: payload.webhook_id,
        }
      };
    case 'json':
    default:
      return payload;
  }
}

// Format Discord Embed
function formatDiscordEmbed(event: string, data: any) {
  const eventConfig: Record<string, { title: string; color: number }> = {
    'transaction.created': { title: 'Nouvelle Transaction', color: 3447003 },
    'transaction.validated': { title: 'Transaction Servie', color: 3066993 },
    'transaction.deleted': { title: '🗑️ Transaction Supprimée', color: 15158332 },
    'paiement.created': { title: '💰 Encaissement Reçu', color: 5763719 },
    'paiement.updated': { title: '💰 Encaissement Modifié', color: 10181046 },
    'paiement.deleted': { title: '🗑️ Encaissement Supprimé', color: 15158332 },
    'facture.created': { title: 'Nouvelle Facture', color: 3447003 },
    'facture.validated': { title: 'Facture Validée', color: 3066993 },
    'facture.paid': { title: 'Facture Payée', color: 5763719 },
    'facture.deleted': { title: '🗑️ Facture Supprimée', color: 15158332 },
    'client.created': { title: 'Nouveau Client', color: 3447003 },
    'client.updated': { title: 'Client Mis à Jour', color: 10181046 },
    'client.deleted': { title: '🗑️ Client Supprimé', color: 15158332 },
    'colis.created': { title: 'Nouveau Colis', color: 3447003 },
    'colis.delivered': { title: 'Colis Livré', color: 3066993 },
    'colis.status_changed': { title: 'Statut Colis Changé', color: 10181046 },
    'colis.deleted': { title: '🗑️ Colis Supprimé', color: 15158332 },
  };

  const config = eventConfig[event] || { title: event, color: 9807270 };
  let description = '';

  // Description pour transactions
  if (event.startsWith('transaction.')) {
    const parts: string[] = [];
    
    if (data.client?.nom) {
      parts.push(`**Client:** ${data.client.nom}`);
    }
    if (data.montant) {
      parts.push(`**Montant:** $${data.montant} ${data.devise || 'USD'}`);
    }
    // Montant CNY si présent
    if (data.montant_cny) {
      parts.push(`**Montant CNY:** ¥${data.montant_cny}`);
    }
    // Taux de change si présent
    if (data.taux) {
      parts.push(`**Taux:** ${data.taux}`);
    }
    if (data.benefice) {
      parts.push(`**Bénéfice:** $${data.benefice} ${data.devise || 'USD'}`);
    }
    // Frais si présents
    if (data.frais) {
      parts.push(`**Frais:** $${data.frais}`);
    }
    if (data.mode_paiement) {
      parts.push(`**Mode:** ${data.mode_paiement}`);
    }
    if (data.motif) {
      parts.push(`**Motif:** ${data.motif}`);
    }
    if (data.statut) {
      parts.push(`**Statut:** ${data.statut}`);
    }
    if (data.user_info) {
      const userName = [data.user_info.prenom, data.user_info.nom].filter(Boolean).join(' ') || data.user_info.email || 'Utilisateur inconnu';
      parts.push(`\n**Effectué par:** ${userName}`);
    }
    
    description = parts.join('\n');
  }

  // Description pour factures
  if (event.startsWith('facture.')) {
    const parts: string[] = [];
    
    if (data.facture_number) {
      parts.push(`**Numéro:** ${data.facture_number}`);
    }
    if (data.client?.nom) {
      parts.push(`**Client:** ${data.client.nom}`);
    }
    if (data.total_general) {
      parts.push(`**Total:** ${data.total_general} ${data.devise || 'USD'}`);
    }
    if (data.statut) {
      parts.push(`**Statut:** ${data.statut}`);
    }
    if (data.user_info) {
      const userName = [data.user_info.prenom, data.user_info.nom].filter(Boolean).join(' ') || data.user_info.email || 'Utilisateur inconnu';
      parts.push(`\n**Effectué par:** ${userName}`);
    }
    
    description = parts.join('\n');
  }

  // Description pour clients
  if (event.startsWith('client.')) {
    const parts: string[] = [];
    
    if (data.nom) {
      parts.push(`**Nom:** ${data.nom}`);
    }
    if (data.telephone) {
      parts.push(`**Téléphone:** ${data.telephone}`);
    }
    if (data.ville) {
      parts.push(`**Ville:** ${data.ville}`);
    }
    if (data.total_paye) {
      parts.push(`**Total Payé:** ${data.total_paye} USD`);
    }
    if (data.user_info) {
      const userName = [data.user_info.prenom, data.user_info.nom].filter(Boolean).join(' ') || data.user_info.email || 'Utilisateur inconnu';
      parts.push(`\n**Effectué par:** ${userName}`);
    }
    
    description = parts.join('\n');
  }

  // Description pour colis
  if (event.startsWith('colis.')) {
    const parts: string[] = [];
    
    if (data.tracking_chine) {
      parts.push(`**Tracking:** ${data.tracking_chine}`);
    }
    if (data.client?.nom) {
      parts.push(`**Client:** ${data.client.nom}`);
    }
    if (data.poids) {
      parts.push(`**Poids:** ${data.poids} kg`);
    }
    if (data.montant_a_payer) {
      parts.push(`**Montant:** ${data.montant_a_payer} USD`);
    }
    if (data.statut) {
      parts.push(`**Statut:** ${data.statut}`);
    }
    if (data.type_livraison) {
      parts.push(`**Type:** ${data.type_livraison}`);
    }
    if (data.user_info) {
      const userName = [data.user_info.prenom, data.user_info.nom].filter(Boolean).join(' ') || data.user_info.email || 'Utilisateur inconnu';
      parts.push(`\n**Effectué par:** ${userName}`);
    }
    
    description = parts.join('\n');
  }

  // Description pour paiements (encaissements)
  if (event.startsWith('paiement.')) {
    const parts: string[] = [];
    
    if (data.type_paiement) {
      const typeLabel = data.type_paiement === 'facture' ? 'Facture' : 'Colis';
      parts.push(`**Type:** ${typeLabel}`);
    }
    if (data.client?.nom) {
      parts.push(`**Client:** ${data.client.nom}`);
      if (data.client.telephone) {
        parts.push(`**Téléphone:** ${data.client.telephone}`);
      }
    }
    if (data.montant_paye) {
      parts.push(`**Montant:** $${data.montant_paye} USD`);
    }
    if (data.mode_paiement) {
      parts.push(`**Mode:** ${data.mode_paiement}`);
    }
    if (data.compte_nom) {
      parts.push(`**Compte:** ${data.compte_nom}`);
    }
    if (data.facture_number) {
      parts.push(`**N° Facture:** ${data.facture_number}`);
    }
    if (data.colis_tracking) {
      parts.push(`**Tracking:** ${data.colis_tracking}`);
    }
    if (data.notes) {
      parts.push(`**Notes:** ${data.notes}`);
    }
    if (data.user_info) {
      const userName = [data.user_info.prenom, data.user_info.nom].filter(Boolean).join(' ') || data.user_info.email || 'Utilisateur inconnu';
      parts.push(`\n**Effectué par:** ${userName}`);
    }
    
    description = parts.join('\n');
  }

  return {
    embeds: [{
      title: config.title,
      description: description || 'Aucune information disponible',
      color: config.color,
      footer: { text: 'FactureX' },
      timestamp: new Date().toISOString(),
    }],
  };
}

// Format Slack Message
function formatSlackMessage(event: string, data: any) {
  return {
    text: `New ${event} event`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${event}*\n\`\`\`${JSON.stringify(data, null, 2)}\`\`\``,
        },
      },
    ],
  };
}

// Envoyer le webhook
async function sendWebhook(log: WebhookLog): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const formattedPayload = formatPayload(log.webhook_format, log.payload);
    
    const response = await fetch(log.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FactureX-Webhook/1.0',
      },
      body: JSON.stringify(formattedPayload),
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
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Récupérer les webhooks en attente
    const { data: pendingLogs, error: fetchError } = await supabaseClient.rpc(
      'process_pending_webhooks',
      { p_limit: 10 }
    );

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingLogs || pendingLogs.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending webhooks', processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enrichir les logs avec les infos utilisateur ET client
    const enrichedLogs = await Promise.all(
      pendingLogs.map(async (log: WebhookLog) => {
        const payload = log.payload || {};
        const data = payload.data || {};
        
        // Si created_by existe, récupérer les infos utilisateur
        if (data.created_by) {
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('id', data.created_by)
            .single();
          
          if (profile) {
            // Ajouter user_info au payload
            log.payload = {
              ...payload,
              data: {
                ...data,
                user_info: {
                  id: profile.id,
                  prenom: profile.first_name,
                  nom: profile.last_name,
                  email: profile.email
                }
              }
            };
          }
        }
        
        // Si client_id existe, récupérer les infos du client
        if (data.client_id) {
          const { data: client } = await supabaseClient
            .from('clients')
            .select('id, nom, telephone, ville')
            .eq('id', data.client_id)
            .single();
          
          if (client) {
            // Ajouter client au payload
            log.payload = {
              ...log.payload,
              data: {
                ...log.payload.data,
                client: {
                  id: client.id,
                  nom: client.nom,
                  telephone: client.telephone,
                  ville: client.ville
                }
              }
            };
          }
        }
        
        return log;
      })
    );

    // Traiter chaque webhook enrichi
    const results = await Promise.all(
      enrichedLogs.map(async (log: WebhookLog) => {
        const result = await sendWebhook(log);

        // Mettre à jour le log
        await supabaseClient
          .from('webhook_logs')
          .update({
            status: result.success ? 'success' : 'failed',
            sent_at: new Date().toISOString(),
            response_status: result.status,
            error_message: result.error || null,
          })
          .eq('id', log.log_id);

        return {
          log_id: log.log_id,
          webhook_id: log.webhook_id,
          success: result.success,
          status: result.status,
          error: result.error,
        };
      })
    );

    return new Response(
      JSON.stringify({
        message: 'Webhooks processed',
        processed: results.length,
        success: results.filter((r: { success: boolean }) => r.success).length,
        failed: results.filter((r: { success: boolean }) => !r.success).length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error processing webhooks:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
