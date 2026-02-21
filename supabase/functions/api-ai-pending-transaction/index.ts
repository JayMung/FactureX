/**
 * API Endpoint: POST /v1/api-ai-pending-transaction
 * 
 * Submits a pending transaction for human approval.
 * This endpoint is EXCLUSIVELY for ai_agent API keys.
 * 
 * ─── WHY ai_agent CANNOT WRITE TO transactions ─────────────────────────
 * AI agents are machine actors with no human judgement. Allowing them to
 * insert directly into the `transactions` table would bypass the financial
 * approval workflow, potentially creating unauthorized debits/credits.
 * The AI_AGENT_RESTRICTIONS.canBypassApproval = false constant enforces
 * this at the middleware level (see api-auth.ts → enforceAiAgentRestrictions).
 * 
 * ─── WHY THE PENDING WORKFLOW EXISTS ────────────────────────────────────
 * Every ai_agent write goes into `ai_pending_transactions` with status
 * "pending_approval". A human admin must review and approve/reject it
 * before it is promoted to the real `transactions` table. This is a
 * defense-in-depth measure against:
 *   - Hallucinated amounts or wrong accounts
 *   - Replay attacks or automated fraud
 *   - Accidental double-entries
 * 
 * ─── WHY DRY-RUN EXISTS ────────────────────────────────────────────────
 * The ?dry_run=true mode lets the AI agent preview the financial impact
 * of a transaction (account balances, fees, commissions) WITHOUT inserting
 * anything into the database. This is useful for:
 *   - Validating input before committing
 *   - Showing the user a preview in a chat interface
 *   - Testing the endpoint without side effects
 * 
 * Versioned routes:
 *   POST /v1/api-ai-pending-transaction   — current (recommended)
 *   POST /api-ai-pending-transaction       — legacy (deprecated)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.22.4';
import { authenticateRequest, logApiRequest } from '../_shared/api-auth.ts';
import { versionedJsonResponse } from '../_shared/api-response.ts';
import { withVersionHeaders, getVersionMeta } from '../_shared/api-version.ts';
import {
  fetchRatesAndFees,
  calculateTransactionAmounts,
} from '../_shared/financial-calculations.ts';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FUNCTION_NAME = 'api-ai-pending-transaction';

/** Hard limit on montant for AI agent submissions */
const AI_MONTANT_LIMIT = 10000;

// ============================================================================
// Zod Validation Schema
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PendingTransactionSchema = z.object({
  montant: z
    .number({ required_error: 'montant is required', invalid_type_error: 'montant must be a number' })
    .positive('montant must be greater than 0')
    .max(AI_MONTANT_LIMIT, `montant must be <= ${AI_MONTANT_LIMIT} (AI agent hard limit)`),

  devise: z.enum(['USD', 'CDF', 'CNY'], {
    required_error: 'devise is required',
    invalid_type_error: 'devise must be one of: USD, CDF, CNY',
  }),

  type_transaction: z.enum(['revenue', 'depense', 'transfert'], {
    required_error: 'type_transaction is required',
    invalid_type_error: 'type_transaction must be one of: revenue, depense, transfert',
  }),

  motif: z
    .string({ required_error: 'motif is required' })
    .min(3, 'motif must be at least 3 characters'),

  client_id: z
    .string()
    .regex(UUID_REGEX, 'client_id must be a valid UUID')
    .optional(),

  compte_source_id: z
    .string({ required_error: 'compte_source_id is required' })
    .regex(UUID_REGEX, 'compte_source_id must be a valid UUID'),

  compte_destination_id: z
    .string()
    .regex(UUID_REGEX, 'compte_destination_id must be a valid UUID')
    .optional(),

  categorie_id: z
    .string()
    .regex(UUID_REGEX, 'categorie_id must be a valid UUID')
    .optional(),
}).superRefine((data, ctx) => {
  // For transfert: compte_destination_id is required
  if (data.type_transaction === 'transfert' && !data.compte_destination_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'compte_destination_id is required for transfert transactions',
      path: ['compte_destination_id'],
    });
  }
});

// ============================================================================
// CORS Headers
// ============================================================================

const baseCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-api-key, x-organization-id, x-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  const corsHeaders = withVersionHeaders(baseCorsHeaders, req, FUNCTION_NAME);

  // ─── CORS preflight ────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ─── Method check: POST only ───────────────────────────────────
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Only POST is accepted.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();

  try {
    // ─── SECURITY STEP 1: Authenticate with write:pending_transactions ─
    // This calls authenticateRequest which enforces:
    //   ① Key validation  ② Permission check  ③ AI agent restrictions  ④ Rate limiting
    // All checks pass BEFORE any business logic executes.
    const authResult = await authenticateRequest(req, 'write:pending_transactions');

    if ('error' in authResult) {
      return new Response(
        authResult.error.body,
        {
          status: authResult.error.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { keyData } = authResult;

    // ─── SECURITY STEP 2: Enforce ai_agent-only access ───────────
    // Even though authenticateRequest checks permissions, we add an
    // explicit type guard. Only ai_agent keys may use this endpoint.
    // This prevents a secret or admin key from accidentally submitting
    // to the pending workflow instead of the direct transactions table.
    if (keyData.type !== 'ai_agent') {
      await logApiRequest(keyData, req, 403, Date.now() - startTime, 'Non-ai_agent key attempted access');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Only ai_agent API keys are allowed to use this endpoint. ' +
              'Use a secret or admin key with the standard transactions endpoint instead.',
          },
          meta: { generated_at: new Date().toISOString(), organization_id: keyData.organization_id },
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Parse and validate request body ─────────────────────────
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      await logApiRequest(keyData, req, 400, Date.now() - startTime, 'Invalid JSON body');
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters', details: { body: 'Request body must be valid JSON' } },
          meta: { generated_at: new Date().toISOString(), organization_id: keyData.organization_id },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── SECURITY STEP 3: Strict Zod validation ──────────────────
    const parseResult = PendingTransactionSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const fieldErrors = parseResult.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      await logApiRequest(keyData, req, 400, Date.now() - startTime, 'Validation failed');
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters', details: fieldErrors },
          meta: { generated_at: new Date().toISOString(), organization_id: keyData.organization_id },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = parseResult.data;

    // ─── Initialize Supabase client (scoped by organization_id) ──
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── Verify referenced entities exist in the same org ────────
    // Verify compte_source_id
    const { data: sourceCompte, error: sourceError } = await supabase
      .from('comptes_financiers')
      .select('id, nom, solde_actuel, devise')
      .eq('id', body.compte_source_id)
      .eq('is_active', true)
      .single();

    if (sourceError || !sourceCompte) {
      await logApiRequest(keyData, req, 400, Date.now() - startTime, 'Invalid compte_source_id');
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters', details: { compte_source_id: `Account not found or inactive: ${body.compte_source_id}` } },
          meta: { generated_at: new Date().toISOString(), organization_id: keyData.organization_id },
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify compte_destination_id if provided
    let destCompte: { id: string; nom: string; solde_actuel: number; devise: string } | null = null;
    if (body.compte_destination_id) {
      const { data: dest, error: destError } = await supabase
        .from('comptes_financiers')
        .select('id, nom, solde_actuel, devise')
        .eq('id', body.compte_destination_id)
        .eq('is_active', true)
        .single();

      if (destError || !dest) {
        await logApiRequest(keyData, req, 400, Date.now() - startTime, 'Invalid compte_destination_id');
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters', details: { compte_destination_id: `Account not found or inactive: ${body.compte_destination_id}` } },
            meta: { generated_at: new Date().toISOString(), organization_id: keyData.organization_id },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      destCompte = dest;
    }

    // Verify client_id if provided
    if (body.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', body.client_id)
        .single();

      if (clientError || !client) {
        await logApiRequest(keyData, req, 400, Date.now() - startTime, 'Invalid client_id');
        return new Response(
          JSON.stringify({
            success: false,
            error: { code: 'VALIDATION_ERROR', message: 'Invalid request parameters', details: { client_id: `Client not found: ${body.client_id}` } },
            meta: { generated_at: new Date().toISOString(), organization_id: keyData.organization_id },
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // ─── Fetch exchange rates and fees from DB ───────────────────
    // Reuses the shared financial-calculations module (ported from
    // src/hooks/transactions/calculations.ts) to avoid duplicating
    // business logic.
    const { rates, fees } = await fetchRatesAndFees(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ─── Calculate financial impact preview ──────────────────────
    const calculated = calculateTransactionAmounts(
      body.montant,
      body.devise,
      body.motif,
      body.type_transaction,
      rates,
      fees
    );

    // Build impact preview
    const impactPreview: Record<string, unknown> = {
      compte_source_solde_avant: sourceCompte.solde_actuel,
      frais_calcules: Math.round(calculated.frais * 100) / 100,
      commission_partenaire: Math.round(
        (body.montant * (fees.partenaire / 100)) * 100
      ) / 100,
      benefice_estime: Math.round(calculated.benefice * 100) / 100,
      taux_usd_cny: calculated.taux_usd_cny,
      taux_usd_cdf: calculated.taux_usd_cdf,
    };

    // Compute projected balances based on transaction type
    if (body.type_transaction === 'depense') {
      impactPreview.compte_source_solde_apres =
        Math.round((sourceCompte.solde_actuel - body.montant) * 100) / 100;
    } else if (body.type_transaction === 'revenue') {
      // For revenue, source is the destination account (money comes IN)
      impactPreview.compte_source_solde_apres =
        Math.round((sourceCompte.solde_actuel + body.montant) * 100) / 100;
    } else if (body.type_transaction === 'transfert') {
      impactPreview.compte_source_solde_apres =
        Math.round((sourceCompte.solde_actuel - body.montant) * 100) / 100;
      if (destCompte) {
        impactPreview.compte_destination_solde_avant = destCompte.solde_actuel;
        impactPreview.compte_destination_solde_apres =
          Math.round((destCompte.solde_actuel + body.montant) * 100) / 100;
      }
    }

    // ─── DRY RUN MODE ────────────────────────────────────────────
    // If ?dry_run=true, return the preview without inserting anything.
    // This lets the AI agent validate input and show the user a preview
    // before committing to the pending workflow.
    const url = new URL(req.url);
    const isDryRun = url.searchParams.get('dry_run') === 'true';

    if (isDryRun) {
      // Log the dry run request for audit
      await logAuditWithBody(supabase, keyData, req, 200, Date.now() - startTime, rawBody, null);

      const versionMeta = getVersionMeta(req, FUNCTION_NAME);
      return versionedJsonResponse(
        {
          dry_run: true,
          validated: true,
          impact_preview: impactPreview,
        },
        {
          organization_id: keyData.organization_id,
          response_time_ms: Date.now() - startTime,
          ...versionMeta,
        },
        corsHeaders
      );
    }

    // ─── NORMAL MODE: Insert into ai_pending_transactions ────────
    // SECURITY: We NEVER write to the `transactions` table.
    // The record goes into `ai_pending_transactions` with status
    // "pending_approval" and must be reviewed by a human admin.
    //
    // ATOMICITY: Supabase JS client .insert() is a single atomic
    // operation at the Postgres level. For more complex multi-table
    // writes, use .rpc() with a Postgres function. Here, a single
    // insert is sufficient.

    const insertData = {
      organization_id: keyData.organization_id,
      montant: body.montant,
      devise: body.devise,
      type_transaction: body.type_transaction,
      motif: body.motif,
      client_id: body.client_id || null,
      compte_source_id: body.compte_source_id,
      compte_destination_id: body.compte_destination_id || null,
      categorie_id: body.categorie_id || null,
      status: 'pending_approval',
      created_by: 'ai_agent',
      source: 'ai_agent',
      api_key_id: keyData.id,
      impact_preview: impactPreview,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('ai_pending_transactions')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert pending transaction:', insertError);
      await logAuditWithBody(supabase, keyData, req, 500, Date.now() - startTime, rawBody, insertError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Failed to create pending transaction' },
          meta: { generated_at: new Date().toISOString(), organization_id: keyData.organization_id },
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ─── Log successful request with full body ───────────────────
    await logAuditWithBody(supabase, keyData, req, 201, Date.now() - startTime, rawBody, null);

    // ─── Return success response ─────────────────────────────────
    const versionMeta = getVersionMeta(req, FUNCTION_NAME);
    return versionedJsonResponse(
      {
        pending_transaction: inserted,
        impact_preview: impactPreview,
      },
      {
        organization_id: keyData.organization_id,
        response_time_ms: Date.now() - startTime,
        ...versionMeta,
      },
      corsHeaders,
      201
    );

  } catch (error) {
    console.error('Unhandled error in api-ai-pending-transaction:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: (error as Error).message || 'Internal server error' },
        meta: { generated_at: new Date().toISOString(), organization_id: '' },
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Helpers
// ============================================================================

/**
 * Log API request with full request body into api_audit_logs.
 * 
 * SECURITY: The request_body column stores the full payload for
 * audit-sensitive endpoints. This enables post-incident forensics
 * on what the AI agent submitted.
 */
async function logAuditWithBody(
  supabase: ReturnType<typeof createClient>,
  keyData: { id: string; organization_id: string },
  req: Request,
  statusCode: number,
  responseTimeMs: number,
  requestBody: unknown,
  errorMessage: string | null
): Promise<void> {
  try {
    const url = new URL(req.url);
    await supabase.from('api_audit_logs').insert({
      organization_id: keyData.organization_id,
      api_key_id: keyData.id,
      endpoint: url.pathname,
      method: req.method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
      error_message: errorMessage,
      request_body: requestBody,
    });
  } catch (logError) {
    // Logging failure must never break the request
    console.error('Failed to log audit entry:', logError);
  }
}
