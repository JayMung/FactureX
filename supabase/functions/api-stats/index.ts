/**
 * API Endpoint: GET /api-stats
 * Returns dashboard statistics for external integrations
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authenticateRequest } from '../_shared/api-auth.ts';
import { successResponse, Errors } from '../_shared/api-response.ts';
import type { StatsFilters } from '../_shared/api-types.ts';

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
    const authResult = await authenticateRequest(req, 'read:stats');
    
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
    const filters: StatsFilters = {
      period: (url.searchParams.get('period') as any) || '30d',
      date_from: url.searchParams.get('date_from') || undefined,
      date_to: url.searchParams.get('date_to') || undefined,
      group_by: (url.searchParams.get('group_by') as 'day' | 'week' | 'month') || 'day',
      currency: (url.searchParams.get('currency') as 'USD' | 'CDF' | 'both') || 'both',
    };

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate date range
    let dateFrom: string;
    let dateTo: string = new Date().toISOString();

    if (filters.period === 'custom' && filters.date_from && filters.date_to) {
      dateFrom = filters.date_from;
      dateTo = filters.date_to;
    } else {
      const now = new Date();
      switch (filters.period) {
        case '24h':
          dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
          break;
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
        default:
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    // Fetch transactions stats
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('montant, devise, benefice, frais, date_paiement, statut')
      .eq('organization_id', keyData.organization_id)
      .gte('date_paiement', dateFrom)
      .lte('date_paiement', dateTo);

    if (txError) {
      console.error('Transactions error:', txError);
      return new Response(
        JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch transaction stats')),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch clients count
    const { count: clientsCount, error: clientsError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', keyData.organization_id);

    if (clientsError) {
      console.error('Clients error:', clientsError);
    }

    // Fetch factures count
    const { count: facturesCount, error: facturesError } = await supabase
      .from('factures')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', keyData.organization_id)
      .gte('date_emission', dateFrom)
      .lte('date_emission', dateTo);

    if (facturesError) {
      console.error('Factures error:', facturesError);
    }

    // Fetch colis count
    const { count: colisCount, error: colisError } = await supabase
      .from('colis')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', keyData.organization_id)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo);

    if (colisError) {
      console.error('Colis error:', colisError);
    }

    // Calculate stats
    const usdTransactions = transactions?.filter(t => t.devise === 'USD') || [];
    const cdfTransactions = transactions?.filter(t => t.devise === 'CDF') || [];

    const stats = {
      total_usd: usdTransactions.reduce((sum, t) => sum + (t.montant || 0), 0),
      total_cdf: cdfTransactions.reduce((sum, t) => sum + (t.montant || 0), 0),
      total_frais: (transactions || []).reduce((sum, t) => sum + (t.frais || 0), 0),
      total_benefice: (transactions || []).reduce((sum, t) => sum + (t.benefice || 0), 0),
      nombre_transactions: transactions?.length || 0,
      nombre_clients: clientsCount || 0,
      nombre_factures: facturesCount || 0,
      nombre_colis: colisCount || 0,
      evolution: {
        revenue_change: 0, // TODO: Calculate vs previous period
        transaction_change: 0,
        client_change: 0,
      },
    };

    // Group data by period for graph
    const graphData: any[] = [];
    if (filters.group_by === 'day') {
      const dailyData = new Map<string, { revenue: number; transactions: number }>();
      
      transactions?.forEach(t => {
        const date = new Date(t.date_paiement).toISOString().split('T')[0];
        const existing = dailyData.get(date) || { revenue: 0, transactions: 0 };
        dailyData.set(date, {
          revenue: existing.revenue + (t.montant || 0),
          transactions: existing.transactions + 1,
        });
      });

      dailyData.forEach((value, date) => {
        graphData.push({ date, ...value });
      });
    }

    const response = successResponse(
      {
        stats,
        graph_data: {
          [filters.group_by]: graphData.sort((a, b) => a.date.localeCompare(b.date)),
        },
        period: filters.period,
        date_range: { from: dateFrom, to: dateTo },
      },
      {
        organization_id: keyData.organization_id,
        response_time_ms: Date.now() - startTime,
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
