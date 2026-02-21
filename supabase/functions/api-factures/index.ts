/**
 * API Endpoint: GET /v1/api-factures
 * Returns filtered facture/devis data for external integrations
 * 
 * Versioned routes:
 *   GET /v1/api-factures   — current (recommended)
 *   GET /api-factures       — legacy (deprecated, supported until 2026-06-01)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/api-auth.ts';
import { successResponse, Errors } from '../_shared/api-response.ts';
import { withVersionHeaders, getVersionMeta } from '../_shared/api-version.ts';
import type { FactureFilters } from '../_shared/api-types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FUNCTION_NAME = 'api-factures';

const baseCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-organization-id, x-api-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Build version-aware headers for this request
  const corsHeaders = withVersionHeaders(baseCorsHeaders, req, FUNCTION_NAME);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();

  try {
    const authResult = await authenticateRequest(req, 'read:factures');
    
    if ('error' in authResult) {
      return new Response(
        authResult.error.body,
        { 
          status: authResult.error.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { keyData } = authResult;
    
    const url = new URL(req.url);
    const filters: FactureFilters = {
      type: (url.searchParams.get('type') as 'facture' | 'devis') || undefined,
      statut: url.searchParams.get('statut') || undefined,
      client_id: url.searchParams.get('client_id') || undefined,
      date_from: url.searchParams.get('date_from') || undefined,
      date_to: url.searchParams.get('date_to') || undefined,
      include_items: url.searchParams.get('include_items') === 'true',
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50'), 100),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build select query
    const selectFields = filters.include_items
      ? `
          id,
          facture_number,
          type,
          statut,
          date_emission,
          date_validation,
          mode_livraison,
          devise,
          shipping_fee,
          subtotal,
          total_poids,
          frais,
          frais_transport_douane,
          total_general,
          notes,
          created_at,
          client:clients(id, nom, telephone, ville),
          items:facture_items(
            id,
            numero_ligne,
            quantite,
            description,
            prix_unitaire,
            poids,
            montant_total
          )
        `
      : `
          id,
          facture_number,
          type,
          statut,
          date_emission,
          mode_livraison,
          devise,
          total_general,
          created_at,
          client:clients(id, nom, telephone, ville)
        `;

    let query = supabase
      .from('factures')
      .select(selectFields, { count: 'exact' })
      .eq('organization_id', keyData.organization_id)
      .order('date_emission', { ascending: false });

    // Apply filters
    if (filters.type) {
      query = query.eq('type', filters.type);
    }
    if (filters.statut) {
      query = query.eq('statut', filters.statut);
    }
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.date_from) {
      query = query.gte('date_emission', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date_emission', filters.date_to);
    }

    query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch factures')),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add items_count for each facture
    const facturesWithCount = (data || []).map(facture => ({
      ...facture,
      items_count: facture.items?.length || 0
    }));

    const versionMeta = getVersionMeta(req, FUNCTION_NAME);
    const response = successResponse(
      { factures: facturesWithCount },
      {
        organization_id: keyData.organization_id,
        response_time_ms: Date.now() - startTime,
        ...versionMeta,
      },
      {
        total: count || 0,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        has_more: (count || 0) > (filters.offset || 0) + (filters.limit || 50),
      }
    );

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify(Errors.INTERNAL_ERROR(error.message)),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
