// Best-effort import of a property listing from its public page, used to prefill the
// "Submit a deal" form. Signed-in callers only. Everything it returns is editable by the
// hunter, and when a site blocks us the form simply falls back to manual entry.
//
// The fetch is SSRF-guarded: https only, no private/loopback/metadata hosts, redirects
// followed manually and re-validated, hard size and time limits.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const headers = { ...corsHeaders, "Content-Type": "application/json" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers });

const BLOCKED_HOST =
  /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|metadata\.|.*\.internal|.*\.local)$|^\d+$/i;

function safeUrl(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol === "http:") u.protocol = "https:";
  if (u.protocol !== "https:") return null;
  if (BLOCKED_HOST.test(u.hostname)) return null;
  return u;
}

async function fetchPage(start: URL): Promise<string | null> {
  let current = start;
  for (let hop = 0; hop < 4; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; RealHuntBot/1.0; +https://realhunt.co)", "Accept": "text/html" },
      });
    } catch { clearTimeout(timer); return null; } finally { clearTimeout(timer); }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      const next = safeUrl(new URL(loc, current).toString());
      if (!next) return null;
      current = next;
      continue;
    }
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 400_000);
  }
  return null;
}

const meta = (html: string, prop: string) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`, "i");
  const alt = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`, "i");
  return (html.match(re)?.[1] || html.match(alt)?.[1] || "").trim() || null;
};

const decode = (s: string | null) =>
  s ? s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").trim() : null;

function parsePrice(html: string): number | null {
  const candidates = [
    meta(html, "product:price:amount"),
    meta(html, "og:price:amount"),
    html.match(/["']price["']\s*:\s*"?([\d.,]{3,15})"?/i)?.[1] || null,
    html.match(/(?:€|EUR)\s?([\d][\d.,\s]{2,12})/)?.[1] || null,
  ].filter(Boolean) as string[];
  for (const raw of candidates) {
    const cleaned = raw.replace(/\s/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(/,(?=\d{3}\b)/g, "").replace(",", ".");
    const n = Math.round(Number(cleaned));
    if (Number.isFinite(n) && n > 500 && n < 100_000_000) return n;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Sign in to submit a deal." }, 401);
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return json({ error: "Sign in to submit a deal." }, 401);
    const svc = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: allowed } = await svc.rpc("community_limit", { p_key: `extract:${user.id}`, p_max: 20, p_seconds: 3600 });
    if (allowed === false) return json({ error: "Too many links this hour. Fill in the details manually." }, 429);

    const body = await req.json().catch(() => ({}));
    const raw = String(body.url ?? "");
    if (raw.length > 800) return json({ error: "That link is too long." }, 400);
    const target = safeUrl(raw);
    if (!target) return json({ error: "That does not look like a public listing link." }, 400);

    // Duplicate detection against everything already submitted.
    const key = target.toString().replace(/^https?:\/\/(www\.)?/, "").split("#")[0].replace(/\/+$/, "").toLowerCase();
    const { data: dupe } = await client
      .from("community_deals").select("slug,status,title").eq("source_key", key).maybeSingle();
    if (dupe) return json({ duplicate: true, deal: dupe }, 200);

    const html = await fetchPage(target);
    if (!html) {
      return json({ blocked: true, source_url: target.toString(), source_domain: target.hostname.replace(/^www\./, "") });
    }

    const images = [meta(html, "og:image"), meta(html, "twitter:image")]
      .map(decode).filter((u): u is string => !!u && /^https:\/\//.test(u));
    const sqm = html.match(/(\d{2,4})\s?(?:m²|m2|sqm|metros? cuadrados)/i)?.[1];
    const beds = html.match(/(\d{1,2})\s?(?:bed(?:room)?s?|dormitorios?|camere|chambres?)/i)?.[1];

    return json({
      source_url: target.toString(),
      source_domain: target.hostname.replace(/^www\./, ""),
      title: decode(meta(html, "og:title")) || decode(html.match(/<title[^>]*>([^<]{3,200})<\/title>/i)?.[1] ?? null),
      description: decode(meta(html, "og:description")),
      image_urls: [...new Set(images)].slice(0, 6),
      price_eur: parsePrice(html),
      country: decode(meta(html, "og:locale")) ? null : null,
      location_name: decode(meta(html, "og:street-address")) || decode(meta(html, "og:locality")),
      sqm: sqm ? Number(sqm) : null,
      bedrooms: beds ? Number(beds) : null,
    });
  } catch (e) {
    console.error("community-extract", e instanceof Error ? e.message : e);
    return json({ error: "We could not read that page. Fill the details in yourself." }, 200);
  }
});
