/**
 * API Endpoint: GET /api-clients
 * Returns filtered client data for external integrations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/api-auth.ts';
import { successResponse, Errors } from '../_shared/api-response.ts';
import type { ClientFilters } from '../_shared/api-types.ts';

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
    const authResult = await authenticateRequest(req, 'read:clients');
    
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
    const filters: ClientFilters = {
      search: url.searchParams.get('search') || undefined,
      ville: url.searchParams.get('ville') || undefined,
      has_transactions: url.searchParams.get('has_transactions') === 'true' || undefined,
      min_total: url.searchParams.get('min_total') ? parseFloat(url.searchParams.get('min_total')!) : undefined,
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50'), 100),
      offset: parseInt(url.searchParams.get('offset') || '0'),
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('organization_id', keyData.organization_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters.search) {
      query = query.or(`nom.ilike.%${filters.search}%,telephone.ilike.%${filters.search}%`);
    }
    if (filters.ville) {
      query = query.eq('ville', filters.ville);
    }
    if (filters.min_total) {
      query = query.gte('total_paye', filters.min_total);
    }
    if (filters.has_transactions) {
      query = query.gt('total_paye', 0);
    }

    query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch clients')),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = successResponse(
      { clients: data || [] },
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
