import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a clean SVG-based OG image as a data URL
function generateOGSvg(data: {
  address: string;
  city: string;
  country: string;
  score: number;
  verdict: string;
  price: string;
  currency: string;
  property_type: string;
}): string {
  const score = data.score || 0;
  const scoreColor = score >= 80 ? "#0faf6e" : score >= 65 ? "#4ade80" : score >= 50 ? "#f59e0b" : "#ef4444";
  const verdictText = (data.verdict || "Analyzing").toUpperCase();
  const address = (data.address || `${data.city || "Property"}, ${data.country || ""}`).slice(0, 60);
  const priceText = data.price ? `${data.currency || "€"}${data.price}` : "";
  const propertyType = data.property_type || "";

  // Circumference for score ring
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0a0c10"/>
        <stop offset="100%" stop-color="#111827"/>
      </linearGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0faf6e"/>
        <stop offset="100%" stop-color="#4ade80"/>
      </linearGradient>
    </defs>
    
    <!-- Background -->
    <rect width="1200" height="630" fill="url(#bg)"/>
    
    <!-- Subtle grid pattern -->
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-width="0.3" opacity="0.05"/>
    </pattern>
    <rect width="1200" height="630" fill="url(#grid)"/>
    
    <!-- Top accent line -->
    <rect x="0" y="0" width="1200" height="4" fill="url(#accent)"/>
    
    <!-- Logo text -->
    <text x="60" y="72" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="700" fill="#ffffff" letter-spacing="1">
      RealHunt
    </text>
    <text x="210" y="72" font-family="system-ui, sans-serif" font-size="14" fill="#9ca3af" letter-spacing="2">
      PROPERTY INTELLIGENCE
    </text>
    
    <!-- Score Ring -->
    <g transform="translate(180, 340)">
      <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#1f2937" stroke-width="8"/>
      <circle cx="0" cy="0" r="${radius}" fill="none" stroke="${scoreColor}" stroke-width="8" 
        stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" 
        stroke-linecap="round" transform="rotate(-90)"/>
      <text x="0" y="-8" text-anchor="middle" font-family="ui-monospace, monospace" font-size="52" font-weight="800" fill="${scoreColor}">
        ${score}
      </text>
      <text x="0" y="20" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#9ca3af" letter-spacing="3">
        SCORE
      </text>
    </g>
    
    <!-- Property Info -->
    <text x="340" y="260" font-family="system-ui, sans-serif" font-size="32" font-weight="700" fill="#ffffff">
      ${escapeXml(address)}
    </text>
    
    ${priceText ? `<text x="340" y="310" font-family="ui-monospace, monospace" font-size="36" font-weight="800" fill="#ffffff">${escapeXml(priceText)}</text>` : ""}
    
    ${propertyType ? `<text x="340" y="350" font-family="system-ui, sans-serif" font-size="18" fill="#9ca3af">${escapeXml(propertyType)}</text>` : ""}
    
    <!-- Verdict badge -->
    <rect x="340" y="380" width="${verdictText.length * 14 + 32}" height="36" rx="18" fill="${scoreColor}" opacity="0.15"/>
    <text x="356" y="404" font-family="system-ui, sans-serif" font-size="14" font-weight="700" fill="${scoreColor}" letter-spacing="2">
      ${escapeXml(verdictText)}
    </text>
    
    <!-- Bottom bar -->
    <rect x="0" y="580" width="1200" height="50" fill="#0d0f14"/>
    <text x="60" y="612" font-family="system-ui, sans-serif" font-size="16" fill="#6b7280">
      Forensic Property Analysis — realhunt.app
    </text>
    <text x="1140" y="612" text-anchor="end" font-family="system-ui, sans-serif" font-size="16" fill="#6b7280">
      AI-Powered
    </text>
  </svg>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    const id = url.searchParams.get("id");

    if (!slug && !id) {
      return new Response("Missing slug or id parameter", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let query = supabase
      .from("analyses")
      .select("address, city, country, global_score, verdict, price, currency, property_type");

    if (slug) query = query.eq("slug", slug);
    else query = query.eq("id", id);

    const { data, error } = await query.single();

    if (error || !data) {
      return new Response("Analysis not found", { status: 404, headers: corsHeaders });
    }

    const svg = generateOGSvg({
      address: data.address || "",
      city: data.city || "",
      country: data.country || "",
      score: data.global_score || 0,
      verdict: data.verdict || "",
      price: data.price || "",
      currency: data.currency || "€",
      property_type: data.property_type || "",
    });

    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (e) {
    console.error("og-image error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
