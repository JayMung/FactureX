import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { fetchImageSafely } from '../_shared/ssrf-protection.ts';
import { handleCORS, withCORS } from '../_shared/csrf-middleware.ts';

serve(async (req) => {
  // Handle CORS preflight requests
  const corsResponse = handleCORS(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      const errorResponse = new Response(
        JSON.stringify({ error: 'Missing URL parameter' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      return withCORS(errorResponse, req.headers.get('origin'));
    }

    // Fetch image with SSRF protection
    const response = await fetchImageSafely(imageUrl);
    
    // Add CORS headers to response
    return withCORS(response, req.headers.get('origin'));

  } catch (error) {
    console.error('Image proxy error:', error);
    const errorResponse = new Response(
      JSON.stringify({ error: `Internal server error: ${error.message}` }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    return withCORS(errorResponse, req.headers.get('origin'));
  }
});