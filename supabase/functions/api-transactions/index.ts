/**
 * API Endpoint: GET /api-transactions
 * Returns filtered transaction data for external integrations (n8n, Discord, etc.)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/api-auth.ts';
import { successResponse, Errors } from '../_shared/api-response.ts';
import type { TransactionFilters } from '../_shared/api-types.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-organization-id',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req, 'read:transactions');
    
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
    
    // Parse query parameters
    const url = new URL(req.url);
    const filters: TransactionFilters = {
      status: url.searchParams.get('status') || undefined,
      currency: (url.searchParams.get('currency') as 'USD' | 'CDF') || undefined,
      client_id: url.searchParams.get('client_id') || undefined,
      date_from: url.searchParams.get('date_from') || undefined,
      date_to: url.searchParams.get('date_to') || undefined,
      min_amount: url.searchParams.get('min_amount') ? parseFloat(url.searchParams.get('min_amount')!) : undefined,
      max_amount: url.searchParams.get('max_amount') ? parseFloat(url.searchParams.get('max_amount')!) : undefined,
      motif: url.searchParams.get('motif') || undefined,
      type_transaction: (url.searchParams.get('type_transaction') as any) || undefined,
      limit: Math.min(parseInt(url.searchParams.get('limit') || '50'), 100), // Max 100
      offset: parseInt(url.searchParams.get('offset') || '0'),
    };

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query
    let query = supabase
      .from('transactions')
      .select(`
        id,
        date_paiement,
        montant,
        devise,
        motif,
        frais,
        benefice,
        mode_paiement,
        statut,
        type_transaction,
        categorie,
        notes,
        created_at,
        client:clients(id, nom, telephone, ville)
      `, { count: 'exact' })
      .eq('organization_id', keyData.organization_id)
      .order('date_paiement', { ascending: false });

    // Apply filters
    if (filters.status) {
      query = query.eq('statut', filters.status);
    }
    if (filters.currency) {
      query = query.eq('devise', filters.currency);
    }
    if (filters.client_id) {
      query = query.eq('client_id', filters.client_id);
    }
    if (filters.date_from) {
      query = query.gte('date_paiement', filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte('date_paiement', filters.date_to);
    }
    if (filters.min_amount) {
      query = query.gte('montant', filters.min_amount);
    }
    if (filters.max_amount) {
      query = query.lte('montant', filters.max_amount);
    }
    if (filters.motif) {
      query = query.ilike('motif', `%${filters.motif}%`);
    }
    if (filters.type_transaction) {
      query = query.eq('type_transaction', filters.type_transaction);
    }

    // Apply pagination
    query = query.range(filters.offset || 0, (filters.offset || 0) + (filters.limit || 50) - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch transactions')),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format response
    const response = successResponse(
      {
        transactions: data || [],
      },
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
