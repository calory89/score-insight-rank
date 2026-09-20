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

    const body = await req.json();
    const { messages, context } = body;

    // Input validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages must be a non-empty array" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (messages.length > 50) {
      return new Response(JSON.stringify({ error: "Too many messages. Maximum 50 per request." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return new Response(JSON.stringify({ error: "Each message must have role and content (string)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (msg.content.length > 10000) {
        return new Response(JSON.stringify({ error: "Message content too long. Maximum 10,000 characters." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are RealHunt's AI property investment advisor. You help users understand their property analysis reports and make better investment decisions.

You have access to the following property analysis context:
${context ? JSON.stringify(context) : "No specific property context provided."}

Rules:
- Be concise and actionable (2-4 sentences max per response)
- Reference specific data from the analysis when available
- If asked about ROI, renovation, Airbnb potential, etc., give practical estimates based on the data
- Use the property's score, location, price, and metrics to inform your answers
- Be honest about limitations — if data is insufficient, say so
- Never make up specific numbers that aren't in the data
- Format currency and percentages clearly`;

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
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service temporarily unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    // Log to error_logs
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const logClient = createClient(supabaseUrl, supabaseKey);
      await logClient.from("error_logs").insert({
        error_type: "ai_chat_error",
        error_message: e instanceof Error ? e.message : "Unknown error",
        metadata: { stack: e instanceof Error ? e.stack : undefined },
      });
    } catch {}
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
