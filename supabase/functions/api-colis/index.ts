/**
 * API Endpoint: GET /api-colis
 * Returns filtered colis (parcels) data for external integrations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/api-auth.ts';
import { successResponse, Errors } from '../_shared/api-response.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-organization-id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
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
    const authResult = await authenticateRequest(req, 'read:colis');
    
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
    const filters = {
      statut: url.searchParams.get('statut') || undefined,
      statut_paiement: url.searchParams.get('statut_paiement') || undefined,
      type_livraison: url.searchParams.get('type_livraison') as 'aerien' | 'maritime' | undefined,
      client_id: url.searchParams.get('client_id') || undefined,
      date_from: url.searchParams.get('date_from') || undefined,
      date_to: url.searchParams.get('date_to') || undefined,
      min_poids: url.searchParams.get('min_poids') ? parseFloat(url.searchParams.get('min_poids')!) : undefined,
      tracking: url.searchParams.get('tracking') || undefined,
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50'), 100),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from('colis')
      .select(`
        id,
        type_livraison,
        fournisseur,
        tracking_chine,
        numero_commande,
        quantite,
        poids,
        contenu_description,
        tarif_kg,
        montant_a_payer,
        date_expedition,
        date_arrivee_agence,
        statut,
        statut_paiement,
        notes,
        created_at,
        client:clients(id, nom, telephone, ville),
        transitaire:transitaires(id, nom, telephone)
      `, { count: 'exact' })
      .eq('organization_id', keyData.organization_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.statut) {
      query = query.eq('statut', filters.statut);
    }
    if (filters.statut_paiement) {
      query = query.eq('statut_paiement', filters.statut_paiement);
    }
    if (filters.type_livraison) {
      query = query.eq('type_livraison', filters.type_livraison);
    }
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.date_from) {
      query = query.gte('created_at', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('created_at', filters.date_to);
    }
    if (filters.min_poids) {
      query = query.gte('poids', filters.min_poids);
    }
    if (filters.tracking) {
      query = query.ilike('tracking_chine', `%${filters.tracking}%`);
    }

    query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch colis')),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = successResponse(
      { colis: data || [] },
      {
        organization_id: keyData.organization_id,
        response_time_ms: Date.now() - startTime,
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
