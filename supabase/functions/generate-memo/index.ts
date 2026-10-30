import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticate, authErrorResponse } from "../_shared/require-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await authenticate(req);
    if ("failure" in auth) return authErrorResponse(auth.failure, corsHeaders);

    const { analysis_id } = await req.json();
    if (!analysis_id || typeof analysis_id !== "string") {
      return new Response(JSON.stringify({ error: "analysis_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, supabaseKey);

    const { data: analysis, error: dbError } = await client
      .from("analyses")
      .select("*")
      .eq("id", analysis_id)
      .single();

    if (dbError || !analysis) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Memos are only generated for the caller's own analyses
    const { data: isAdmin } = await client.rpc("is_admin", { _user_id: auth.user.id });
    if (analysis.user_id !== auth.user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: "Not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const d = analysis;
    const curr = d.currency === "GBP" ? "£" : d.currency === "USD" ? "$" : "€";

    const prompt = `Generate a professional real estate investment memo based on this property analysis data. Format it as a structured document that an investor or fund manager would present. Use markdown formatting.

PROPERTY DATA:
- Address: ${d.address || "N/A"}
- City: ${d.city || "N/A"}, Country: ${d.country || "N/A"}
- Price: ${curr}${d.price || "N/A"}
- Property Type: ${d.property_type || "N/A"}
- Size: ${d.size_sqm ? d.size_sqm + " sqm" : "N/A"}
- Bedrooms: ${d.bedrooms || "N/A"}, Bathrooms: ${d.bathrooms || "N/A"}
- Year Built: ${d.year_built || "N/A"}

SCORES (out of 100):
- Global Score: ${d.global_score}/100
- ROI Potential: ${d.roi_potential}/100
- Market Stability: ${d.market_stability}/100
- Demand Strength: ${d.demand_strength}/100
- Risk Level: ${d.risk_level}/100
- Liquidity Outlook: ${d.liquidity_outlook}/100

ANALYSIS:
- Verdict: ${d.verdict || "N/A"}
- Primary Insight: ${d.primary_insight || "N/A"}
- AI Summary: ${d.ai_summary || "N/A"}
- Market Classification: ${d.market_classification || "N/A"}
- Confidence Level: ${d.confidence_level || "N/A"}
- Percentile: ${d.percentile ? "Top " + d.percentile + "%" : "N/A"}

ROI PROJECTIONS:
- Projected ROI (Low): ${d.projected_roi_low ? d.projected_roi_low + "%" : "N/A"}
- Projected ROI (High): ${d.projected_roi_high ? d.projected_roi_high + "%" : "N/A"}
- Upside Scenario: ${d.upside_scenario ? "+" + d.upside_scenario + "%" : "N/A"}
- Downside Scenario: ${d.downside_scenario ? d.downside_scenario + "%" : "N/A"}

PROS: ${JSON.stringify(d.pros || [])}
CONS: ${JSON.stringify(d.cons || [])}
RED FLAGS: ${JSON.stringify(d.red_flags || [])}
OPPORTUNITY SIGNALS: ${JSON.stringify(d.opportunity_signals || [])}

Structure the memo with these sections:
1. **Executive Summary** — 2-3 sentence overview with recommendation
2. **Property Overview** — Key facts in a clean format
3. **Investment Thesis** — Why this property is/isn't a good investment
4. **Market Analysis** — Market positioning, classification, demand signals
5. **Financial Projections** — ROI scenarios, price analysis
6. **Risk Assessment** — Red flags, downside scenarios, mitigation strategies
7. **Strengths & Opportunities** — Key advantages
8. **Recommendation** — Final verdict with suggested next steps

Be specific with numbers. Be honest about risks. Write like a professional analyst.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior real estate investment analyst at a top-tier advisory firm. Generate professional, data-driven investment memos." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI service unavailable");
    }

    const result = await response.json();
    const memo = result.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({
      memo,
      property: {
        address: d.address,
        city: d.city,
        country: d.country,
        score: d.global_score,
        price: d.price,
        currency: curr,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-memo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
