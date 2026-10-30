// Backfill RealHunt 5D scores for bulk-imported rows.
// Only touches: data_source = 'apify_bulk_2026_06' AND global_score IS NULL.
// Computes deterministically from stored fields — does NOT re-scrape URLs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin, authErrorResponse } from "../_shared/require-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DATA_SOURCE = "apify_bulk_2026_06";

// Country tier multipliers (stable demand / liquidity / safety baselines)
const COUNTRY_TIER: Record<string, { demand: number; stability: number; safety: number; liquidity: number }> = {
  "United States": { demand: 78, stability: 80, safety: 76, liquidity: 82 },
  "USA": { demand: 78, stability: 80, safety: 76, liquidity: 82 },
  "United Kingdom": { demand: 76, stability: 82, safety: 80, liquidity: 80 },
  "UK": { demand: 76, stability: 82, safety: 80, liquidity: 80 },
  "Spain": { demand: 74, stability: 72, safety: 74, liquidity: 70 },
  "Portugal": { demand: 72, stability: 70, safety: 76, liquidity: 66 },
  "France": { demand: 72, stability: 78, safety: 76, liquidity: 72 },
  "Germany": { demand: 74, stability: 84, safety: 82, liquidity: 74 },
  "Italy": { demand: 66, stability: 70, safety: 70, liquidity: 60 },
  "Greece": { demand: 64, stability: 60, safety: 70, liquidity: 56 },
  "Mexico": { demand: 70, stability: 58, safety: 50, liquidity: 60 },
  "Thailand": { demand: 68, stability: 60, safety: 66, liquidity: 58 },
  "UAE": { demand: 82, stability: 74, safety: 84, liquidity: 78 },
  "United Arab Emirates": { demand: 82, stability: 74, safety: 84, liquidity: 78 },
  "Indonesia": { demand: 70, stability: 56, safety: 60, liquidity: 56 },
  "Canada": { demand: 74, stability: 80, safety: 84, liquidity: 76 },
  "Australia": { demand: 76, stability: 80, safety: 82, liquidity: 76 },
  "Netherlands": { demand: 78, stability: 82, safety: 82, liquidity: 76 },
  "Turkey": { demand: 66, stability: 48, safety: 58, liquidity: 58 },
  "Brazil": { demand: 64, stability: 52, safety: 50, liquidity: 54 },
};

function tierFor(country?: string | null) {
  if (!country) return { demand: 64, stability: 62, safety: 64, liquidity: 60 };
  return COUNTRY_TIER[country] ?? COUNTRY_TIER[country.trim()] ?? { demand: 64, stability: 62, safety: 64, liquidity: 60 };
}

// Stable hash for jitter so re-runs would be deterministic
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h >>> 0;
}
function jitter(seed: string, range: number): number {
  return ((hash(seed) % (range * 2 + 1)) - range);
}
const clamp = (n: number, lo = 30, hi = 92) => Math.max(lo, Math.min(hi, Math.round(n)));

function parsePrice(p: any): number | null {
  if (p == null) return null;
  const n = Number(String(p).replace(/[^0-9.]/g, ""));
  return isFinite(n) && n > 0 ? n : null;
}

function scoreRow(row: any) {
  const tier = tierFor(row.country);
  const price = parsePrice(row.price);
  const size = Number(row.size_sqm) || null;
  const ppsm = price && size ? price / size : null;
  const year = Number(row.year_built) || null;
  const age = year ? Math.max(0, 2026 - year) : null;
  const beds = Number(row.bedrooms) || null;
  const ptype = (row.property_type || "").toLowerCase();
  const seed = row.id || row.url || row.address || "";

  // ROI potential: better when price/m² is moderate, beds 2-4, newer-ish
  let roi = 58;
  if (ppsm) {
    if (ppsm < 1500) roi += 12;
    else if (ppsm < 3000) roi += 8;
    else if (ppsm < 5000) roi += 2;
    else if (ppsm > 8000) roi -= 8;
  }
  if (beds && beds >= 2 && beds <= 4) roi += 4;
  if (age != null) { if (age < 10) roi += 4; else if (age > 50) roi -= 6; }
  if (ptype.includes("villa") || ptype.includes("house")) roi += 2;
  if (ptype.includes("land") || ptype.includes("plot")) roi -= 4;
  roi = clamp(roi + jitter(seed + ":roi", 5));

  // Market stability: country baseline + age penalty
  let stab = tier.stability;
  if (age != null && age > 60) stab -= 6;
  if (price && price > 2_000_000) stab -= 3;
  stab = clamp(stab + jitter(seed + ":stab", 4));

  // Demand strength: country baseline + bed/type signal
  let dem = tier.demand;
  if (beds && (beds === 2 || beds === 3)) dem += 4;
  if (ptype.includes("apartment") || ptype.includes("condo")) dem += 3;
  if (ptype.includes("land")) dem -= 6;
  dem = clamp(dem + jitter(seed + ":dem", 5));

  // Risk level (safety score — higher = safer): country safety, penalize very old/expensive
  let risk = tier.safety;
  if (age != null && age > 70) risk -= 5;
  if (price && price > 3_000_000) risk -= 4;
  risk = clamp(risk + jitter(seed + ":risk", 4));

  // Liquidity outlook
  let liq = tier.liquidity;
  if (price && price < 250_000) liq += 6;
  else if (price && price > 1_500_000) liq -= 6;
  if (ptype.includes("land")) liq -= 8;
  liq = clamp(liq + jitter(seed + ":liq", 4));

  const global_score = Math.round((roi + stab + dem + risk + liq) / 5);

  let verdict: string, classification: string;
  if (global_score >= 85) { verdict = "Exceptional"; classification = "Top-tier opportunity"; }
  else if (global_score >= 80) { verdict = "Strong"; classification = "Strong fundamentals"; }
  else if (global_score >= 50) { verdict = "Moderate"; classification = "Average market position"; }
  else { verdict = "Risky"; classification = "Below-average risk profile"; }

  const loc = [row.city, row.country].filter(Boolean).join(", ");
  const primary_insight = `${verdict} ${ptype || "property"} in ${loc || "this market"}${ppsm ? ` at ~${Math.round(ppsm)} ${row.currency || ""}/m²` : ""}.`;
  const ai_summary = `Backfill scoring based on stored listing data (${loc || "unknown location"}). ROI ${roi}, Stability ${stab}, Demand ${dem}, Safety ${risk}, Liquidity ${liq}. Low-confidence baseline — verify on listing source.`;

  return {
    global_score, roi_potential: roi, market_stability: stab,
    demand_strength: dem, risk_level: risk, liquidity_outlook: liq,
    market_classification: classification, verdict,
    primary_insight, ai_summary,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = await requireAdmin(req);
    if ("failure" in auth) return authErrorResponse(auth.failure, corsHeaders);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows, error } = await supabase
      .from("analyses")
      .select("id,url,address,city,country,price,currency,property_type,size_sqm,year_built,bedrooms,bathrooms")
      .eq("data_source", DATA_SOURCE)
      .is("global_score", null)
      .limit(1000);
    if (error) throw error;

    let updated = 0;
    const scores: number[] = [];
    for (const row of rows || []) {
      const s = scoreRow(row);
      const { error: upErr } = await supabase
        .from("analyses")
        .update({ ...s, confidence_level: "low" })
        .eq("id", row.id)
        .eq("data_source", DATA_SOURCE)
        .is("global_score", null);
      if (!upErr) { updated++; scores.push(s.global_score); }
      else console.error("update err", row.id, upErr.message);
    }

    scores.sort((a, b) => a - b);
    const stats = scores.length ? {
      count: scores.length,
      min: scores[0],
      median: scores[Math.floor(scores.length / 2)],
      max: scores[scores.length - 1],
    } : { count: 0 };

    return new Response(JSON.stringify({ updated, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("backfill error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
