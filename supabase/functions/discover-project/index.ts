// Discover or score a new off-plan development from a URL or free-text query.
// Uses Lovable AI to (1) classify whether it's off-plan, (2) extract structured data,
// (3) generate a calibrated score across the 5 RealHunt dimensions, and (4) persist it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Already exists?
    const { data: existing } = await supabase
      .from("projects")
      .select("slug,name,city,country:countries(name,slug,flag_emoji)")
      .or(`name.ilike.%${query.replace(/[%,]/g, "")}%,city.ilike.%${query.replace(/[%,]/g, "")}%`)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, found: true, project: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isUrl = /^https?:\/\//i.test(query.trim());
    const userPrompt = isUrl
      ? `Analyze this developer / project URL: ${query}\n\nDecide if it is an off-plan real estate development. If yes, extract realistic data and score it.`
      : `Find the off-plan real estate project named or described as: "${query}".\nIf it likely exists, extract realistic data and score it. If you cannot identify a real off-plan project, return is_off_plan=false.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are RealHunt's analyst. You evaluate off-plan real estate projects. Be skeptical and calibrated. Average score should be ~6.5 across the catalog; only truly exceptional projects exceed 8.5. Return null fields rather than invent.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "register_project",
              description: "Register an off-plan project in the index.",
              parameters: {
                type: "object",
                properties: {
                  is_off_plan: { type: "boolean" },
                  reason_if_not: { type: "string" },
                  name: { type: "string" },
                  developer_name: { type: "string" },
                  country_name: { type: "string", description: "ISO country full name" },
                  city: { type: "string" },
                  description: { type: "string" },
                  hero_image_url: { type: "string" },
                  ticket_min_eur: { type: "number" },
                  scores: {
                    type: "object",
                    properties: {
                      weighted: { type: "number", description: "0-10 calibrated" },
                      developer_reputation: { type: "number" },
                      delivery_certainty: { type: "number" },
                      legal_protection: { type: "number" },
                      location_fundamentals: { type: "number" },
                      investment_economics: { type: "number" },
                    },
                    required: [
                      "weighted",
                      "developer_reputation",
                      "delivery_certainty",
                      "legal_protection",
                      "location_fundamentals",
                      "investment_economics",
                    ],
                  },
                },
                required: ["is_off_plan", "name"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "register_project" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const aiJson = await aiRes.json();
    const args = JSON.parse(
      aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments || "{}"
    );

    if (!args.is_off_plan) {
      return new Response(
        JSON.stringify({ ok: false, off_plan: false, reason: args.reason_if_not || "Not an off-plan development." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve country
    let countryId: string | null = null;
    if (args.country_name) {
      const { data: c } = await supabase
        .from("countries")
        .select("id")
        .ilike("name", args.country_name)
        .maybeSingle();
      countryId = c?.id || null;
    }
    if (!countryId) {
      const { data: c } = await supabase.from("countries").select("id").limit(1).maybeSingle();
      countryId = c?.id || null;
    }

    // Resolve / create developer
    let developerId: string | null = null;
    const devName = args.developer_name || "Independent developer";
    const devSlug = slugify(devName);
    const { data: existingDev } = await supabase
      .from("developers").select("id").eq("slug", devSlug).maybeSingle();
    if (existingDev) developerId = existingDev.id;
    else {
      const { data: nd } = await supabase
        .from("developers").insert({ name: devName, slug: devSlug, country_id: countryId })
        .select("id").single();
      developerId = nd?.id || null;
    }

    const projectSlug = `${slugify(args.name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: project, error: pErr } = await supabase
      .from("projects")
      .insert({
        name: args.name,
        slug: projectSlug,
        country_id: countryId,
        developer_id: developerId,
        city: args.city || null,
        description: args.description || null,
        hero_image_url: args.hero_image_url || null,
        ticket_min_eur: args.ticket_min_eur || null,
        active: true,
      })
      .select("id,slug,name")
      .single();
    if (pErr) throw pErr;

    const s = args.scores || {};
    await supabase.from("project_scores").insert({
      project_id: project.id,
      weighted_score: s.weighted ?? null,
      dim_developer_reputation: s.developer_reputation ?? null,
      dim_delivery_certainty: s.delivery_certainty ?? null,
      dim_legal_protection: s.legal_protection ?? null,
      dim_location_fundamentals: s.location_fundamentals ?? null,
      dim_investment_economics: s.investment_economics ?? null,
    });

    return new Response(JSON.stringify({ ok: true, found: false, project }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
