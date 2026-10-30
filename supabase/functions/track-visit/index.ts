import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { visit_id } = await req.json();
    if (!visit_id) {
      return new Response(JSON.stringify({ error: "Missing visit_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to detect country from Cloudflare/Vercel headers
    const raw = (req.headers.get("cf-ipcountry") || "").toUpperCase();
    const country = /^[A-Z]{2}$/.test(raw) ? raw : null;
    const countryName = country;
    if (typeof visit_id !== "string" || !/^[0-9a-f-]{36}$/i.test(visit_id)) {
      return new Response(JSON.stringify({ error: "Invalid visit_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!country) {
      return new Response(JSON.stringify({ country: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await supabase.from("page_visits").update({
      ip_country: countryName,
      ip_country_code: country,
    }).eq("id", visit_id).is("ip_country_code", null).gte("created_at", new Date(Date.now() - 5 * 60_000).toISOString());

    return new Response(JSON.stringify({ country, countryName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
