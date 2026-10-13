import { supabase } from "@/integrations/supabase/client";

export const db = supabase as any;
export const MAX_PRICE = 100000;
export const HOME_MAX_PRICE = 100000;
export const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
export const FLAG: Record<string, string> = { Italy: "🇮🇹", Spain: "🇪🇸", Portugal: "🇵🇹", France: "🇫🇷", Greece: "🇬🇷", Croatia: "🇭🇷", Bulgaria: "🇧🇬", Romania: "🇷🇴", Japan: "🇯🇵", Sweden: "🇸🇪", Norway: "🇳🇴", Denmark: "🇩🇰", Finland: "🇫🇮", Germany: "🇩🇪", Turkey: "🇹🇷", Albania: "🇦🇱", Indonesia: "🇮🇩", "United States": "🇺🇸", Canada: "🇨🇦", Mexico: "🇲🇽", Scandinavia: "❄️", Nordics: "❄️", Asia: "🌏", Other: "🌍", "Georgia": "🇬🇪", "Vietnam": "🇻🇳", "Montenegro": "🇲🇪", "Cyprus": "🇨🇾", "Northern Cyprus": "🇨🇾", "United Kingdom": "🇬🇧", Netherlands: "🇳🇱", Poland: "🇵🇱", "Dominican Republic": "🇩🇴", Switzerland: "🇨🇭", Australia: "🇦🇺" };
export const norm = (c: string | null | undefined) => { if (!c) return "Other"; if (c === "Scandinavia") return "Nordics"; if (c === "International" || c === "Europe") return "Other"; return c; };
export const slug = (c: string) => c.toLowerCase().replace(/[^a-z]+/g, "-");
export const unslug = (s: string, known: string[]) => known.find((k) => slug(k) === s) || s;
export const isNew = (d: string | null) => !!d && Date.now() - new Date(d).getTime() < 7 * 86400000;
export const cleanCap = (c: string | null) => (c || "").replace(/🏠?\s*Listing is up on Patreon[^.✨\n]*[.✨]?/gi, "").replace(/#\w+/g, "").replace(/\s+/g, " ").trim();

export type IG = { id: string; source_account: string; shortcode: string; caption: string | null; image_urls: string[] | null; posted_at: string | null; location_name: string | null; country_guess: string | null; price_eur: number | null; price_raw: string | null; likes: number | null; is_beach: boolean | null; price_in_image?: boolean; lat?: number | null; lng?: number | null; sqm?: number | null; bedrooms?: number | null; post_url?: string; caption_en?: string | null; hook?: string | null; rank_score?: number | null };

export const EBC: IG = { id: "ebc", source_account: "ecobeachcity", shortcode: "ecobeachcity", caption: "Beachfront cabin in a new eco village. 80-year lease that extends. Payable in instalments.", image_urls: ["/images/ebc/ebc-card-v2.webp", "/images/ebc/ebc-cabin-ext.webp", "/images/ebc/ebc-cabin-int.webp"], posted_at: null, location_name: "Mamboro, Sumba", country_guess: "Indonesia", // €18,000 = the €11,500 cabin plus the €6,500 second-line plot. The cabin alone was misleading on a
// feed where every other card shows what you actually pay to own the thing.
  price_eur: 18000, price_raw: null, likes: null, is_beach: true, lat: -9.4, lng: 119.6,
  // The bottom line of a grid card renders `hook`. Every scraped find carries one that names the
  // price, so EBC needs one too — otherwise its card is the only one showing no price down there.
  hook: "Beachfront cabin plus land in Mamboro, Sumba, for €18,000" };
export const CALENDLY = "https://calendly.com/equinoxinvestmentgroup/eco-beach-city-info-call";

export const sid = () => { try { let s = localStorage.getItem("rh_sid"); if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("rh_sid", s); } return s; } catch { return "anon"; } };
// Optional analytics never shares the legacy hot table or blocks an application action.
const QUEUE: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sending = false;
let pausedUntil = 0;
const permitted = () => { try { return localStorage.getItem("rh_consent") === "all"; } catch { return false; } };
const flush = async () => {
  if (flushTimer) clearTimeout(flushTimer); flushTimer = null;
  if (sending) return;
  if (!permitted() || Date.now() < pausedUntil) { QUEUE.length = 0; return; }
  const rows = QUEUE.splice(0, 20); if (!rows.length) return;
  sending = true;
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const { error } = await db.rpc("record_telemetry", { p_rows: rows }).abortSignal(controller.signal);
    if (error) throw error;
  } catch { pausedUntil = Date.now() + 120000; QUEUE.length = 0; }
  finally { clearTimeout(timer); sending = false; if (QUEUE.length) flushTimer = setTimeout(flush, 5000); }
};
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") queueMicrotask(() => { void flush(); }); });
  window.addEventListener("pagehide", () => { queueMicrotask(() => { void flush(); }); });
}
export const track = async (event: string, extra: { find?: string; meta?: any; path?: string } = {}) => {
  if (!permitted() || Date.now() < pausedUntil || QUEUE.length >= 100) return;
  try {
    let exp: any = null; try { exp = JSON.parse(sessionStorage.getItem("rh_exp_assign") || "null"); } catch {}
    let internal = false; try { if (new URLSearchParams(location.search).get("rh_me") === "1") localStorage.setItem("rh_internal", "1"); internal = localStorage.getItem("rh_internal") === "1"; } catch {}
    const meta: Record<string, unknown> = { internal, tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
    // Never send free-form URLs, search strings, contact details or error messages.
    for (const key of ["source","ok","n","price","shared","status","mode","tab","exp_key","exp_v","name","value","rating","device","metric_id"]) {
      const value = extra.meta?.[key];
      if (typeof value === "number" || typeof value === "boolean") meta[key] = value;
      else if (typeof value === "string" && /^[a-zA-Z0-9_ .-]{0,80}$/.test(value)) meta[key] = value;
    }
    if (exp && typeof exp === "object") meta.exp = Object.fromEntries(Object.entries(exp).filter(([k,v]) => /^[a-z_]{1,60}$/.test(k) && typeof v === "string" && /^[a-zA-Z0-9_-]{1,30}$/.test(v as string)));
    QUEUE.push({ event_id: crypto.randomUUID(), sid: sid(), event, path: extra.path || location.pathname, find_shortcode: extra.find || null, meta });
    if (document.visibilityState === "hidden") queueMicrotask(() => { void flush(); });
    else if (!flushTimer) flushTimer = setTimeout(flush, 5000);
  } catch {}
};

// Only advertise responsive variants that are real, versioned assets. Previously every
// .webp URL was rewritten to "-s.webp". Most imported listing photos do not have that
// companion file, so mobile browsers selected a URL that did not exist and displayed a
// broken-image question mark even though the original photo was available.
const RESPONSIVE_ASSETS = new Set([
  "/images/ebc/ebc-card-v2.webp",
  "/finds/acquappesa-bathroom.webp",
  "/finds/acquappesa-bedroom.webp",
  "/finds/acquappesa-living.webp",
  "/finds/acquappesa-sea-view-39000.webp",
  "/finds/acquappesa-terrace.webp",
]);
export const srcSet = (u: string) => (RESPONSIVE_ASSETS.has(u) ? `${u.replace(/\.webp$/, "-s.webp")} 360w, ${u} 720w` : undefined);

// score = recency + engagement, used for default sort
export const score = (f: IG) => { if (f.rank_score != null) return f.rank_score * 10; const age = f.posted_at ? (Date.now() - new Date(f.posted_at).getTime()) / 86400000 : 60; const likes = Math.log10((f.likes || 0) + 10); return likes * 2 - age / 10; };

// Estimated purchase costs on top of the price, by country (transfer tax, notary, registry, agent when the buyer pays). Rough, for orientation only.
export const COSTS: Record<string, { pct: number; fixed: number; note: string }> = {
  Italy: { pct: 10, fixed: 2500, note: "9% registration tax on cadastral value for a second home (2% as main residence), notary and registry about €2,500, agent 3% plus VAT if there is one." },
  Spain: { pct: 9, fixed: 1500, note: "Transfer tax 6 to 10% depending on the region, notary and registry about €1,500, agent usually paid by the seller. Add a lawyer, about €1,500." },
  Portugal: { pct: 7, fixed: 1200, note: "IMT 0 to 8% on a sliding scale, stamp duty 0.8%, notary and registry about €1,200. Non-resident needs a NIF." },
  France: { pct: 8, fixed: 0, note: "Notaire fees and taxes 7 to 8% on older homes. No separate agent fee if the listing says FAI." },
  Greece: { pct: 5, fixed: 1500, note: "Transfer tax 3%, notary about 1.5%, lawyer about 1.5%, registry 0.5%. Add a tax number (AFM)." },
  Croatia: { pct: 4, fixed: 1000, note: "Transfer tax 3%, notary and court about €1,000. Non-EU buyers need ministry approval." },
  Bulgaria: { pct: 4, fixed: 800, note: "Local transfer tax 2 to 3%, notary about 1%. Foreigners cannot own land directly, apartments are fine." },
  Romania: { pct: 3, fixed: 800, note: "Notary about 1 to 2%, registration 0.15%. EU citizens can buy land, others need a company." },
  Japan: { pct: 8, fixed: 1500, note: "Acquisition tax 3 to 4%, registration about 2%, agent 3% plus ¥60,000, stamp duty. Foreigners can own freehold." },
  Sweden: { pct: 2, fixed: 800, note: "Stamp duty 1.5% plus mortgage registration if any. No notary. Anyone can buy." },
  Norway: { pct: 3, fixed: 500, note: "Document fee 2.5%. No notary. Anyone can buy." },
  "United Kingdom": { pct: 1, fixed: 1800, note: "Anyone can buy. Stamp duty is 0% on a first and only home at these prices; a second home pays a surcharge (5% in England, 8% in Scotland) and non-UK residents pay 2% more in England. Solicitor about £1,000 to £1,500." },
  Denmark: { pct: 1, fixed: 1500, note: "Registration 0.6% plus about DKK 1,850. Non-residents need Ministry of Justice permission unless from the EU and moving in." },
  Finland: { pct: 3, fixed: 500, note: "Transfer tax 3% for real estate, 1.5% for housing company shares. No notary." },
  Germany: { pct: 10, fixed: 1500, note: "Transfer tax 3.5 to 6.5%, notary and registry about 2%, agent up to 3.57% if any." },
  Turkey: { pct: 5, fixed: 1000, note: "Title deed fee 4%, agent 2%, plus valuation and insurance. Some military zones are off limits to foreigners." },
  Albania: { pct: 3, fixed: 700, note: "Notary and registration about 2 to 3%. Foreigners can buy apartments, land needs a company." },
  "United States": { pct: 3, fixed: 1000, note: "Buyer closing costs are usually 2 to 5%: title insurance, escrow and recording fees. Anyone can buy, no residency or visa needed. Property tax is yearly and set by the county; the listing usually shows it." },
  Canada: { pct: 1.5, fixed: 1500, note: "Land transfer tax 0 to 2% depending on the province, plus a lawyer, about C$1,500. Until 1 January 2027 most non-Canadians cannot buy homes in Canadian cities (foreign buyer ban); Canadians and permanent residents can." },
  Mexico: { pct: 6, fixed: 1000, note: "Acquisition tax (ISAI) 2 to 5% plus notary fees, about 6 to 8% in total. Foreigners can buy; within 50 km of the coast it is done through a bank trust (fideicomiso), about US$500 to 1,000 a year." },
  Australia: { pct: 4, fixed: 1500, note: "Stamp duty about 2 to 4% at this price, plus conveyancing, about A$1,500. Until 30 June 2029 foreign non-residents cannot buy existing homes in Australia; Australian citizens, permanent residents and New Zealanders can." },
  Netherlands: { pct: 3, fixed: 2500, note: "Transfer tax 2% on a home you will live in (0% once for buyers aged 18 to 34 below €555,000), notary and land registry about €1,500 to €2,500, plus valuation and mortgage advice if you borrow. In Amsterdam many flats stand on city leasehold (erfpacht): check whether the ground rent is bought off." },
  Poland: { pct: 3, fixed: 700, note: "Civil-law transaction tax (PCC) 2% on a resale flat, notary about 0.5 to 1% plus court registry fees. Agents often charge the buyer 2 to 3% plus VAT; some listings say no commission. EU citizens can buy flats freely; others can buy a flat without a permit but need one for a house with land." },
  Cyprus: { pct: 5, fixed: 1500, note: "Transfer fees 3 to 8% on resale (none if VAT was paid on a new build, then 5 to 19% VAT), stamp duty about 0.2%, lawyer about 1%. Non-EU buyers need Council of Ministers permission, usually a formality." },
  "Dominican Republic": { pct: 4, fixed: 1500, note: "Transfer tax 3% on the assessed value, notary and title fees about 1%, lawyer about 1%. Foreigners can buy freehold with the same rights as locals. Yearly IPI tax 1% only above about RD$10 million." },
  Switzerland: { pct: 4, fixed: 2000, note: "Transfer tax 0 to 3.3% depending on the canton, notary and land registry about 0.5 to 1%. Non-residents from outside the EU/EFTA need a permit (Lex Koller) and holiday homes are capped by quota." },
  Indonesia: { pct: 0, fixed: 0, note: "Leasehold in an eco village. Land and connections are itemised on the page." },
};
export const totalCost = (price: number, country: string | null | undefined) => { const c = COSTS[country || ""]; return c ? Math.round(price * (1 + c.pct / 100) + c.fixed) : null; };
export const COMPANY = { name: "Equinox Investment Group LLC", address: "30 N Gould St Ste N, Sheridan, WY 82801, United States", email: "hello@realhunt.co" };
export const consent = () => { try { return localStorage.getItem("rh_consent"); } catch { return null; } };

// Shared "join the list" write, used by every email-capture surface (bottom bar, 30s popup, grid card,
// home page cards, the gated card). Collection only for now: no automatic welcome email is sent on
// insert (disabled 18-sep-2026); the top 10 goes out manually until the real send flow is ready.
//
// This MUST be a plain insert, never an upsert. PostgREST implements upsert as INSERT ... ON CONFLICT,
// which it will only run if the caller also passes the table's UPDATE policy — and newsletter_subscribers
// only grants UPDATE to admins. So every anonymous upsert came back 401 / 42501 "new row violates
// row-level security policy", the error was swallowed, and the visitor was shown "Received" while the
// address was dropped on the floor. 83 people subscribed that way and only 4 were saved. A duplicate
// address (23505) is a success: they are already on the list.
//
// Failures are no longer hidden either. The caller gets ok:false so it can ask the visitor to try
// again, instead of promising an email we cannot send.
export const subscribeEmail = async (email: string, source: string, userId?: string | null) => {
  let tz: string | null = null; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
  let exp: any = null; try { exp = JSON.parse(sessionStorage.getItem("rh_exp_assign") || "null"); } catch {}
  const clean = email.trim().toLowerCase();
  const row = { email: clean, source, path: typeof location !== "undefined" ? location.pathname : null, sid: sid(), tz, user_id: userId || null, meta: { ref: typeof document !== "undefined" ? document.referrer || null : null, ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 160) : null, exp, w: typeof window !== "undefined" ? window.innerWidth : null } };

  const save = async () => { try { return (await db.from("newsletter_subscribers").insert(row)).error; } catch (e: any) { return e || new Error("network"); } };
  let error = await save();
  if (error && error.code !== "23505") { await new Promise((r) => setTimeout(r, 900)); error = await save(); }

  const ok = !error || error.code === "23505";
  if (!ok) console.warn("newsletter insert failed", error?.message || error);
  if (ok) { try { localStorage.setItem("rh_sub", "1"); localStorage.setItem("rh_last_email", clean); } catch {} }
  track("newsletter", { meta: { source, ok } });
  return { ok };
};

export const lastEmail = () => { try { return localStorage.getItem("rh_last_email") || ""; } catch { return ""; } };

// Interactions (vote, save, share, opening a home, swiping). Pop-ups wait until a visitor has done
// at least two of these, so nobody gets an email box before they have seen a single home.
export const ixCount = () => { try { return Number(sessionStorage.getItem("rh_ix") || 0); } catch { return 0; } };
export const bumpIx = () => { try { sessionStorage.setItem("rh_ix", String(ixCount() + 1)); } catch {} try { window.dispatchEvent(new Event("rh-ix")); } catch {} };
