import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const scoreToGrade = (s: number) => {
  if (s >= 95) return "A+"; if (s >= 90) return "A"; if (s >= 85) return "A−";
  if (s >= 80) return "B+"; if (s >= 75) return "B"; if (s >= 70) return "B−";
  if (s >= 65) return "C+"; if (s >= 55) return "C"; if (s >= 45) return "D";
  return "F";
};

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function generateOGSvg(data: {
  address: string; city: string; country: string;
  score: number; verdict: string; price: string; currency: string; property_type: string;
  bars: { label: string; value: number }[];
}): string {
  const score = data.score || 0;
  const grade = scoreToGrade(score);
  // RealHunt paper/brass palette
  const ink = "#16150F";
  const inkMuted = "#5C5848";
  const inkSoft = "#8A8674";
  const accent = "#B8893B";
  const paper = "#FAF8F3";
  const surface = "#FFFFFF";
  const good = "#1E6B4F";
  const warn = "#B7791F";
  const bad = "#B23A3A";
  const scoreColor = score >= 80 ? good : score >= 60 ? accent : score >= 45 ? warn : bad;
  const barColor = (v: number) => (v >= 7 ? good : v >= 5 ? warn : bad);

  const verdictText = (data.verdict || "Analyzing").toUpperCase();
  const address = (data.address || `${data.city || "Property"}, ${data.country || ""}`).slice(0, 56);
  const priceText = data.price ? `${data.currency || "€"}${data.price}` : "";

  const radius = 88;

  const barsSvg = (data.bars || []).slice(0, 5).map((b, i) => {
    const y = 470 + i * 26;
    const pct = Math.max(0, Math.min(100, (b.value / 10) * 100));
    const w = (pct / 100) * 320;
    const color = barColor(b.value);
    return `
      <text x="64" y="${y + 11}" font-family="system-ui, sans-serif" font-size="11" fill="${inkSoft}" letter-spacing="1.5">${escapeXml(b.label.toUpperCase())}</text>
      <rect x="220" y="${y + 2}" width="320" height="10" rx="5" fill="rgba(22,21,15,0.08)"/>
      <rect x="220" y="${y + 2}" width="${w}" height="10" rx="5" fill="${color}"/>
      <text x="556" y="${y + 11}" font-family="ui-monospace, monospace" font-size="12" fill="${ink}" font-weight="600">${b.value.toFixed(1)}</text>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${paper}"/>
    <rect x="0" y="0" width="1200" height="4" fill="${accent}"/>

    <text x="64" y="78" font-family="Georgia, 'Times New Roman', serif" font-size="32" font-weight="600" fill="${ink}" letter-spacing="-0.5">RealHunt</text>
    <text x="220" y="78" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="${inkSoft}" letter-spacing="3">FORENSIC PROPERTY ANALYSIS</text>

    <g transform="translate(96, 180)">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="${surface}" stroke="rgba(22,21,15,0.08)" stroke-width="1"/>
      <circle cx="${radius}" cy="${radius}" r="${radius - 12}" fill="none" stroke="rgba(22,21,15,0.08)" stroke-width="6"/>
      <circle cx="${radius}" cy="${radius}" r="${radius - 12}" fill="none" stroke="${scoreColor}" stroke-width="6"
        stroke-dasharray="${2 * Math.PI * (radius - 12)}"
        stroke-dashoffset="${(2 * Math.PI * (radius - 12)) - (score / 100) * (2 * Math.PI * (radius - 12))}"
        stroke-linecap="round"
        transform="rotate(-90 ${radius} ${radius})"/>
      <text x="${radius}" y="${radius + 6}" text-anchor="middle" font-family="Georgia, serif" font-size="64" font-weight="700" fill="${ink}">${score}</text>
      <text x="${radius}" y="${radius + 36}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="${inkSoft}" letter-spacing="3">RH SCORE / 100</text>
    </g>

    <g transform="translate(310, 220)">
      <text font-family="Georgia, serif" font-size="120" font-weight="600" fill="${scoreColor}">${grade}</text>
      <text x="0" y="32" font-family="system-ui, sans-serif" font-size="11" fill="${inkSoft}" letter-spacing="3">GRADE</text>
    </g>

    <g transform="translate(520, 210)">
      <text font-family="system-ui, sans-serif" font-size="12" fill="${inkSoft}" letter-spacing="2">PROPERTY</text>
      <text y="42" font-family="Georgia, serif" font-size="32" font-weight="600" fill="${ink}">${escapeXml(address)}</text>
      ${priceText ? `<text y="86" font-family="ui-monospace, monospace" font-size="26" font-weight="700" fill="${ink}">${escapeXml(priceText)}</text>` : ""}
      <g transform="translate(0, ${priceText ? 110 : 72})">
        <rect x="0" y="0" width="${verdictText.length * 10 + 24}" height="28" rx="14" fill="${scoreColor}" opacity="0.12"/>
        <text x="12" y="19" font-family="system-ui, sans-serif" font-size="12" font-weight="700" fill="${scoreColor}" letter-spacing="2">${escapeXml(verdictText)}</text>
      </g>
    </g>

    ${barsSvg}

    <line x1="64" y1="588" x2="1136" y2="588" stroke="rgba(22,21,15,0.08)" stroke-width="1"/>
    <text x="64" y="614" font-family="system-ui, sans-serif" font-size="13" fill="${inkMuted}">No black box — every number sourced.</text>
    <text x="1136" y="614" text-anchor="end" font-family="system-ui, sans-serif" font-size="13" fill="${accent}" letter-spacing="2" font-weight="600">realhunt.co</text>
  </svg>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const id = url.searchParams.get("id");
    if (!slug && !id) return new Response("Missing slug or id parameter", { status: 400, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let query = supabase.from("analyses").select("address, city, country, global_score, verdict, price, currency, property_type, roi_potential, market_stability, demand_strength, risk_level, liquidity_outlook");
    if (slug) query = query.eq("slug", slug); else query = query.eq("id", id);
    const { data, error } = await query.single();
    if (error || !data) return new Response("Analysis not found", { status: 404, headers: corsHeaders });

    const bars = [
      { label: "ROI Potential",     value: Number(data.roi_potential) || 0 },
      { label: "Market Stability",  value: Number(data.market_stability) || 0 },
      { label: "Demand Strength",   value: Number(data.demand_strength) || 0 },
      { label: "Safety Score",      value: Number(data.risk_level) || 0 },
      { label: "Liquidity Outlook", value: Number(data.liquidity_outlook) || 0 },
    ];

    const svg = generateOGSvg({
      address: data.address || "", city: data.city || "", country: data.country || "",
      score: data.global_score || 0, verdict: data.verdict || "",
      price: data.price || "", currency: data.currency || "€", property_type: data.property_type || "",
      bars,
    });

    return new Response(svg, {
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (e) {
    console.error("og-image error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
