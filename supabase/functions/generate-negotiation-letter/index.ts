import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { analysis } = await req.json();
    if (!analysis) {
      return new Response(JSON.stringify({ error: "analysis data required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const redFlags = Array.isArray(analysis.red_flags) ? analysis.red_flags : [];
    const cons = Array.isArray(analysis.cons) ? analysis.cons : [];
    const pros = Array.isArray(analysis.pros) ? analysis.pros : [];

    const systemPrompt = `You are a professional real estate negotiation expert. Generate a compelling, data-driven negotiation letter that a buyer can send to the seller or their agent to negotiate a better price.

The letter must:
- Be professional, respectful, and persuasive
- Reference specific data points from the analysis (score, red flags, market conditions)
- Suggest a fair counter-offer range based on the data
- Mention comparable properties or market averages when relevant
- Be 300-500 words
- Include a suggested price reduction percentage based on identified issues
- Format with clear paragraphs, no markdown headers

Property Data:
- Address: ${analysis.address || `${analysis.city}, ${analysis.country}`}
- Listing Price: ${analysis.currency || '€'}${analysis.price}
- Score: ${analysis.global_score}/100
- Verdict: ${analysis.verdict || 'N/A'}
- ROI Potential: ${analysis.roi_potential}/100
- Market Stability: ${analysis.market_stability}/100
- Risk Level: ${analysis.risk_level}/100
- Market Classification: ${analysis.market_classification || 'N/A'}
- Property Type: ${analysis.property_type || 'N/A'}
- Size: ${analysis.size_sqm ? analysis.size_sqm + ' m²' : 'N/A'}
- Year Built: ${analysis.year_built || 'N/A'}
- Red Flags: ${redFlags.length > 0 ? redFlags.join('; ') : 'None identified'}
- Cons: ${cons.length > 0 ? cons.join('; ') : 'None identified'}
- Pros: ${pros.length > 0 ? pros.join('; ') : 'None identified'}
- Downside Scenario: ${analysis.downside_scenario ? analysis.downside_scenario + '%' : 'N/A'}
- Projected ROI: ${analysis.projected_roi_low && analysis.projected_roi_high ? analysis.projected_roi_low + '% - ' + analysis.projected_roi_high + '%' : 'N/A'}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate a professional negotiation letter for this property based on the analysis data. Start directly with 'Dear Seller/Agent,' — no preamble." },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("negotiation-letter error:", e);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const logClient = createClient(supabaseUrl, supabaseKey);
      await logClient.from("error_logs").insert({
        error_type: "negotiation_letter_error",
        error_message: e instanceof Error ? e.message : "Unknown error",
        metadata: { stack: e instanceof Error ? e.stack : undefined },
      });
    } catch {}
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
