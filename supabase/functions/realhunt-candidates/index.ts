// Admin tool to find new homes for RealHunt (called with the shared secret realhunt.app_secrets 'rh_check_secret').
//   {action:"scan", url}            -> listing links found on a portal search page
//   {action:"extract", url}         -> price, currency, size, bedrooms, place, coordinates, photos, description
//   {action:"import", deal:{...}}   -> copies up to 10 photos to Storage (bucket realhunt-finds) and inserts the
//                                      home as status 'pending': a person approves it in the admin before it shows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BLOCKED = /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|metadata\.|.*\.internal|.*\.local)$|^\d+$/i;
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const safe = (raw: string) => { try { const u = new URL(raw); if (u.protocol !== "https:" || BLOCKED.test(u.hostname)) return null; return u; } catch { return null; } };
const dec = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ");

async function get(url: string, accept = "text/html"): Promise<Response | null> {
  let cur = url;
  for (let i = 0; i < 5; i++) {
    const u = safe(cur); if (!u) return null;
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    try {
      const r = await fetch(u, { redirect: "manual", signal: c.signal, headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "en,es;q=0.8" } });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { cur = new URL(r.headers.get("location")!, u).toString(); continue; }
      return r;
    } catch { return null; } finally { clearTimeout(t); }
  }
  return null;
}

function jsonLd(html: string): any[] {
  const out: any[] = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const v = JSON.parse(m[1].trim()); const walk = (x: any) => { if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") { out.push(x); if (x["@graph"]) walk(x["@graph"]); } }; walk(v); } catch { /* ignore */ }
  }
  return out;
}
const meta = (html: string, p: string) => (html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)`, "i"))?.[1]
  || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`, "i"))?.[1] || null);
const num = (v: any) => { if (v == null) return null; const s = String(typeof v === "object" ? (v.value ?? v.amount ?? "") : v).replace(/\s/g, ""); const n = Number(s.replace(/[^\d.,]/g, "").replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : null; };

function extract(html: string, url: string) {
  const ld = jsonLd(html);
  const find = (k: string) => { for (const x of ld) { if (x[k] != null) return x[k]; for (const v of Object.values(x)) if (v && typeof v === "object" && (v as any)[k] != null) return (v as any)[k]; } return null; };
  const offers = find("offers"); const off = Array.isArray(offers) ? offers[0] : offers;
  const imgs = new Set<string>();
  const addImg = (s: any) => { if (!s) return; if (Array.isArray(s)) return s.forEach(addImg); const v = typeof s === "object" ? (s.url || s.contentUrl) : s; if (typeof v === "string" && /^https:\/\//.test(v)) imgs.add(dec(v)); };
  for (const x of ld) addImg(x.image || x.photo);
  addImg(meta(html, "og:image"));
  for (const m of html.matchAll(/https:\/\/[^"'\s<>()]+?\.(?:jpe?g|webp|png)(?:\?[^"'\s<>()]*)?/gi)) {
    const u = dec(m[0]); if (/logo|icon|sprite|avatar|flag|placeholder|banner|thumb_?s|\/s\d{2,3}x/i.test(u)) continue; imgs.add(u);
  }
  const geo = find("geo");
  const addr = find("address");
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const sqm = num(find("floorSize")) || num(text.match(/(\d{2,4}(?:[.,]\d+)?)\s?(?:m²|m2|sqm|sq\.? ?m)\b/i)?.[1]);
  const beds = num(find("numberOfBedrooms") ?? find("numberOfRooms")) || num(text.match(/(\d{1,2})\s?(?:bed(?:room)?s?|dormitorios?|camere|chambres?|quartos?|υπνοδωμάτια)/i)?.[1]);
  return {
    source_url: url,
    title: dec(find("name") || meta(html, "og:title") || html.match(/<title[^>]*>([^<]+)/i)?.[1] || "").trim().slice(0, 200),
    price: num(off?.price ?? find("price")) || num(meta(html, "product:price:amount")),
    currency: off?.priceCurrency || find("priceCurrency") || meta(html, "product:price:currency") || null,
    sqm: sqm ? Math.round(sqm) : null, bedrooms: beds ? Math.round(beds) : null,
    locality: typeof addr === "object" && addr ? [addr.addressLocality, addr.addressRegion, addr.addressCountry?.name || addr.addressCountry].filter(Boolean).join(", ") : (typeof addr === "string" ? addr : null),
    lat: num(geo?.latitude), lng: num(geo?.longitude),
    description: dec(find("description") || meta(html, "og:description") || "").slice(0, 3000),
    images: [...imgs].slice(0, 40),
    text_sample: text.slice(0, 6000),
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "realhunt" } });
  const body = await req.json().catch(() => ({}));
  const { data: sec } = await db.from("app_secrets").select("value").eq("key", "rh_check_secret").maybeSingle();
  if (!sec?.value || body.secret !== sec.value) return json({ error: "Forbidden" }, 403);

  if (body.action === "scan" || body.action === "extract") {
    const r = await get(String(body.url || ""));
    if (!r) return json({ error: "fetch failed" }, 502);
    const html = (await r.text()).slice(0, 3_000_000);
    if (r.status !== 200) return json({ error: "HTTP " + r.status, sample: html.slice(0, 300) }, 502);
    if (body.action === "extract") return json(extract(html, String(body.url)));
    const base = new URL(String(body.url));
    if (body.rx) { const set = new Set<string>(); for (const m of html.matchAll(new RegExp(String(body.rx), "gi"))) set.add(dec(m[1] ?? m[0])); return json({ matches: [...set].slice(0, 400), length: html.length }); }
    const re = body.pattern ? new RegExp(String(body.pattern), "i") : /./;
    const links = new Set<string>();
    for (const m of html.matchAll(/href=["']([^"'#]+)["']/gi)) { try { const u = new URL(dec(m[1]), base).toString(); if (re.test(u)) links.add(u); } catch { /* skip */ } }
    return json({ links: [...links].slice(0, 300), length: html.length });
  }

  if (body.action === "import") {
    const d = body.deal || {};
    if (!/^[a-z0-9-]{6,80}$/.test(String(d.slug || ""))) return json({ error: "bad slug" }, 400);
    const key = String(d.source_url).replace(/^https?:\/\/(www\.)?/, "").split("#")[0].replace(/\/+$/, "").toLowerCase();
    const { data: dupe } = await db.from("community_deals").select("slug,status").or(`source_key.eq.${key},slug.eq.${d.slug}`).maybeSingle();
    if (dupe) return json({ duplicate: dupe });
    const store = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!).storage.from("realhunt-finds");
    const urls: string[] = [];
    for (const [i, src] of (d.images || []).slice(0, 10).entries()) {
      const r = await get(String(src), "image/avif,image/webp,image/*");
      const ct = r?.headers.get("content-type") || "";
      if (!r || r.status !== 200 || !ct.startsWith("image/")) continue;
      const buf = new Uint8Array(await r.arrayBuffer());
      if (buf.length < 15000 || buf.length > 8_000_000) continue; // tiny = icon or thumbnail
      const ext = ct.includes("webp") ? "webp" : ct.includes("png") ? "png" : "jpg";
      const path = `${d.slug}-${urls.length}.${ext}`;
      const { error } = await store.upload(path, buf, { contentType: ct, upsert: true, cacheControl: "31536000" });
      if (!error) urls.push(store.getPublicUrl(path).data.publicUrl);
    }
    if (urls.length < 4) return json({ error: "fewer than 4 usable photos", got: urls.length }, 422);
    const row = {
      slug: d.slug, title: d.title, source_url: d.source_url, source_key: key, source_domain: new URL(d.source_url).hostname.replace(/^www\./, ""),
      image_urls: urls, price_eur: d.price_eur, currency: "EUR", country: d.country, location_name: d.location_name, sqm: d.sqm ?? null,
      bedrooms: d.bedrooms ?? null, category: d.category, why_great: d.why_great, hunter_handle: d.hunter_handle || new URL(d.source_url).hostname.replace(/^www\./, "").split(".")[0],
      status: "pending", lat: d.lat ?? null, lng: d.lng ?? null, seed_votes: 0,
    };
    const { data, error } = await db.from("community_deals").insert(row).select("id,slug,status").single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, deal: data, photos: urls.length });
  }
  return json({ error: "unknown action" }, 400);
});
