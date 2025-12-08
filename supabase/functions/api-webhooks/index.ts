/**
 * API Endpoint: /api-webhooks
 * Manage webhooks for event notifications (Discord, n8n, Slack, etc.)
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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // GET - List webhooks
    if (req.method === 'GET') {
      const authResult = await authenticateRequest(req, 'read:webhooks');
      
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
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('organization_id', keyData.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify(Errors.INTERNAL_ERROR('Failed to fetch webhooks')),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = successResponse(
        { webhooks: data || [] },
        {
          organization_id: keyData.organization_id,
          response_time_ms: Date.now() - startTime,
        }
      );

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create webhook
    if (req.method === 'POST') {
      const authResult = await authenticateRequest(req, 'write:webhooks');
      
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
      const body = await req.json();

      // Validate required fields
      if (!body.name || !body.url || !body.events || !Array.isArray(body.events)) {
        return new Response(
          JSON.stringify(Errors.VALIDATION_ERROR({
            message: 'Missing required fields: name, url, events (array)'
          })),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate format
      const validFormats = ['json', 'discord', 'slack', 'n8n'];
      if (body.format && !validFormats.includes(body.format)) {
        return new Response(
          JSON.stringify(Errors.VALIDATION_ERROR({
            message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
          })),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate events
      const validEvents = [
        'transaction.created',
        'transaction.validated',
        'transaction.deleted',
        'facture.created',
        'facture.validated',
        'facture.paid',
        'client.created',
        'client.updated',
        'colis.delivered',
        'colis.created',
        'colis.status_changed',
      ];

      const invalidEvents = body.events.filter((e: string) => !validEvents.includes(e));
      if (invalidEvents.length > 0) {
        return new Response(
          JSON.stringify(Errors.VALIDATION_ERROR({
            message: `Invalid events: ${invalidEvents.join(', ')}`,
            valid_events: validEvents
          })),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Generate webhook secret for signature verification
      const secret = body.secret || `whsec_${crypto.randomUUID().replace(/-/g, '')}`;

      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          organization_id: keyData.organization_id,
          name: body.name,
          url: body.url,
          events: body.events,
          format: body.format || 'json',
          is_active: body.is_active !== false,
          secret: secret,
          filters: body.filters || {},
          created_by: keyData.created_by,
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify(Errors.INTERNAL_ERROR('Failed to create webhook')),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = successResponse(
        { webhook: data },
        {
          organization_id: keyData.organization_id,
          response_time_ms: Date.now() - startTime,
        }
      );

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update webhook
    if (req.method === 'PUT') {
      const authResult = await authenticateRequest(req, 'write:webhooks');
      
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
      const webhookId = url.searchParams.get('id');

      if (!webhookId) {
        return new Response(
          JSON.stringify(Errors.VALIDATION_ERROR({ message: 'Missing webhook id' })),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const updateData: any = {};
      if (body.name) updateData.name = body.name;
      if (body.url) updateData.url = body.url;
      if (body.events) updateData.events = body.events;
      if (body.format) updateData.format = body.format;
      if (body.is_active !== undefined) updateData.is_active = body.is_active;
      if (body.filters) updateData.filters = body.filters;

      const { data, error } = await supabase
        .from('webhooks')
        .update(updateData)
        .eq('id', webhookId)
        .eq('organization_id', keyData.organization_id)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify(Errors.INTERNAL_ERROR('Failed to update webhook')),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = successResponse(
        { webhook: data },
        {
          organization_id: keyData.organization_id,
          response_time_ms: Date.now() - startTime,
        }
      );

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete webhook
    if (req.method === 'DELETE') {
      const authResult = await authenticateRequest(req, 'write:webhooks');
      
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
      const webhookId = url.searchParams.get('id');

      if (!webhookId) {
        return new Response(
          JSON.stringify(Errors.VALIDATION_ERROR({ message: 'Missing webhook id' })),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', webhookId)
        .eq('organization_id', keyData.organization_id);

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify(Errors.INTERNAL_ERROR('Failed to delete webhook')),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const response = successResponse(
        { message: 'Webhook deleted successfully' },
        {
          organization_id: keyData.organization_id,
          response_time_ms: Date.now() - startTime,
        }
      );

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Method not allowed
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify(Errors.INTERNAL_ERROR(error.message)),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
