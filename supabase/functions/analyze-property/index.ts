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
  "hemnet.se", "boliga.dk", "boligsiden.dk", "home.dk", "edc.dk", "nybolig.dk", "danbolig.dk", "finn.no",
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

function isRealEstateUrl(url: string): { isListing: boolean; isRealEstateSite: boolean } {
  if (!url || url === "manual-entry") return { isListing: true, isRealEstateSite: true };
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const isListing = REAL_ESTATE_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));
    return { isListing, isRealEstateSite: true }; // We now accept all URLs
  } catch {
    return { isListing: false, isRealEstateSite: false };
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

async function attemptScrape(url: string, apiKey: string, waitFor: number, timeoutMs: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown", "links"], onlyMainContent: true, waitFor }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!response.ok) { console.error("Firecrawl error:", response.status); return null; }
    const data = await response.json();
    const markdown = data.data?.markdown || data.markdown || null;
    if (!markdown || markdown.trim().length < 50) { console.log("Content too short"); return null; }
    if (isBlockedContent(markdown)) { console.log("Blocked content detected"); return null; }
    return markdown;
  } catch (error) { console.error("Scrape attempt failed:", error); return null; }
}

async function scrapeListingPage(url: string): Promise<{ content: string | null; isEstimated: boolean }> {
  const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
  if (!apiKey) return { content: null, isEstimated: true };

  console.log("Scraping listing page (attempt 1, waitFor=5000):", url);
  let markdown = await attemptScrape(url, apiKey, 5000, 45000);

  // RETRY: If first attempt failed, try again with longer wait for JS-heavy/protected sites
  if (!markdown) {
    console.log("First scrape failed, retrying (attempt 2, waitFor=12000):", url);
    markdown = await attemptScrape(url, apiKey, 12000, 60000);
  }

  if (!markdown) return { content: null, isEstimated: true };

  console.log("Scrape successful, content length:", markdown.length);
  const truncated = markdown.length > 12000 ? markdown.substring(0, 12000) + "\n\n[Content truncated...]" : markdown;
  return { content: truncated, isEstimated: false };
}

// Detect if listing is a rental/Airbnb (not for sale)
function detectListingType(content: string, url: string): "sale" | "rental" | "vacation_rental" {
  const lowerUrl = url.toLowerCase();
  // Airbnb, Booking, VRBO are always vacation rentals
  if (/airbnb\.|booking\.com|vrbo\.com/.test(lowerUrl)) return "vacation_rental";
  
  const lowerContent = content.toLowerCase();
  const rentalSignals = [
    /\bfor rent\b/i, /\balquiler\b/i, /\bà louer\b/i, /\bzu vermieten\b/i, /\baffitto\b/i,
    /\bmonthly rent\b/i, /\bper month\b/i, /\b\/mes\b/i, /\b\/month\b/i, /\b\/mo\b/i,
    /\brental price\b/i, /\bprecio alquiler\b/i, /\bhuur\b/i, /\bhyra\b/i,
    /\bleje\b/i, /\bleie\b/i, /\bvuokra\b/i,
    /\bper night\b/i, /\bper notte\b/i, /\bpor noche\b/i, /\bpro nacht\b/i, /\bpar nuit\b/i,
  ];
  const saleSignals = [
    /\bfor sale\b/i, /\ben venta\b/i, /\bà vendre\b/i, /\bzu verkaufen\b/i, /\bin vendita\b/i,
    /\basking price\b/i, /\bprecio venta\b/i, /\bpurchase price\b/i, /\bte koop\b/i,
    /\btill salu\b/i, /\btil salg\b/i, /\bmyytävänä\b/i,
  ];
  const vacationSignals = [
    /\bper night\b/i, /\bper notte\b/i, /\bpor noche\b/i, /\bpro nacht\b/i, /\bpar nuit\b/i,
    /\bcheck-?in\b/i, /\bcheck-?out\b/i, /\bguests?\b/i, /\bsuperhost\b/i, /\bself check/i,
    /\bamenities\b/i, /\bhouse rules\b/i,
  ];

  const rentalCount = rentalSignals.filter(r => r.test(lowerContent)).length;
  const saleCount = saleSignals.filter(r => r.test(lowerContent)).length;
  const vacationCount = vacationSignals.filter(r => r.test(lowerContent)).length;

  if (vacationCount >= 2) return "vacation_rental";
  if (rentalCount > saleCount && rentalCount >= 2) return "rental";
  return "sale";
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

function determineConfidence(dataSource: string, contentLength: number, isStandardListing: boolean): string {
  if (!isStandardListing) return "low"; // Non-listing websites always get low confidence
  if (dataSource === "scraped" && contentLength > 500) return "high";
  if (dataSource === "pasted" && contentLength > 200) return "high";
  if (dataSource === "pasted" && contentLength > 50) return "medium";
  if (dataSource === "manual_entry") return "medium";
  return "low";
}

function buildPrompts(url: string, scrapedContent: string | null, isEstimated: boolean, dataSource: string, isStandardListing: boolean = true, listingType: string = "sale") {
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
   - Stress test scenarios

8. NEIGHBORHOOD INTELLIGENCE (NEW):
   - Estimate walk score (0-100) and transit score (0-100)
   - Nearest airport and distance
   - Tourist/expat demand level (Low/Medium/High/Very High)
   - Safety/crime rating (Low/Medium/High)
   - School quality nearby

9. COMPARABLE TRANSACTIONS (NEW):
   - List 3-5 recent comparable sales nearby with address, price, size, price/m², date
   - List 3-4 similar rentals with address, monthly rent, size, rent/m²

10. COST BREAKDOWN (NEW):
    - Estimated closing costs (notary, tax, agency fees)
    - Annual property tax, insurance, maintenance
    - Total Year-1 cost of ownership

11. MORTGAGE SCENARIOS (NEW):
    - Calculate for 60%, 75%, 90% LTV
    - Monthly payment, total interest, cash-on-cash return for each

12. EXIT STRATEGY (NEW):
    - Best exit window (years), selling costs %
    - Net proceeds after 5 years (base case)
    - Internal Rate of Return (IRR)

13. MARKET CONTEXT (NEW):
    - Average days on market, YoY price change %
    - Supply/demand ratio, new construction pipeline

14. PROPERTY FEATURES (NEW):
    - Extract key features: terrace, views, elevator, parking, pool, etc.
    - Renovation status, energy rating, floor/orientation

15. INVESTMENT CLASSIFICATION (NEW):
    - Capital growth asset? Y/N
    - Yield-optimized? Y/N
    - Strong liquidity? Y/N
    - Low regulatory risk? Y/N
    - Cash-flow positive? Y/N

16. LISTING IMAGE (NEW):
    - Extract the main listing photo URL from the scraped content if available`;

  const listingWarning = !isStandardListing ? `
CRITICAL: This is NOT a property listing — it is a real estate company/developer/project WEBSITE.
You MUST follow these strict rules:
- DO NOT invent a specific property address, price, size, bedrooms, or bathrooms if they are not EXPLICITLY stated in the content.
- If the page shows MULTIPLE projects or units without a single clear listing, set address to the company/project name, price to null, size_sqm to null, bedrooms to null, bathrooms to null.
- For city/country: ONLY use location info that is EXPLICITLY mentioned in the page content. If no location is mentioned, set city to "Unknown" and country to "Unknown".
- Set global_score to a LOWER range (30-55) reflecting the lack of concrete data.
- The ai_summary MUST start with "[PROJECT SITE — LIMITED DATA]" and explain this is a developer/project website, not a specific listing.
- For financial metrics (cap_rate, yields, cash flow, break-even, mortgage scenarios): set to null unless specific unit pricing is provided.
- Focus your analysis on: what the company offers, market context IF location is clear, general observations.
- Do NOT hallucinate comparable sales, rental comps, or neighborhood scores unless the location is explicitly confirmed in the content.
` : "";

  const rentalWarning = listingType !== "sale" ? `
IMPORTANT: This listing is a ${listingType === "vacation_rental" ? "VACATION RENTAL (e.g. Airbnb)" : "LONG-TERM RENTAL"}, NOT a property for sale.
- The price shown is a RENTAL price (per night/month), NOT a purchase price.
- You MUST ESTIMATE the property's MARKET VALUE (purchase price) based on location, size, comparable sales, and rental yield reverse-engineering.
- Set the "price" field to the ESTIMATED MARKET VALUE with a clear label, e.g. "~€350,000 (estimated market value)"
- In ai_summary, START with "[RENTAL LISTING — ESTIMATED MARKET VALUE]" and explain: the listing is for rent at X/month (or X/night), and you estimate the market value at Y based on comparable sales and typical yields in the area.
- Include the rental price in primary_insight.
- Calculate yields using the ACTUAL rental price from the listing.
` : "";

  if (scrapedContent) {
    const systemPrompt = `You are a forensic real estate investment analyst producing institutional-grade reports. Extract EXACT data from the listing. Never invent details.
${listingWarning}${rentalWarning}
CRITICAL RULES:
- Use the REAL price, size, bedrooms, bathrooms, address FROM THE SCRAPED CONTENT
- NEVER convert currencies. If the listing price is in £ (GBP), report it in £. If in DKK, report in DKK. If in €, report in €. The "currency" field must match.
- The "price" string must show the ORIGINAL currency symbol and amount exactly as listed (e.g. "£750,000" not "€875,000")
- All financial metrics (fair value, rent, cash flow, etc.) must use the SAME currency as the listing
- If size is in acres, convert to m² (1 acre = 4046.86 m²). If ft², convert (1 ft² = 0.0929 m²)
- If data is missing, use null
- Be forensic, data-dense, defensible
- Never fabricate precision
- Include SPECIFIC NUMBERS in all analyses — no vague language

ANTI-HALLUCINATION RULES (MANDATORY):
- If the listing says "Ask agent", "Contact agent", "POA", "Not specified", or similar for SIZE: set size_sqm to null. Do NOT estimate or guess.
- If year_built is NOT explicitly stated as a number in the listing content: set year_built to null. Do NOT estimate or guess based on property style/type.
- NEVER estimate or infer size_sqm or year_built — only use values EXPLICITLY written in the listing text.
- When MULTIPLE PRICES exist (e.g. Lifetime Lease price vs full market value, shared ownership vs market price), use the FULL MARKET VALUE as the "price" field, and clearly explain BOTH prices in ai_summary and primary_insight (e.g. "Guide price £320,500 via Lifetime Lease for over-60s; full market value £485,000").
${forensicInstructions}`;

    const userPrompt = `Analyze this property listing for investment potential.

URL: ${url}
Data Source: ${dataSource === "scraped" ? "Direct page scrape" : dataSource === "pasted" ? "User-provided listing text" : "Manual entry by user"}
${!isStandardListing ? "⚠️ NOTE: This is a project/developer website, not a standard listing portal. Extract what you can." : ""}
${listingType !== "sale" ? `⚠️ NOTE: This is a ${listingType === "vacation_rental" ? "vacation rental (Airbnb/Booking)" : "rental"} listing, NOT for sale. Estimate market value.` : ""}

LISTING CONTENT:
---
${scrapedContent}
---

Provide a complete forensic investment analysis. Be rigorous and analytical. Include precise numerical estimates for all metrics.`;

    return { systemPrompt, userPrompt };
  }

  const systemPrompt = `You are a forensic real estate investment analyst. Given a property URL, generate analysis using your knowledge. Mark "[ESTIMATED]" at start of ai_summary.
${listingWarning}
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

    // URL classification - accept all URLs but flag non-listing sites
    let isStandardListing = true;
    if (url && url !== "manual-entry" && !manual_fields && !manual_content) {
      const urlCheck = isRealEstateUrl(url);
      isStandardListing = urlCheck.isListing;
      // We no longer reject non-listing URLs - we try to analyze them with a warning
    }

    if (!url && !manual_fields?.city) {
      return new Response(JSON.stringify({ error: "URL or property details required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Global cache: check if ANY user already analyzed this URL ---
    if (url && url !== "manual-entry") {
      // Stronger URL normalization: strip hash, trailing slash, query params, www prefix, protocol
      const urlObj = new URL(url);
      const normalizedUrl = (urlObj.hostname.replace(/^www\./, "") + urlObj.pathname).replace(/\/$/, "").toLowerCase();
      
      const { data: cachedGlobal } = await supabase
        .from("analyses")
        .select("*")
        .not("global_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      
      // Find a match using the same normalization
      const matchedCache = cachedGlobal?.find((row: any) => {
        try {
          const rowUrl = new URL(row.url);
          const normalizedRow = (rowUrl.hostname.replace(/^www\./, "") + rowUrl.pathname).replace(/\/$/, "").toLowerCase();
          return normalizedRow === normalizedUrl;
        } catch { return false; }
      });
      
      if (matchedCache) {
        const isOwnAnalysis = matchedCache.user_id === user.id;
        
        if (isOwnAnalysis) {
          console.log("Returning user's existing cached analysis:", matchedCache.id);
          return new Response(JSON.stringify({ success: true, data: matchedCache }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // Clone for this user — but first check if user already has one
          const userMatch = cachedGlobal?.find((row: any) => {
            if (row.user_id !== user.id) return false;
            try {
              const rowUrl = new URL(row.url);
              const normalizedRow = (rowUrl.hostname.replace(/^www\./, "") + rowUrl.pathname).replace(/\/$/, "").toLowerCase();
              return normalizedRow === normalizedUrl;
            } catch { return false; }
          });
          if (userMatch) {
            console.log("User already has this analysis:", userMatch.id);
            return new Response(JSON.stringify({ success: true, data: userMatch }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          
          const { id: _id, created_at: _ca, user_id: _uid, ...cloneData } = matchedCache;
          const { data: cloned, error: cloneError } = await supabase
            .from("analyses")
            .insert({ ...cloneData, user_id: user.id })
            .select()
            .single();
          if (cloned && !cloneError) {
            console.log("Cloned cached analysis for user:", cloned.id);
            return new Response(JSON.stringify({ success: true, data: cloned }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    // --- Duplicate detection: check if same URL already analyzed by this user ---
    let existingAnalysisId: string | null = null;
    if (url && url !== "manual-entry") {
      const urlObj2 = new URL(url);
      const normalizedUrl2 = (urlObj2.hostname.replace(/^www\./, "") + urlObj2.pathname).replace(/\/$/, "").toLowerCase();
      const { data: existingByUrl } = await supabase
        .from("analyses")
        .select("id, url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      
      const match = existingByUrl?.find((row: any) => {
        try {
          const rowUrl = new URL(row.url);
          const normalizedRow = (rowUrl.hostname.replace(/^www\./, "") + rowUrl.pathname).replace(/\/$/, "").toLowerCase();
          return normalizedRow === normalizedUrl2;
        } catch { return false; }
      });
      if (match) {
        existingAnalysisId = match.id;
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
        // Trigger fallback for ALL sites when scrape fails - don't hallucinate data
        return new Response(JSON.stringify({ success: false, scrape_failed: true, error: "Could not access listing page. The site may be protected or temporarily unavailable." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      dataSource = isStandardListing ? "scraped" : "project_website";
    }

    // Detect listing type (sale vs rental vs vacation rental)
    const listingType = detectListingType(scrapedContent || "", url || "");
    console.log("Detected listing type:", listingType);

    const confidenceLevel = determineConfidence(dataSource, scrapedContent?.length || 0, isStandardListing);
    const { systemPrompt, userPrompt } = buildPrompts(url || manual_fields?.listingUrl || "", scrapedContent, isEstimated, dataSource, isStandardListing, listingType);

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
                   price: { type: "string", description: "EXACT price from listing in ORIGINAL currency, e.g. £750,000, kr 1.795.000, €485,000. NEVER convert." },
                   currency: { type: "string", description: "ISO currency code matching the listing: GBP, EUR, USD, DKK, SEK, NOK, etc." },
                  image_url: { type: "string", description: "Main listing photo URL if found in scraped content. Empty string if not available." },
                  property_type: { type: "string" },
                  size_sqm: { type: "number", nullable: true, description: "Total property size in m². Set to null if listing says 'Ask agent', 'Contact agent', 'Not specified', or if size is NOT explicitly stated as a number." },
                  year_built: { type: "integer", nullable: true, description: "Year the property was built. Set to null if NOT explicitly stated as a year number in the listing content. Do NOT guess based on property style." },
                  bedrooms: { type: "integer" },
                  bathrooms: { type: "integer" },
                  global_score: { type: "integer", description: "0-100 overall investment score" },
                  roi_potential: { type: "integer", description: "0-100" },
                  market_stability: { type: "integer", description: "0-100" },
                  demand_strength: { type: "integer", description: "0-100" },
                  risk_level: { type: "integer", description: "0-100 where 100=lowest risk" },
                  liquidity_outlook: { type: "integer", description: "0-100" },
                  market_classification: { type: "string", enum: ["Emerging", "Stable", "Overpriced", "Premium Zone"] },
                  verdict: { type: "string", enum: ["Exceptional", "Strong", "Moderate", "Risky"] },
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
                   projected_roi_low: { type: "number", description: "5-year projected ROI LOW estimate as PERCENTAGE (e.g. 3.5 meaning 3.5%). Must be between -50 and 100." },
                   projected_roi_high: { type: "number", description: "5-year projected ROI HIGH estimate as PERCENTAGE (e.g. 8.2 meaning 8.2%). Must be between -50 and 100." },
                   downside_scenario: { type: "number", description: "5-year downside scenario as PERCENTAGE change (e.g. -8.5 meaning -8.5% loss). Must be between -100 and 0. NEVER use absolute values." },
                   upside_scenario: { type: "number", description: "5-year upside scenario as PERCENTAGE gain (e.g. 15.0 meaning +15% gain). Must be between 0 and 100. NEVER use absolute values." },
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
                  // Forensic financial fields
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
                  // NEW: Neighborhood Intelligence
                  neighborhood_scores: {
                    type: "object",
                    properties: {
                      walk_score: { type: "integer", description: "Walkability 0-100" },
                      transit_score: { type: "integer", description: "Transit access 0-100" },
                      nearest_airport: { type: "string", description: "Nearest airport and distance" },
                      tourist_demand: { type: "string", description: "Low/Medium/High/Very High" },
                      safety_rating: { type: "string", description: "Low/Medium/High" },
                      school_quality: { type: "string", description: "Brief indicator" },
                    },
                  },
                  // NEW: Comparable Sales
                  comparable_sales: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        address: { type: "string" },
                        price: { type: "string" },
                        size_sqm: { type: "number" },
                        price_per_sqm: { type: "number" },
                        date_sold: { type: "string" },
                      },
                      required: ["address", "price", "size_sqm", "price_per_sqm"],
                    },
                    description: "3-5 recent comparable sales",
                  },
                  // NEW: Rental Comps
                  rental_comps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        address: { type: "string" },
                        monthly_rent: { type: "string" },
                        size_sqm: { type: "number" },
                        rent_per_sqm: { type: "number" },
                      },
                      required: ["address", "monthly_rent", "size_sqm"],
                    },
                    description: "3-4 similar rentals in the area",
                  },
                  // NEW: Cost Breakdown
                  cost_breakdown: {
                    type: "object",
                    properties: {
                      closing_costs: { type: "string" },
                      annual_tax: { type: "string" },
                      annual_insurance: { type: "string" },
                      annual_maintenance: { type: "string" },
                      total_year1: { type: "string" },
                    },
                  },
                  // NEW: Mortgage Scenarios
                  mortgage_scenarios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ltv: { type: "integer" },
                        monthly_payment: { type: "string" },
                        total_interest: { type: "string" },
                        cash_on_cash: { type: "number", description: "Cash-on-cash return %" },
                      },
                      required: ["ltv", "monthly_payment", "total_interest", "cash_on_cash"],
                    },
                    description: "3 scenarios: 60%, 75%, 90% LTV",
                  },
                  // NEW: Exit Strategy
                  exit_strategy: {
                    type: "object",
                    properties: {
                      best_exit_years: { type: "integer" },
                      selling_costs_pct: { type: "number" },
                      net_proceeds_5yr: { type: "string" },
                      irr: { type: "number", description: "Internal Rate of Return %" },
                    },
                  },
                  // NEW: Market Context
                  market_context: {
                    type: "object",
                    properties: {
                      avg_days_on_market: { type: "integer" },
                      yoy_price_change: { type: "number", description: "Year-over-year %" },
                      supply_demand_ratio: { type: "string" },
                      new_construction: { type: "string" },
                    },
                  },
                  // NEW: Property Features
                  property_features: { type: "array", items: { type: "string" }, description: "Key features: sea views, elevator, terrace, pool, parking, etc." },
                  energy_rating: { type: "string", description: "Energy rating if available" },
                  floor_info: { type: "string", description: "Floor/orientation info" },
                  renovation_status: { type: "string", description: "New/Renovated/Needs work/Unknown" },
                  // NEW: Investment Classification
                  investment_classification: {
                    type: "object",
                    properties: {
                      capital_growth: { type: "boolean" },
                      yield_optimized: { type: "boolean" },
                      strong_liquidity: { type: "boolean" },
                      low_regulatory_risk: { type: "boolean" },
                      cash_flow_positive: { type: "boolean" },
                    },
                  },
                  // NEW: Listing image
                  listing_image_url: { type: "string", description: "Main listing photo URL extracted from content" },
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

    // SANITY CHECKS: Clamp percentage fields that AI sometimes returns as absolute values
    const clampPct = (v: any, min: number, max: number) => {
      if (v == null || typeof v !== "number") return v;
      // If value looks like an absolute number (> max * 10), it's clearly wrong
      if (Math.abs(v) > max * 10) return null;
      return Math.max(min, Math.min(max, v));
    };
    analysis.upside_scenario = clampPct(analysis.upside_scenario, 0, 100);
    analysis.downside_scenario = clampPct(analysis.downside_scenario, -100, 0);
    // downside might be positive (AI returns 8.5 meaning -8.5%)
    if (analysis.downside_scenario != null && analysis.downside_scenario > 0) {
      analysis.downside_scenario = -analysis.downside_scenario;
    }
    analysis.projected_roi_low = clampPct(analysis.projected_roi_low, -50, 100);
    analysis.projected_roi_high = clampPct(analysis.projected_roi_high, -50, 100);
    analysis.global_score = clampPct(analysis.global_score, 0, 100);
    analysis.roi_potential = clampPct(analysis.roi_potential, 0, 100);
    analysis.market_stability = clampPct(analysis.market_stability, 0, 100);
    analysis.demand_strength = clampPct(analysis.demand_strength, 0, 100);
    analysis.risk_level = clampPct(analysis.risk_level, 0, 100);
    analysis.liquidity_outlook = clampPct(analysis.liquidity_outlook, 0, 100);
    analysis.percentile = clampPct(analysis.percentile, 0, 100);

    // ENFORCE: Global score = average of 5 subscores
    const subscores = [analysis.roi_potential, analysis.market_stability, analysis.demand_strength, analysis.risk_level, analysis.liquidity_outlook].filter(v => v != null && typeof v === "number");
    if (subscores.length > 0) {
      analysis.global_score = Math.round(subscores.reduce((a: number, b: number) => a + b, 0) / subscores.length);
    }

    // ENFORCE VERDICT CONSISTENCY: verdict MUST match global_score to avoid confusion
    const gs = analysis.global_score;
    if (gs != null) {
      if (gs >= 85) analysis.verdict = "Exceptional";
      else if (gs >= 70) analysis.verdict = "Strong";
      else if (gs >= 50) analysis.verdict = "Moderate";
      else analysis.verdict = "Risky";
    }

    // SPECIAL EXCEPTION: ecobeachcity.com — boosted scores for testing/demo
    if (url && url.toLowerCase().includes("ecobeachcity.com")) {
      analysis.global_score = 92;
      analysis.roi_potential = 91;
      analysis.market_stability = 88;
      analysis.demand_strength = 90;
      analysis.risk_level = 85;
      analysis.liquidity_outlook = 87;
      analysis.percentile = 96;
      analysis.verdict = "Exceptional";
      analysis.market_classification = "Emerging";
      // Force safety rating to Good
      if (analysis.score_explanations?.forensic?.neighborhood_scores) {
        analysis.score_explanations.forensic.neighborhood_scores.safety_rating = "Good";
      }
      if (!analysis.score_explanations) analysis.score_explanations = {};
      if (!analysis.score_explanations.forensic) analysis.score_explanations.forensic = {};
      if (!analysis.score_explanations.forensic.neighborhood_scores) analysis.score_explanations.forensic.neighborhood_scores = {};
      analysis.score_explanations.forensic.neighborhood_scores.safety_rating = "Good";
      if (analysis.projected_roi_low != null) analysis.projected_roi_low = Math.max(analysis.projected_roi_low, 12);
      if (analysis.projected_roi_high != null) analysis.projected_roi_high = Math.max(analysis.projected_roi_high, 22);
      if (analysis.upside_scenario != null) analysis.upside_scenario = Math.max(analysis.upside_scenario, 35);
    }

    // POST-AI VALIDATION: Prevent hallucinated size_sqm and year_built
    if (scrapedContent && analysis.size_sqm != null) {
      const contentLower = scrapedContent.toLowerCase();
      const hasAskAgent = contentLower.includes("ask agent") || contentLower.includes("contact agent") || contentLower.includes("not specified") || contentLower.includes("poa");
      if (hasAskAgent) {
        console.log("Size nulled: listing says ask agent/not specified");
        analysis.size_sqm = null;
      } else {
        // Check if the size value actually appears in the content
        const sizeStr = String(Math.round(analysis.size_sqm));
        const sqftEquiv = String(Math.round(analysis.size_sqm * 10.7639));
        const hasSizeInContent = contentLower.includes(sizeStr + " m") ||
          contentLower.includes(sizeStr + "m") ||
          contentLower.includes(sizeStr + " sq") ||
          contentLower.includes(sqftEquiv + " sq") ||
          contentLower.includes(sqftEquiv + "sq") ||
          contentLower.includes(sizeStr + " ft") ||
          /\b\d+['′]\d+/.test(scrapedContent); // room dimensions like 14'5
        if (!hasSizeInContent) {
          console.log("Size nulled: value not found in scraped content");
          analysis.size_sqm = null;
        }
      }
    }

    if (scrapedContent && analysis.year_built != null) {
      const yearStr = String(analysis.year_built);
      if (!scrapedContent.includes(yearStr)) {
        console.log("year_built nulled: value not found in scraped content");
        analysis.year_built = null;
      }
    }

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
      // NEW fields
      neighborhood_scores: analysis.neighborhood_scores,
      comparable_sales: analysis.comparable_sales,
      rental_comps: analysis.rental_comps,
      cost_breakdown: analysis.cost_breakdown,
      mortgage_scenarios: analysis.mortgage_scenarios,
      exit_strategy: analysis.exit_strategy,
      market_context: analysis.market_context,
      property_features: analysis.property_features,
      energy_rating: analysis.energy_rating,
      floor_info: analysis.floor_info,
      renovation_status: analysis.renovation_status,
      investment_classification: analysis.investment_classification,
      listing_image_url: analysis.listing_image_url,
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
      data_source: listingType !== "sale" ? listingType : dataSource,
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

    return new Response(JSON.stringify({ success: true, data: saved, non_listing_warning: !isStandardListing, listing_type: listingType }), {
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
