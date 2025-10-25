import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response('Missing URL parameter', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Validate URL to prevent SSRF attacks
    const parsedUrl = new URL(imageUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return new Response('Invalid URL protocol', { 
        status: 400,
        headers: corsHeaders
      });
    }

    // Fetch image
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'image/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': parsedUrl.origin,
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    if (!response.ok) {
      return new Response(`Failed to fetch image: ${response.statusText}`, { 
        status: response.status,
        headers: corsHeaders
      });
    }

    // Get content type from response or default to image/jpeg
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Get image data
    const imageData = await response.arrayBuffer();

    // Return image with proper headers
    return new Response(imageData, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Length': imageData.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new Response(`Internal server error: ${error.message}`, { 
      status: 500,
      headers: corsHeaders
    });
  }
});