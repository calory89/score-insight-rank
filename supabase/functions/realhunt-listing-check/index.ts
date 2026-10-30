// Daily check of the original listing behind every RealHunt home (24-oct-2026).
// Called by pg_cron through pg_net (realhunt.rh_listing_check_tick) with a shared secret, a batch at a time.
// For each home it records what the source says in realhunt.listing_probes: still up (and the price it shows,
// when the page publishes one in structured data), gone (404/410, or sent back to a search or home page,
// or an explicit "no longer available" notice), or blocked (the portal refused a robot). It never changes a
// home by itself: realhunt.rh_listing_check_apply() acts only on two matching readings on different days.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UA = "Mozilla/5.0 (compatible; RealHuntListingCheck/1.0; +https://realhunt.co/method)";
const GONE_TEXT = [
  "no longer available", "this listing has been removed", "listing is no longer", "property has been sold", "this home is off the market", "off market",
  "ya no está disponible", "anuncio no disponible", "este anuncio ya no", "inmueble ya no está",
  "annuncio non è più disponibile", "l'annuncio non è più", "immobile non più disponibile",
  "annonce n'est plus disponible", "cette annonce n'est plus",
  "anzeige ist nicht mehr verfügbar", "anzeige wurde deaktiviert", "nicht mehr verfügbar",
  "boligen er solgt", "annoncen er ikke længere", "bostaden är såld", "annonsen är borttagen",
  "ogłoszenie jest nieaktualne", "oferta nieaktualna", "deze woning is verkocht", "advertentie is niet meer beschikbaar",
];
const SKIP_DOMAINS = ["instagram.com", "facebook.com", "tiktok.com"];

function priceFromHtml(html: string): { price: number; currency: string } | null {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (o: any): any => {
        if (!o || typeof o !== "object") return null;
        if (Array.isArray(o)) { for (const x of o) { const r = walk(x); if (r) return r; } return null; }
        const off = o.offers || (o["@type"] === "Offer" ? o : null);
        const offers = Array.isArray(off) ? off[0] : off;
        if (offers && (offers.price || offers.lowPrice) && (offers.priceCurrency)) {
          const p = Number(String(offers.price ?? offers.lowPrice).replace(/[^\d.]/g, ""));
          if (p > 0) return { price: Math.round(p), currency: String(offers.priceCurrency).toUpperCase() };
        }
        for (const v of Object.values(o)) { const r = walk(v); if (r) return r; }
        return null;
      };
      const r = walk(JSON.parse(m[1])); if (r) return r;
    } catch { /* bad JSON-LD */ }
  }
  const amt = html.match(/<meta[^>]+(?:property|name)=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([\d.,]+)["']/i);
  const cur = html.match(/<meta[^>]+(?:property|name)=["'](?:product:price:currency|og:price:currency)["'][^>]+content=["']([A-Za-z]{3})["']/i);
  if (amt && cur) { const p = Number(amt[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".")); if (p > 0) return { price: Math.round(p), currency: cur[1].toUpperCase() }; }
  return null;
}

async function check(url: string): Promise<{ status: number; final_url: string; verdict: string; price?: number; currency?: string; note?: string }> {
  let cur = url, status = 0;
  const orig = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 10000);
    let res: Response;
    try { res = await fetch(cur, { redirect: "manual", signal: ctl.signal, headers: { "User-Agent": UA, "Accept": "text/html,application/xhtml+xml", "Accept-Language": "en,es;q=0.8" } }); }
    catch (e) { clearTimeout(t); return { status: 0, final_url: cur, verdict: "error", note: String((e as Error).message).slice(0, 120) }; }
    clearTimeout(t); status = res.status;
    if (status >= 300 && status < 400 && res.headers.get("location")) { cur = new URL(res.headers.get("location")!, cur).toString(); await res.body?.cancel(); continue; }
    if (status === 404 || status === 410) { await res.body?.cancel(); return { status, final_url: cur, verdict: "gone", note: "http " + status }; }
    if (status === 202 || status === 401 || status === 403 || status === 429 || status >= 500) { await res.body?.cancel(); return { status, final_url: cur, verdict: "blocked" }; }
    const fin = new URL(cur);
    // Sent back to the portal's home or a search page: the listing is gone.
    const depth = (u: URL) => u.pathname.split("/").filter(Boolean).length;
    if (fin.hostname.replace(/^www\./, "") === orig.hostname.replace(/^www\./, "") && depth(orig) >= 2 && (fin.pathname === "/" || /\/(search|buscar|busqueda|ricerca|recherche|suche|sok|szukaj|zoeken|resultados?)(\/|$)/i.test(fin.pathname))) {
      await res.body?.cancel(); return { status, final_url: cur, verdict: "gone", note: "redirected to " + fin.pathname };
    }
    const html = (await res.text()).slice(0, 1_500_000);
    if (/captcha|are you a robot|access denied|datadome|perimeterx/i.test(html.slice(0, 20000)) && html.length < 60000) return { status, final_url: cur, verdict: "blocked", note: "bot wall" };
    if (/[?&](propertyNotFound|notfound|removed)\b/i.test(fin.search)) return { status, final_url: cur, verdict: "gone", note: "not-found redirect" };
    // Only the visible text counts: portals ship the "no longer available" wording inside scripts on every page.
    const low = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").toLowerCase();
    const hit = GONE_TEXT.find((p) => low.includes(p));
    if (hit) return { status, final_url: cur, verdict: "gone", note: "text: " + hit };
    const pr = priceFromHtml(html);
    return { status, final_url: cur, verdict: "ok", ...(pr || {}) };
  }
  return { status, final_url: cur, verdict: "error", note: "too many redirects" };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "realhunt" } });
  const body = await req.json().catch(() => ({}));
  const { data: sec } = await db.from("app_secrets").select("value").eq("key", "rh_check_secret").maybeSingle();
  if (!sec?.value || body.secret !== sec.value) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 40);
  const { data: due, error } = await db.rpc("rh_listing_check_due", { p_limit: limit });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  const rows = (due || []).filter((d: any) => d.source_url && !SKIP_DOMAINS.some((s) => String(d.source_url).includes(s)));
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += 5) {
    const part = await Promise.all(rows.slice(i, i + 5).map(async (d: any) => ({ deal_id: d.id, ...(await check(d.source_url)) })));
    out.push(...part);
  }
  if (out.length) {
    const { error: e2 } = await db.from("listing_probes").insert(out.map((r) => ({ deal_id: r.deal_id, http_status: r.status, final_url: r.final_url.slice(0, 500), verdict: r.verdict, price: r.price ?? null, currency: r.currency ?? null, note: r.note ?? null })));
    if (e2) return new Response(JSON.stringify({ error: e2.message }), { status: 500 });
  }
  const summary = out.reduce((a: any, r) => { a[r.verdict] = (a[r.verdict] || 0) + 1; return a; }, {});
  return new Response(JSON.stringify({ checked: out.length, ...summary }), { headers: { "Content-Type": "application/json" } });
});
