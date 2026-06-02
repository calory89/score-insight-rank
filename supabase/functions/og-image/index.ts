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
}): string {
  const score = data.score || 0;
  const grade = scoreToGrade(score);
  // Paper/notarial palette
  const ink = "#0F1115";
  const inkMuted = "#5C6271";
  const inkSoft = "#8C92A0";
  const accent = "#B8924A";
  const paper = "#FAFAF7";
  const surface = "#FFFFFF";
  const good = "#1F8A4C";
  const warn = "#B57700";
  const bad = "#B23A2E";
  const scoreColor = score >= 80 ? good : score >= 60 ? accent : score >= 45 ? warn : bad;

  const verdictText = (data.verdict || "Analyzing").toUpperCase();
  const address = (data.address || `${data.city || "Property"}, ${data.country || ""}`).slice(0, 56);
  const priceText = data.price ? `${data.currency || "€"}${data.price}` : "";

  const radius = 88;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <rect width="1200" height="630" fill="${paper}"/>

    <!-- Top hairline -->
    <rect x="0" y="0" width="1200" height="4" fill="${accent}"/>

    <!-- Header logo -->
    <text x="64" y="78" font-family="Georgia, 'Times New Roman', serif" font-size="32" font-weight="600" fill="${ink}" letter-spacing="-0.5">RealHunt</text>
    <text x="220" y="78" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="${inkSoft}" letter-spacing="3">FORENSIC PROPERTY ANALYSIS</text>

    <!-- Big score card -->
    <g transform="translate(96, 200)">
      <circle cx="${radius}" cy="${radius}" r="${radius}" fill="${surface}" stroke="rgba(15,17,21,0.08)" stroke-width="1"/>
      <circle cx="${radius}" cy="${radius}" r="${radius - 12}" fill="none" stroke="rgba(15,17,21,0.08)" stroke-width="6"/>
      <circle cx="${radius}" cy="${radius}" r="${radius - 12}" fill="none" stroke="${scoreColor}" stroke-width="6"
        stroke-dasharray="${2 * Math.PI * (radius - 12)}"
        stroke-dashoffset="${(2 * Math.PI * (radius - 12)) - (score / 100) * (2 * Math.PI * (radius - 12))}"
        stroke-linecap="round"
        transform="rotate(-90 ${radius} ${radius})"/>
      <text x="${radius}" y="${radius + 6}" text-anchor="middle" font-family="Georgia, serif" font-size="64" font-weight="700" fill="${ink}">${score}</text>
      <text x="${radius}" y="${radius + 36}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="11" fill="${inkSoft}" letter-spacing="3">RH SCORE</text>
    </g>

    <!-- Grade -->
    <g transform="translate(310, 240)">
      <text font-family="Georgia, serif" font-size="120" font-weight="600" fill="${scoreColor}">${grade}</text>
      <text x="0" y="32" font-family="system-ui, sans-serif" font-size="11" fill="${inkSoft}" letter-spacing="3">GRADE</text>
    </g>

    <!-- Property block -->
    <g transform="translate(520, 230)">
      <text font-family="system-ui, sans-serif" font-size="12" fill="${inkSoft}" letter-spacing="2">PROPERTY</text>
      <text y="42" font-family="Georgia, serif" font-size="34" font-weight="600" fill="${ink}">${escapeXml(address)}</text>
      ${priceText ? `<text y="92" font-family="ui-monospace, monospace" font-size="28" font-weight="700" fill="${ink}">${escapeXml(priceText)}</text>` : ""}
      <g transform="translate(0, ${priceText ? 120 : 80})">
        <rect x="0" y="0" width="${verdictText.length * 11 + 28}" height="32" rx="16" fill="${scoreColor}" opacity="0.12"/>
        <text x="14" y="22" font-family="system-ui, sans-serif" font-size="13" font-weight="700" fill="${scoreColor}" letter-spacing="2">${escapeXml(verdictText)}</text>
      </g>
    </g>

    <!-- Bottom bar -->
    <line x1="64" y1="556" x2="1136" y2="556" stroke="rgba(15,17,21,0.08)" stroke-width="1"/>
    <text x="64" y="592" font-family="system-ui, sans-serif" font-size="14" fill="${inkMuted}">No black box — every number sourced at realhunt.co/method</text>
    <text x="1136" y="592" text-anchor="end" font-family="system-ui, sans-serif" font-size="14" fill="${inkSoft}" letter-spacing="2">REALHUNT.CO</text>
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
    let query = supabase.from("analyses").select("address, city, country, global_score, verdict, price, currency, property_type");
    if (slug) query = query.eq("slug", slug); else query = query.eq("id", id);
    const { data, error } = await query.single();
    if (error || !data) return new Response("Analysis not found", { status: 404, headers: corsHeaders });

    const svg = generateOGSvg({
      address: data.address || "", city: data.city || "", country: data.country || "",
      score: data.global_score || 0, verdict: data.verdict || "",
      price: data.price || "", currency: data.currency || "€", property_type: data.property_type || "",
    });

    return new Response(svg, {
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch (e) {
    console.error("og-image error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
