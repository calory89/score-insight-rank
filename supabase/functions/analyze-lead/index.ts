import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Blocks loopback, link-local, and private network ranges so a supplied URL
// cannot be used to reach internal services or cloud metadata endpoints.
const BLOCKED_HOST = /^(localhost$|127\.|0\.0\.0\.0$|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|\[?f[cd][0-9a-f]{2}:|.*\.local$|.*\.internal$)/i;

function isFetchableUrl(parsed: URL): boolean {
  if (parsed.protocol !== "https:") return false;
  return !BLOCKED_HOST.test(parsed.hostname);
}

async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }
    // Force HTTPS so http:// targets cannot be used to probe internal services
    let parsed: URL;
    try {
      parsed = new URL(formattedUrl);
    } catch {
      return "[Blocked: invalid URL]";
    }
    if (parsed.protocol === "http:") {
      parsed.protocol = "https:";
      formattedUrl = parsed.toString();
    }
    if (!isFetchableUrl(parsed)) return "[Blocked: URL not allowed]";

    // Follow redirects manually so each hop is validated against the blocklist too
    let res: Response | null = null;
    let current = formattedUrl;
    for (let hop = 0; hop < 4; hop++) {
      res = await fetch(current, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RealHuntBot/1.0)" },
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
      if (res.status < 300 || res.status >= 400) break;
      const location = res.headers.get("location");
      if (!location) break;
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return "[Blocked: invalid redirect]";
      }
      if (!isFetchableUrl(next)) return "[Blocked: URL not allowed]";
      current = next.toString();
      res = null;
    }
    if (!res) return "[Could not fetch: too many redirects]";
    if (!res.ok) return `[Could not fetch: HTTP ${res.status}]`;
    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || "";

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const description = descMatch?.[1]?.trim() || "";

    // Extract OG tags
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

    // Strip HTML tags and get body text
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const bodyHtml = bodyMatch?.[1] || html;
    const bodyText = bodyHtml
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3000);

    return [
      `Page Title: ${title}`,
      description ? `Meta Description: ${description}` : "",
      ogTitleMatch ? `OG Title: ${ogTitleMatch[1]}` : "",
      ogDescMatch ? `OG Description: ${ogDescMatch[1]}` : "",
      `Page Content (first 3000 chars): ${bodyText}`,
    ].filter(Boolean).join("\n");
  } catch (e) {
    console.error("Website fetch error:", e);
    return `[Could not fetch website: ${e instanceof Error ? e.message : "timeout or error"}]`;
  }
}

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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { company_name, website, contact_name, contact_email, industry, notes } = await req.json();

    if (!company_name && !website && !contact_name) {
      return new Response(JSON.stringify({ error: "Provide at least a company name, website, or contact name" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch real website content if URL provided
    let websiteContent = "";
    if (website) {
      console.log("Fetching website content from:", website);
      websiteContent = await fetchWebsiteContent(website);
      console.log("Website content length:", websiteContent.length);
    }

    const prompt = `You are a world-class B2B sales intelligence analyst. Analyze this potential lead using ALL available data, especially the REAL website content scraped below.

Lead information:
- Company: ${company_name || "Unknown"}
- Website URL: ${website || "Not provided"}
- Contact: ${contact_name || "Unknown"}
- Email: ${contact_email || "Not provided"}
- Industry (user-provided): ${industry || "Unknown"}
- Notes: ${notes || "None"}

${websiteContent ? `=== REAL WEBSITE CONTENT (scraped from ${website}) ===
${websiteContent}
=== END WEBSITE CONTENT ===` : "No website content available — score conservatively."}

SCORING RUBRIC — Use this point system strictly:
- Website exists and is accessible: +15 points
- Industry/niche match (real estate, property, investment, construction, architecture): +20 points
- Company size signals (team pages, multiple offices, hiring): +15 points
- Corporate email domain (not gmail/hotmail/yahoo): +10 points
- Pain points detected on website (manual processes, scaling challenges, mentions of growth): +15 points
- Technology sophistication (modern website, SaaS tools, integrations): +10 points
- Base score: +15 points

If the website could NOT be fetched, cap the score at 50 max unless other strong signals exist.
If the website content is clearly a property listing (Zillow, Realtor, etc.), analyze it as a PROPERTY lead — extract neighborhood quality, price analysis, property condition, and market signals from the listing content.

Respond using the suggest_lead_analysis tool with your analysis. Ground ALL insights in the actual scraped content — do NOT hallucinate details.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a B2B sales intelligence AI. Always use the provided tool to structure your response. Base your analysis on REAL scraped website content when available." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_lead_analysis",
              description: "Provide structured lead analysis based on real website data",
              parameters: {
                type: "object",
                properties: {
                  lead_score: {
                    type: "integer",
                    description: "Score 0-100 using the rubric. Sum the applicable points. Be strict and data-driven.",
                  },
                  summary: {
                    type: "string",
                    description: "2-3 sentence summary grounded in actual website content. Mention specific things found on the page.",
                  },
                  pain_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 pain points inferred from REAL website content (services offered, team size, tech stack, market positioning).",
                  },
                  recommended_approach: {
                    type: "string",
                    description: "Strategy based on what was found on their website. Reference specific content.",
                  },
                  ideal_message: {
                    type: "string",
                    description: "Personalized outreach message referencing specific details from their website.",
                  },
                  estimated_company_size: {
                    type: "string",
                    description: "Estimated from website signals: 'solo', '2-10', '11-50', '51-200', '201-500', '500+'",
                  },
                  estimated_industry: {
                    type: "string",
                    description: "Industry determined from actual website content, not guessed.",
                  },
                  tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 tags based on real content found on the website.",
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
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        source_url: website || null,
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
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
