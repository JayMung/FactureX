import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Get the user object to check authentication
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized: You must be logged in");
    }

    // Verify admin role via app_metadata (server-controlled, JWT-embedded, cannot be forged by user)
    // app_metadata is the canonical source of truth — do NOT use admin_roles or profiles.role
    // profiles.role no longer stores admin/super_admin (prevent_admin_role_in_profiles trigger)
    const userRole = user.app_metadata?.role;
    if (userRole !== "admin" && userRole !== "super_admin") {
      throw new Error("Forbidden: Admin privileges required");
    }

    // Get request body
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      throw new Error("Missing parameters: userId and newPassword are required");
    }
    
    if (newPassword.length < 6) {
         throw new Error("Password must be at least 6 characters long");
    }

    // Create Supabase Service Role Client for Admin actions
    // This client bypasses RLS and has full admin privileges to update ANY user
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error("Admin update error:", error);
      throw error;
    }

    // Log the action for audit purposes (optional but recommended)
    // We try to log to security_logs if the table exists and we have access
    try {
        await supabaseAdmin.from('security_logs').insert({
            event_type: 'PASSWORD_MANUAL_RESET',
            description: `Password manually reset for user ${userId} by admin ${user.id}`,
            severity: 'high',
            user_id: user.id,
            metadata: { target_user_id: userId }
        });
    } catch (logError) {
        // Ignore logging errors to not fail the main operation
        console.warn("Failed to log security event:", logError);
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An internal error occurred" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
