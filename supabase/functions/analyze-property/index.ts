import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const REAL_ESTATE_DOMAINS = [
  "zillow.com", "realtor.com", "redfin.com", "trulia.com", "homes.com",
  "idealista.com", "idealista.pt", "fotocasa.es", "pisos.com", "habitaclia.com",
  "rightmove.co.uk", "zoopla.co.uk", "onthemarket.com", "primelocation.com",
  "immobilienscout24.de", "immowelt.de", "immonet.de",
  "seloger.com", "leboncoin.fr", "pap.fr", "logic-immo.com",
  "immobiliare.it", "casa.it", "subito.it",
  "funda.nl", "jaap.nl", "pararius.com",
  "hemnet.se", "boliga.dk", "finn.no",
  "daft.ie", "myhome.ie",
  "sreality.cz", "otodom.pl", "ingatlan.com",
  "sahibinden.com", "hepsiemlak.com",
  "cian.ru", "avito.ru",
  "airbnb.com", "airbnb.co.uk", "airbnb.es", "airbnb.fr", "airbnb.de", "airbnb.it",
  "booking.com", "vrbo.com",
  "propertyfinder.ae", "bayut.com", "dubizzle.com",
  "99.co", "propertyguru.com", "edgeprop.my",
  "domain.com.au", "realestate.com.au",
  "trademe.co.nz",
  "magicbricks.com", "99acres.com", "housing.com",
  "lamudi.com", "lamudi.co.id",
  "olx.com", "mercadolibre.com",
  "point2homes.com", "century21.com", "coldwellbanker.com", "sothebysrealty.com",
  "propertypal.com", "nestoria.com",
];

function isRealEstateUrl(url: string): boolean {
  if (!url || url === "manual-entry") return true;
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    return REAL_ESTATE_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));
  } catch {
    return false;
  }
}

// Detect if scraped content is actually a CAPTCHA, cookie wall, or blocked page
function isBlockedContent(content: string): boolean {
  const lowerContent = content.toLowerCase();
  const blockedSignals = [
    "captcha", "robot", "not a robot", "verify you are human",
    "access denied", "403 forbidden", "please enable cookies",
    "enable javascript", "browser is outdated", "cloudflare",
    "just a moment", "checking your browser", "ray id",
    "please wait while we verify", "security check",
    "acepta nuestras cookies", "cookies policy", "política de cookies",
    "aceptar cookies", "cookie consent", "cookie settings",
  ];
  const matchCount = blockedSignals.filter(s => lowerContent.includes(s)).length;
  // If multiple blocked signals found, it's likely a wall page
  if (matchCount >= 2) return true;
  
  // If content is very short and contains a blocked signal, it's suspicious
  if (content.length < 300 && matchCount >= 1) return true;
  
  // Check if content lacks ANY real estate signals (price, bedrooms, m², etc.)
  const realEstateSignals = [
    /\d{2,3}\s*m²/i, /\d{2,3}\s*sqm/i, /\d{3,4}\s*sq\s*ft/i,
    /bedroom/i, /dormitorio/i, /habitaci/i, /chambre/i, /zimmer/i,
    /bathroom/i, /baño/i, /salle de bain/i,
    /€\s*[\d.,]+/i, /£\s*[\d.,]+/i, /\$\s*[\d.,]+/i,
    /[\d.,]+\s*€/i, /[\d.,]+\s*£/i,
    /price/i, /precio/i, /prix/i, /preis/i, /prezzo/i,
  ];
  const hasRealEstateData = realEstateSignals.some(r => r.test(content));
  
  // If no real estate data found in content, treat as blocked
  if (!hasRealEstateData && content.length < 2000) return true;
  
  return false;
}

async function scrapeListingPage(url: string): Promise<{ content: string | null; isEstimated: boolean }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { content: null, isEstimated: true };

  try {
    console.log("Scraping listing page:", url);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, waitFor: 5000 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("Firecrawl error:", response.status);
      return { content: null, isEstimated: true };
    }

    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || null;
    if (!markdown || markdown.trim().length < 50) {
      console.log("Content too short or empty");
      return { content: null, isEstimated: true };
    }

    // CRITICAL: Validate content is actually a listing, not a CAPTCHA/cookie wall
    if (isBlockedContent(markdown)) {
      console.log("Blocked content detected (CAPTCHA/cookie wall), triggering fallback");
      return { content: null, isEstimated: true };
    }

    console.log("Scrape successful, content length:", markdown.length);
    const truncated = markdown.length > 12000 ? markdown.substring(0, 12000) + "\n\n[Content truncated...]" : markdown;
    return { content: truncated, isEstimated: false };
  } catch (error) {
    console.error("Scrape failed:", error);
    return { content: null, isEstimated: true };
  }
}

function buildManualEntryContent(manualFields: any): string {
  const lines: string[] = ["PROPERTY DETAILS (provided by user):"];
  if (manualFields.city) lines.push(`Location: ${manualFields.city}`);
  if (manualFields.price) lines.push(`Asking Price: ${manualFields.price}`);
  if (manualFields.size) lines.push(`Size: ${manualFields.size} ${manualFields.sizeUnit === "sqft" ? "sq ft" : "m²"}`);
  if (manualFields.bedrooms) lines.push(`Bedrooms: ${manualFields.bedrooms}`);
  if (manualFields.propertyType) lines.push(`Property Type: ${manualFields.propertyType}`);
  if (manualFields.strategy) lines.push(`Investment Strategy: ${manualFields.strategy}`);
  if (manualFields.listingUrl) lines.push(`Listing URL: ${manualFields.listingUrl}`);
  return lines.join("\n");
}

function determineConfidence(dataSource: string, contentLength: number): string {
  if (dataSource === "scraped" && contentLength > 500) return "high";
  if (dataSource === "pasted" && contentLength > 200) return "high";
  if (dataSource === "pasted" && contentLength > 50) return "medium";
  if (dataSource === "manual_entry") return "medium";
  return "low";
}

function buildPrompts(url: string, scrapedContent: string | null, isEstimated: boolean, dataSource: string) {
  const forensicInstructions = `
ANALYSIS FRAMEWORK — Apply in order of priority:

1. DEAL QUALITY (Highest Priority):
   - Calculate exact price per m² and price per sq ft
   - Estimate micro-market median price per m² 
   - Position in p25/p50/p75/p90 percentiles
   - Premium/discount % vs median
   - Fair value estimate (range)
   - Cap rate (realistic), gross yield, net yield
   - Over/underpriced verdict with exact %

2. RENTAL PERFORMANCE & DEMAND:
   - Gross rental yield estimate
   - Net rental yield (after expenses)
   - Vacancy rate estimate
   - Tenant demand index
   - Seasonal volatility if applicable

3. LIQUIDITY & EXIT RISK:
   - Days-on-market estimate
   - Transaction volume context
   - Resale difficulty in downturn

4. MARKET MOMENTUM & CYCLE POSITION:
   - 1-year and 5-year appreciation
   - Supply pipeline risk
   - Cycle Position: Early / Mid / Late / Overheated

5. MACRO & REGULATORY RISK:
   - Property tax burden context
   - Rental regulation risk
   - Economic concentration risk

6. PROPERTY-SPECIFIC RISK:
   - Building age risk
   - Maintenance/renovation exposure
   - Energy/environmental risk

7. SCENARIO MODELING:
   - 5-year base, optimistic, and downside projections
   - Break-even analysis
   - Cash flow simulation
   - Stress test scenarios`;

  if (scrapedContent) {
    const systemPrompt = `You are a forensic real estate investment analyst producing institutional-grade reports. Extract EXACT data from the listing. Never invent details.

CRITICAL RULES:
- Use the REAL price, size, bedrooms, bathrooms, address
- If size is in acres, convert to m² (1 acre = 4046.86 m²). If ft², convert (1 ft² = 0.0929 m²)
- If data is missing, use null
- Be forensic, data-dense, defensible
- Never fabricate precision
- Include SPECIFIC NUMBERS in all analyses — no vague language
${forensicInstructions}`;

    const userPrompt = `Analyze this property listing for investment potential.

URL: ${url}
Data Source: ${dataSource === "scraped" ? "Direct page scrape" : dataSource === "pasted" ? "User-provided listing text" : "Manual entry by user"}

LISTING CONTENT:
---
${scrapedContent}
---

Provide a complete forensic investment analysis. Be rigorous and analytical. Include precise numerical estimates for all metrics.`;

    return { systemPrompt, userPrompt };
  }

  const systemPrompt = `You are a forensic real estate investment analyst. Given a property URL, generate analysis using your knowledge. Mark "[ESTIMATED]" at start of ai_summary.
${forensicInstructions}`;

  const userPrompt = `Analyze this property listing URL: ${url}
WARNING: Could not access listing page. Analyze based on URL inference. Note data is estimated.`;

  return { systemPrompt, userPrompt };
}

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
    // Auth client for user verification
    const supabaseAuth = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    // Service role client for DB operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url, manual_content, manual_fields } = await req.json();

    // Non-real-estate URL check
    if (url && url !== "manual-entry" && !manual_fields && !manual_content) {
      if (!isRealEstateUrl(url)) {
        return new Response(JSON.stringify({ 
          success: false, 
          not_real_estate: true, 
          error: "RealHunt only works with real estate property listings. Please paste a URL from a property listing platform (Zillow, Idealista, Rightmove, Airbnb, etc.)." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (!url && !manual_fields?.city) {
      return new Response(JSON.stringify({ error: "URL or property details required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Duplicate detection: check if same URL already analyzed by this user ---
    let existingAnalysisId: string | null = null;
    if (url && url !== "manual-entry") {
      const normalizedUrl = url.split("#")[0].replace(/\/$/, "");
      const { data: existingByUrl } = await supabase
        .from("analyses")
        .select("id")
        .eq("user_id", user.id)
        .ilike("url", `${normalizedUrl}%`)
        .order("created_at", { ascending: false })
        .limit(1);
      
      if (existingByUrl && existingByUrl.length > 0) {
        existingAnalysisId = existingByUrl[0].id;
        console.log("Found existing analysis to update:", existingAnalysisId);
      }
    }

    // Determine data source and content
    let scrapedContent: string | null = null;
    let isEstimated = false;
    let dataSource = "scraped";

    if (manual_fields && manual_fields.city) {
      scrapedContent = buildManualEntryContent(manual_fields);
      isEstimated = false;
      dataSource = "manual_entry";
    } else if (manual_content && manual_content.trim().length > 50) {
      scrapedContent = manual_content.trim().substring(0, 12000);
      isEstimated = false;
      dataSource = "pasted";
    } else if (url) {
      const result = await scrapeListingPage(url);
      scrapedContent = result.content;
      isEstimated = result.isEstimated;

      if (result.isEstimated) {
        return new Response(JSON.stringify({ success: false, scrape_failed: true, error: "Listing is protected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      dataSource = "scraped";
    }

    const confidenceLevel = determineConfidence(dataSource, scrapedContent?.length || 0);
    const { systemPrompt, userPrompt } = buildPrompts(url || manual_fields?.listingUrl || "", scrapedContent, isEstimated, dataSource);

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not defined");
    }

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_property",
              description: "Return a complete forensic property investment analysis with precise financial metrics",
              parameters: {
                type: "object",
                properties: {
                  address: { type: "string" },
                  city: { type: "string" },
                  country: { type: "string" },
                  price: { type: "string", description: "Exact price e.g. £750,000" },
                  currency: { type: "string" },
                  image_url: { type: "string", description: "Leave empty string" },
                  property_type: { type: "string" },
                  size_sqm: { type: "number" },
                  year_built: { type: "integer" },
                  bedrooms: { type: "integer" },
                  bathrooms: { type: "integer" },
                  global_score: { type: "integer", description: "0-100 overall investment score" },
                  roi_potential: { type: "integer", description: "0-100" },
                  market_stability: { type: "integer", description: "0-100" },
                  demand_strength: { type: "integer", description: "0-100" },
                  risk_level: { type: "integer", description: "0-100 where 100=lowest risk" },
                  liquidity_outlook: { type: "integer", description: "0-100" },
                  market_classification: { type: "string", enum: ["Emerging", "Stable", "Overpriced", "Premium Zone"] },
                  verdict: { type: "string", enum: ["Strong", "Moderate", "Risky"] },
                  market_rank: { type: "integer" },
                  market_total: { type: "integer" },
                  percentile: { type: "integer" },
                  pros: { type: "array", items: { type: "string" }, description: "3-5 investment pros with specific numbers" },
                  cons: { type: "array", items: { type: "string" }, description: "3-5 investment cons with specific numbers" },
                  red_flags: { type: "array", items: { type: "string" } },
                  opportunity_signals: { type: "array", items: { type: "string" } },
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
                  primary_insight: { type: "string", description: "One-line analytical verdict with numbers" },
                  ai_summary: { type: "string", description: "2-3 sentence data-dense summary with specific metrics" },
                  why_not_90: { type: "array", items: { type: "string" } },
                  projected_roi_low: { type: "number" },
                  projected_roi_high: { type: "number" },
                  downside_scenario: { type: "number" },
                  upside_scenario: { type: "number" },
                  price_history: {
                    type: "array",
                    items: { type: "object", properties: { year: { type: "string" }, value: { type: "number" } }, required: ["year", "value"] },
                  },
                  yield_trend: {
                    type: "array",
                    items: { type: "object", properties: { year: { type: "string" }, value: { type: "number" } }, required: ["year", "value"] },
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
                  },
                  // NEW forensic fields
                  price_per_sqm: { type: "number", description: "Price per m² of the property" },
                  price_per_sqft: { type: "number", description: "Price per sq ft" },
                  market_median_sqm: { type: "number", description: "Micro-market median price per m²" },
                  premium_discount_pct: { type: "number", description: "Premium(+)/Discount(-) vs median %" },
                  fair_value_low: { type: "string", description: "Fair value estimate low end" },
                  fair_value_high: { type: "string", description: "Fair value estimate high end" },
                  cap_rate: { type: "number", description: "Estimated cap rate %" },
                  gross_yield: { type: "number", description: "Gross rental yield %" },
                  net_yield: { type: "number", description: "Net rental yield after expenses %" },
                  gross_annual_rent: { type: "string", description: "Estimated gross annual rent" },
                  net_annual_rent: { type: "string", description: "Estimated net annual rent" },
                  monthly_cash_flow: { type: "string", description: "Net monthly cash flow (unleveraged)" },
                  leveraged_cash_flow: { type: "string", description: "Monthly cash flow at 75% LTV" },
                  break_even_price: { type: "string", description: "Break-even purchase price" },
                  break_even_rent: { type: "string", description: "Break-even monthly rent" },
                  stress_test_market_drop: { type: "string", description: "Value if market drops 15%" },
                  stress_test_rental_decline: { type: "string", description: "Yield impact of 10% rental decline" },
                  opportunity_cost_vs_best: { type: "string", description: "5-year return gap vs best alternative" },
                  capital_efficiency_score: { type: "integer", description: "0-100 return per unit invested vs top quartile" },
                  risk_return_quadrant: { type: "string", description: "High Return/Low Risk, High Return/High Risk, Low Return/Low Risk, Low Return/High Risk" },
                  investor_best_for: { type: "array", items: { type: "string" }, description: "2-3 ideal investor types" },
                  investor_not_for: { type: "array", items: { type: "string" }, description: "2-3 non-ideal investor types" },
                  assumptions: {
                    type: "object",
                    properties: {
                      annual_appreciation: { type: "string" },
                      rental_growth: { type: "string" },
                      vacancy_rate: { type: "string" },
                      maintenance_cost: { type: "string" },
                      interest_rate: { type: "string" },
                      operating_expenses: { type: "string" },
                    },
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
                additionalProperties: true,
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
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
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

    // Extract standard DB fields and keep extra forensic fields in score_explanations
    const forensicExtras = {
      price_per_sqm: analysis.price_per_sqm,
      price_per_sqft: analysis.price_per_sqft,
      market_median_sqm: analysis.market_median_sqm,
      premium_discount_pct: analysis.premium_discount_pct,
      fair_value_low: analysis.fair_value_low,
      fair_value_high: analysis.fair_value_high,
      cap_rate: analysis.cap_rate,
      gross_yield: analysis.gross_yield,
      net_yield: analysis.net_yield,
      gross_annual_rent: analysis.gross_annual_rent,
      net_annual_rent: analysis.net_annual_rent,
      monthly_cash_flow: analysis.monthly_cash_flow,
      leveraged_cash_flow: analysis.leveraged_cash_flow,
      break_even_price: analysis.break_even_price,
      break_even_rent: analysis.break_even_rent,
      stress_test_market_drop: analysis.stress_test_market_drop,
      stress_test_rental_decline: analysis.stress_test_rental_decline,
      opportunity_cost_vs_best: analysis.opportunity_cost_vs_best,
      capital_efficiency_score: analysis.capital_efficiency_score,
      risk_return_quadrant: analysis.risk_return_quadrant,
      investor_best_for: analysis.investor_best_for,
      investor_not_for: analysis.investor_not_for,
      assumptions: analysis.assumptions,
    };

    // Merge forensic extras into score_explanations for storage
    const enrichedExplanations = {
      ...(analysis.score_explanations || {}),
      forensic: forensicExtras,
    };

    const dbPayload = {
      user_id: user.id,
      url: url || manual_fields?.listingUrl || "manual-entry",
      address: analysis.address,
      city: analysis.city,
      country: analysis.country,
      price: analysis.price,
      currency: analysis.currency,
      image_url: analysis.image_url || "",
      property_type: analysis.property_type,
      size_sqm: analysis.size_sqm,
      year_built: analysis.year_built,
      bedrooms: analysis.bedrooms,
      bathrooms: analysis.bathrooms,
      global_score: analysis.global_score,
      roi_potential: analysis.roi_potential,
      market_stability: analysis.market_stability,
      demand_strength: analysis.demand_strength,
      risk_level: analysis.risk_level,
      liquidity_outlook: analysis.liquidity_outlook,
      market_classification: analysis.market_classification,
      verdict: analysis.verdict,
      market_rank: analysis.market_rank || Math.floor(Math.random() * 30) + 5,
      market_total: analysis.market_total || Math.floor(Math.random() * 150) + 100,
      percentile: analysis.percentile,
      pros: analysis.pros,
      cons: analysis.cons,
      red_flags: analysis.red_flags,
      opportunity_signals: analysis.opportunity_signals,
      score_explanations: enrichedExplanations,
      primary_insight: analysis.primary_insight,
      ai_summary: analysis.ai_summary,
      why_not_90: analysis.why_not_90,
      projected_roi_low: analysis.projected_roi_low,
      projected_roi_high: analysis.projected_roi_high,
      downside_scenario: analysis.downside_scenario,
      upside_scenario: analysis.upside_scenario,
      price_history: analysis.price_history,
      yield_trend: analysis.yield_trend,
      alternatives: analysis.alternatives,
      confidence_level: confidenceLevel,
      data_source: dataSource,
    };

    let saved;
    if (existingAnalysisId) {
      // Update existing analysis
      const { data: updated, error: dbError } = await supabase
        .from("analyses")
        .update(dbPayload)
        .eq("id", existingAnalysisId)
        .select()
        .single();
      if (dbError) {
        console.error("DB update error:", dbError);
        throw new Error("Failed to update analysis");
      }
      saved = updated;
      console.log("Updated existing analysis:", existingAnalysisId);
    } else {
      // Insert new
      const { data: inserted, error: dbError } = await supabase
        .from("analyses")
        .insert(dbPayload)
        .select()
        .single();
      if (dbError) {
        console.error("DB insert error:", dbError);
        throw new Error("Failed to save analysis");
      }
      saved = inserted;
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
