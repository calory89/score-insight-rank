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

    const { answers } = await req.json();
    if (!answers || typeof answers !== "object") {
      return new Response(JSON.stringify({ error: "answers object required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch top analyses from DB for recommendations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: topProperties } = await supabase
      .from("analyses")
      .select("id, address, city, country, global_score, price, currency, roi_potential, risk_level, property_type, slug")
      .not("global_score", "is", null)
      .order("global_score", { ascending: false })
      .limit(50);

    const propertySummary = (topProperties || []).slice(0, 20).map(p =>
      `${p.city}, ${p.country} — Score: ${p.global_score}, Price: ${p.currency || '€'}${p.price}, ROI: ${p.roi_potential}, Risk: ${p.risk_level}, Type: ${p.property_type}`
    ).join("\n");

    const systemPrompt = `You are a world-class real estate investment strategist. Based on the investor's quiz answers, create a personalized investor profile and recommend specific markets and strategies.

Quiz Answers:
- Budget: ${answers.budget}
- Time Horizon: ${answers.timeHorizon}
- Risk Tolerance: ${answers.riskTolerance}
- Investment Goal: ${answers.goal}
- Preferred Location: ${answers.location}

Available Properties in our database:
${propertySummary}

Return a JSON object with this exact structure (no markdown, just raw JSON):
{
  "profile": {
    "type": "Conservative Yield Hunter" or "Balanced Growth Investor" or "Aggressive Value Seeker" or "Strategic Diversifier",
    "emoji": "appropriate emoji",
    "description": "2-3 sentence description of this investor profile"
  },
  "strategy": {
    "primary": "Main recommended strategy in 1 sentence",
    "tips": ["tip1", "tip2", "tip3"]
  },
  "recommendedMarkets": [
    {"city": "City", "country": "Country", "reason": "Why this market fits"},
    {"city": "City", "country": "Country", "reason": "Why this market fits"},
    {"city": "City", "country": "Country", "reason": "Why this market fits"}
  ],
  "keyMetrics": {
    "targetROI": "X-Y%",
    "maxRisk": "low/medium/high",
    "idealPropertyType": "type",
    "holdPeriod": "X-Y years"
  }
}`;

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
          { role: "user", content: "Generate my investor profile based on my quiz answers. Return only the JSON object, no markdown formatting." },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
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

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response (may be wrapped in ```json blocks)
    let parsed;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      parsed = { error: "Failed to parse AI response", raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("investment-quiz error:", e);
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const logClient = createClient(supabaseUrl, supabaseKey);
      await logClient.from("error_logs").insert({
        error_type: "investment_quiz_error",
        error_message: e instanceof Error ? e.message : "Unknown error",
        metadata: { stack: e instanceof Error ? e.stack : undefined },
      });
    } catch {}
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
