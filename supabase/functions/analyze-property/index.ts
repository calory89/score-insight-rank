import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a forensic real estate investment analyst. Given a property listing URL, generate a comprehensive investment analysis. You must respond using the analyze_property tool.

IMPORTANT: Generate realistic, data-driven analysis. Consider:
- Location economics (tourism, infrastructure, employment)
- Price per sqm relative to area median
- Rental yield potential
- Market cycle position
- Regulatory environment
- Liquidity conditions

Generate plausible data that would be typical for the location and property type suggested by the URL. Be specific with numbers and locations.`;

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
          { role: "user", content: `Analyze this property listing URL for investment potential: ${url}\n\nGenerate a complete forensic investment analysis with realistic data based on what you can infer from the URL (location, platform, property type).` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_property",
              description: "Return a complete forensic property investment analysis",
              parameters: {
                type: "object",
                properties: {
                  address: { type: "string", description: "Full property address or best guess" },
                  city: { type: "string" },
                  country: { type: "string" },
                  price: { type: "string", description: "Formatted price e.g. €215,000" },
                  currency: { type: "string", description: "Currency symbol" },
                  image_url: { type: "string", description: "Leave empty string" },
                  property_type: { type: "string", description: "Apartment, House, Villa, Studio, etc." },
                  size_sqm: { type: "number" },
                  year_built: { type: "integer" },
                  bedrooms: { type: "integer" },
                  bathrooms: { type: "integer" },
                  global_score: { type: "integer", description: "0-100 overall investment score" },
                  roi_potential: { type: "integer", description: "0-100" },
                  market_stability: { type: "integer", description: "0-100" },
                  demand_strength: { type: "integer", description: "0-100" },
                  risk_level: { type: "integer", description: "0-100 where 100 = lowest risk" },
                  liquidity_outlook: { type: "integer", description: "0-100" },
                  market_classification: { type: "string", enum: ["Emerging", "Stable", "Overpriced", "Premium Zone"] },
                  verdict: { type: "string", enum: ["Strong", "Moderate", "Risky"] },
                  market_rank: { type: "integer", description: "Rank among local listings" },
                  market_total: { type: "integer", description: "Total listings in area" },
                  percentile: { type: "integer", description: "Percentile performance 0-100" },
                  pros: { type: "array", items: { type: "string" }, description: "3-5 investment pros" },
                  cons: { type: "array", items: { type: "string" }, description: "3-5 investment cons" },
                  red_flags: { type: "array", items: { type: "string" }, description: "1-3 red flags" },
                  opportunity_signals: { type: "array", items: { type: "string" }, description: "1-3 opportunity signals" },
                  score_explanations: {
                    type: "object",
                    properties: {
                      roi_potential: { type: "object", properties: { positive: { type: "string" }, negative: { type: "string" } }, required: ["positive", "negative"] },
                      market_stability: { type: "object", properties: { positive: { type: "string" }, negative: { type: "string" } }, required: ["positive", "negative"] },
                      demand_strength: { type: "object", properties: { positive: { type: "string" }, negative: { type: "string" } }, required: ["positive", "negative"] },
                      risk_level: { type: "object", properties: { positive: { type: "string" }, negative: { type: "string" } }, required: ["positive", "negative"] },
                      liquidity_outlook: { type: "object", properties: { positive: { type: "string" }, negative: { type: "string" } }, required: ["positive", "negative"] },
                    },
                    required: ["roi_potential", "market_stability", "demand_strength", "risk_level", "liquidity_outlook"],
                  },
                  primary_insight: { type: "string", description: "One-line verdict" },
                  ai_summary: { type: "string", description: "2-3 sentence analytical summary" },
                  why_not_90: { type: "array", items: { type: "string" }, description: "3 reasons why score isn't 90+" },
                  projected_roi_low: { type: "number", description: "5-year low ROI %" },
                  projected_roi_high: { type: "number", description: "5-year high ROI %" },
                  downside_scenario: { type: "number", description: "Worst case % change" },
                  upside_scenario: { type: "number", description: "Best case % change" },
                  price_history: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { year: { type: "string" }, value: { type: "number" } },
                      required: ["year", "value"],
                    },
                    description: "5-6 years of price index data (base 100)",
                  },
                  yield_trend: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { year: { type: "string" }, value: { type: "number" } },
                      required: ["year", "value"],
                    },
                    description: "5-6 years of yield % data",
                  },
                  alternatives: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        city: { type: "string" },
                        score: { type: "integer" },
                        roi: { type: "string" },
                        risk: { type: "string" },
                        price: { type: "string" },
                        insight: { type: "string" },
                      },
                      required: ["city", "score", "roi", "risk", "price", "insight"],
                    },
                    description: "4-5 better alternative properties in nearby markets",
                  },
                },
                required: [
                  "address", "city", "country", "price", "currency", "property_type",
                  "global_score", "roi_potential", "market_stability", "demand_strength",
                  "risk_level", "liquidity_outlook", "market_classification", "verdict",
                  "percentile", "pros", "cons", "red_flags", "opportunity_signals",
                  "score_explanations", "primary_insight", "ai_summary", "why_not_90",
                  "projected_roi_low", "projected_roi_high", "downside_scenario", "upside_scenario",
                  "price_history", "yield_trend", "alternatives",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "analyze_property" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis generated");

    const analysis = JSON.parse(toolCall.function.arguments);

    // Save to database
    const { data: saved, error: dbError } = await supabase
      .from("analyses")
      .insert({
        user_id: user.id,
        url,
        ...analysis,
        image_url: analysis.image_url || "",
        market_rank: analysis.market_rank || Math.floor(Math.random() * 30) + 5,
        market_total: analysis.market_total || Math.floor(Math.random() * 150) + 100,
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error("Failed to save analysis");
    }

    return new Response(JSON.stringify({ success: true, data: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
