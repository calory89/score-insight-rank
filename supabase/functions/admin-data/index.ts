import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_EMAIL = "rrppspain@gmail.com";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all users from auth.users via admin API
    const { data: { users: authUsers }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) throw usersError;

    // Fetch all profiles
    const { data: profiles } = await supabase.from("profiles").select("*");
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // Fetch all analyses with user grouping
    const { data: analyses } = await supabase.from("analyses").select("id, user_id, url, city, country, global_score, created_at, address, price").order("created_at", { ascending: false });

    // Build user data
    const userData = (authUsers || []).map((u: any) => {
      const profile = profileMap.get(u.id) as any;
      const userAnalyses = (analyses || []).filter((a: any) => a.user_id === u.id);
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        login_count: profile?.login_count || 0,
        detected_country: profile?.detected_country || null,
        provider: u.app_metadata?.provider || "email",
        analyses_count: userAnalyses.length,
        analyses: userAnalyses.slice(0, 20), // Last 20 searches
        plan: "free", // Placeholder for payment integration
      };
    });

    // Summary stats
    const stats = {
      total_users: userData.length,
      total_analyses: (analyses || []).length,
      countries: [...new Set((analyses || []).map((a: any) => a.country).filter(Boolean))],
      recent_signups_7d: userData.filter((u: any) => {
        const d = new Date(u.created_at);
        return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
      }).length,
      active_today: userData.filter((u: any) => {
        if (!u.last_sign_in_at) return false;
        const d = new Date(u.last_sign_in_at);
        return (Date.now() - d.getTime()) < 24 * 60 * 60 * 1000;
      }).length,
    };

    return new Response(JSON.stringify({ users: userData, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Admin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
