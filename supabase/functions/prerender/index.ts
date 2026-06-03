// Prerender edge function — returns SEO-complete HTML for crawlers and
// social previewers (WhatsApp, X, Facebook, LinkedIn, Slack, Discord, Googlebot),
// and redirects regular browsers to the SPA route.
//
// Usage: /functions/v1/prerender?path=/r/<slug>
// or:    /functions/v1/prerender?slug=<slug>            (defaults to /r/<slug>)
// or:    /functions/v1/prerender?country=<c>            (best-deals hub)
// or:    /functions/v1/prerender?city=<city>            (market hub)
//
// Wire your custom domain (Cloudflare Worker / reverse proxy) to forward
// crawler user-agents from /r/*, /best-deals/*, /market/* to this function;
// otherwise share links via this URL directly — humans get redirected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://realhunt.co";
const FALLBACK_OG = `${SITE}/og-default.jpg`;

const escapeHtml = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const BOT_RE = /bot|crawl|spider|slurp|whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|embedly|quora|skype|vkshare|w3c_validator|googlebot|bingbot|yandex|duckduckbot|baiduspider|applebot|preview/i;

function renderHtml(opts: {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  jsonLd?: object;
  isBot: boolean;
}) {
  const { title, description, canonical, ogImage, jsonLd, isBot } = opts;
  const jsonLdBlock = jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
    : "";
  // Browsers: redirect to the canonical SPA route. Bots: stay & read tags.
  const redirect = isBot
    ? ""
    : `<meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}"><script>location.replace(${JSON.stringify(canonical)});</script>`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta name="robots" content="index, follow" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="RealHunt" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:image" content="${escapeHtml(ogImage)}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${escapeHtml(ogImage)}" />
${jsonLdBlock}
${redirect}
</head>
<body>
<h1>${escapeHtml(title)}</h1>
<p>${escapeHtml(description)}</p>
<p><a href="${escapeHtml(canonical)}">Open on RealHunt →</a></p>
</body>
</html>`;
}

const scoreToGrade = (s: number) => {
  if (s >= 95) return "A+"; if (s >= 90) return "A"; if (s >= 85) return "A−";
  if (s >= 80) return "B+"; if (s >= 75) return "B"; if (s >= 70) return "B−";
  if (s >= 65) return "C+"; if (s >= 55) return "C"; if (s >= 45) return "D";
  return "F";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") || "";
    const isBot = BOT_RE.test(ua) || url.searchParams.get("bot") === "1";

    const slug = url.searchParams.get("slug");
    const country = url.searchParams.get("country");
    const city = url.searchParams.get("city");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const ogBase = `${supabaseUrl}/functions/v1/og-image`;

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // /r/:slug analysis
    if (slug) {
      const { data: a } = await supabase
        .from("analyses")
        .select("slug, address, city, country, global_score, verdict, primary_insight, ai_summary, price, currency, image_url, roi_potential, market_stability, demand_strength, risk_level, liquidity_outlook")
        .eq("slug", slug)
        .maybeSingle();
      if (!a) return new Response("Not found", { status: 404, headers: corsHeaders });

      const place = a.address || [a.city, a.country].filter(Boolean).join(", ") || "Property";
      const title = `Is ${place} a good deal? — RealHunt Score ${a.global_score ?? "—"}/100`;
      const description = (a.primary_insight || a.ai_summary || `Forensic analysis of ${place}. RealHunt score ${a.global_score}/100. Verdict: ${a.verdict || "—"}. Every number sourced.`).slice(0, 240);
      const canonical = `${SITE}/r/${a.slug}`;
      const ogImage = `${ogBase}?slug=${encodeURIComponent(a.slug!)}`;

      const jsonLd: any = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: place,
        description: description,
        ...(a.image_url ? { image: a.image_url } : {}),
        brand: { "@type": "Brand", name: "RealHunt" },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: String(a.global_score ?? 0),
          bestRating: "100",
          worstRating: "0",
          ratingCount: "1",
          reviewCount: "1",
        },
        review: {
          "@type": "Review",
          author: { "@type": "Organization", name: "RealHunt" },
          reviewRating: { "@type": "Rating", ratingValue: String(a.global_score ?? 0), bestRating: "100", worstRating: "0" },
          reviewBody: a.primary_insight || a.ai_summary || "",
          name: a.verdict || "RealHunt forensic verdict",
        },
        ...(a.price ? { offers: { "@type": "Offer", price: String(a.price).replace(/[^\\d.]/g, "") || "0", priceCurrency: a.currency === "GBP" ? "GBP" : a.currency === "USD" ? "USD" : "EUR", url: canonical } } : {}),
      };

      return new Response(renderHtml({ title, description, canonical, ogImage, jsonLd, isBot }), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=3600" },
      });
    }

    // /best-deals/:country hub
    if (country) {
      const c = country.trim();
      const { data: rows } = await supabase
        .from("analyses")
        .select("slug, address, city, global_score, verdict")
        .ilike("country", c)
        .not("global_score", "is", null)
        .order("global_score", { ascending: false })
        .limit(30);
      const title = `Best-value real estate in ${c}, ranked by RealHunt`;
      const description = `Top ${rows?.length || 0} highest-scored properties in ${c} — forensic RealHunt analysis. Every number sourced.`;
      const canonical = `${SITE}/best-deals/${encodeURIComponent(c.toLowerCase())}`;
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        itemListElement: (rows || []).map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}/r/${r.slug}`,
          name: r.address || r.city || "Property",
        })),
      };
      return new Response(renderHtml({ title, description, canonical, ogImage: FALLBACK_OG, jsonLd, isBot }), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=3600" },
      });
    }

    // /market/:city hub
    if (city) {
      const cy = city.trim();
      const { data: rows } = await supabase
        .from("analyses")
        .select("slug, address, city, country, global_score, verdict")
        .ilike("city", cy)
        .not("global_score", "is", null)
        .order("global_score", { ascending: false })
        .limit(30);
      const title = `Best-value real estate in ${cy}, ranked by RealHunt`;
      const description = `Top ${rows?.length || 0} highest-scored properties in ${cy} — forensic RealHunt analysis. Every number sourced.`;
      const canonical = `${SITE}/market/${encodeURIComponent(cy.toLowerCase())}`;
      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: title,
        itemListElement: (rows || []).map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE}/r/${r.slug}`,
          name: r.address || r.city || "Property",
        })),
      };
      return new Response(renderHtml({ title, description, canonical, ogImage: FALLBACK_OG, jsonLd, isBot }), {
        headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=600, s-maxage=3600" },
      });
    }

    return new Response("Missing slug/country/city parameter", { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("prerender error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
