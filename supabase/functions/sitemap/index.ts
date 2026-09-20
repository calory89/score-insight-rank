// Dynamic sitemap.xml — includes homepage, static pages, every public analysis (/r/:slug),
// every city /market/:city, and every country /best-deals/:country hub.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://realhunt.co";

const escapeXml = (s: string) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

interface Entry { loc: string; lastmod?: string; changefreq?: string; priority?: string; }

const STATIC: Entry[] = [
  { loc: `${SITE}/`,          changefreq: "daily",   priority: "1.0" },
  { loc: `${SITE}/rankings`,  changefreq: "daily",   priority: "0.9" },
  { loc: `${SITE}/discover`,  changefreq: "daily",   priority: "0.8" },
  { loc: `${SITE}/market`,    changefreq: "daily",   priority: "0.8" },
  { loc: `${SITE}/compare`,   changefreq: "weekly",  priority: "0.6" },
  { loc: `${SITE}/method`,    changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE}/pricing`,   changefreq: "monthly", priority: "0.5" },
  { loc: `${SITE}/for-agents`,changefreq: "monthly", priority: "0.4" },
  { loc: `${SITE}/homescoring`, changefreq: "weekly",  priority: "0.5" },
  { loc: `${SITE}/apply`,       changefreq: "monthly", priority: "0.4" },
  { loc: `${SITE}/legal/privacy`, changefreq: "yearly", priority: "0.2" },
  { loc: `${SITE}/legal/terms`,   changefreq: "yearly", priority: "0.2" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: analyses } = await supabase
      .from("analyses")
      .select("slug, created_at, city, country, global_score")
      .not("slug", "is", null)
      .not("global_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000);

    const entries: Entry[] = [...STATIC];

    const seenCity = new Set<string>();
    const seenCountry = new Set<string>();
    for (const a of analyses || []) {
      entries.push({
        loc: `${SITE}/r/${a.slug}`,
        lastmod: (a.created_at as string)?.slice(0, 10),
        changefreq: "weekly",
        priority: "0.7",
      });
      if (a.city) {
        const key = a.city.toLowerCase();
        if (!seenCity.has(key)) {
          seenCity.add(key);
          entries.push({ loc: `${SITE}/market/${encodeURIComponent(key)}`, changefreq: "daily", priority: "0.7" });
        }
      }
      if (a.country) {
        const key = a.country.toLowerCase();
        if (!seenCountry.has(key)) {
          seenCountry.add(key);
          entries.push({ loc: `${SITE}/best-deals/${encodeURIComponent(key)}`, changefreq: "daily", priority: "0.7" });
        }
      }
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url>
    <loc>${escapeXml(e.loc)}</loc>${e.lastmod ? `\n    <lastmod>${escapeXml(e.lastmod)}</lastmod>` : ""}${e.changefreq ? `\n    <changefreq>${e.changefreq}</changefreq>` : ""}${e.priority ? `\n    <priority>${e.priority}</priority>` : ""}
  </url>`).join("\n")}
</urlset>`;

    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  } catch (e) {
    console.error("sitemap error:", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
