import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_name, website, contact_name, contact_email, industry, notes } = await req.json();

    if (!company_name && !website && !contact_name) {
      return new Response(JSON.stringify({ error: "Provide at least a company name, website, or contact name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use AI to analyze the lead
    const prompt = `You are a world-class B2B sales intelligence analyst. Analyze this potential lead and provide a comprehensive assessment.

Lead information:
- Company: ${company_name || "Unknown"}
- Website: ${website || "Not provided"}
- Contact: ${contact_name || "Unknown"}
- Email: ${contact_email || "Not provided"}
- Industry: ${industry || "Unknown"}
- Notes: ${notes || "None"}

Respond using the suggest_lead_analysis tool with your analysis.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a B2B sales intelligence AI. Always use the provided tool to structure your response." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_lead_analysis",
              description: "Provide structured lead analysis",
              parameters: {
                type: "object",
                properties: {
                  lead_score: {
                    type: "integer",
                    description: "Score from 0-100 based on likelihood to convert. Consider company size, industry fit, and engagement signals.",
                  },
                  summary: {
                    type: "string",
                    description: "2-3 sentence summary of the lead's potential value and relevance.",
                  },
                  pain_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 likely pain points this lead might have based on their industry and profile.",
                  },
                  recommended_approach: {
                    type: "string",
                    description: "Best strategy to approach this lead. Include tone, channel, and timing.",
                  },
                  ideal_message: {
                    type: "string",
                    description: "A personalized outreach message draft for this lead. Make it feel human and relevant.",
                  },
                  estimated_company_size: {
                    type: "string",
                    description: "Estimated company size category: 'solo', '2-10', '11-50', '51-200', '201-500', '500+'",
                  },
                  estimated_industry: {
                    type: "string",
                    description: "Best guess of the company's industry if not provided.",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 relevant tags for this lead (e.g., 'real-estate', 'high-value', 'tech-savvy').",
                  },
                },
                required: ["lead_score", "summary", "pain_points", "recommended_approach", "ideal_message", "tags"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_lead_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "AI rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis = {
      lead_score: 50,
      summary: "AI analysis unavailable",
      pain_points: [],
      recommended_approach: "",
      ideal_message: "",
      tags: [],
      estimated_company_size: "",
      estimated_industry: industry || "",
    };

    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    // Insert lead into database
    const { data: lead, error: insertError } = await supabase
      .from("leads")
      .insert({
        user_id: user.id,
        company_name: company_name || null,
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        website: website || null,
        industry: analysis.estimated_industry || industry || null,
        company_size: analysis.estimated_company_size || null,
        source: "ai_analyzed",
        lead_score: analysis.lead_score,
        ai_summary: analysis.summary,
        ai_pain_points: analysis.pain_points,
        ai_recommended_approach: analysis.recommended_approach,
        ai_ideal_message: analysis.ideal_message,
        tags: analysis.tags,
        notes: notes || null,
        status: analysis.lead_score >= 70 ? "qualified" : analysis.lead_score >= 40 ? "new" : "cold",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Failed to save lead" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: lead }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-lead error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
