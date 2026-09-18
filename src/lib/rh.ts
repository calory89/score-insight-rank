import { supabase } from "@/integrations/supabase/client";

export const db = supabase as any;
export const MAX_PRICE = 100000;
export const HOME_MAX_PRICE = 60000;
export const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
export const FLAG: Record<string, string> = { Italy: "🇮🇹", Spain: "🇪🇸", Portugal: "🇵🇹", France: "🇫🇷", Greece: "🇬🇷", Croatia: "🇭🇷", Bulgaria: "🇧🇬", Romania: "🇷🇴", Japan: "🇯🇵", Sweden: "🇸🇪", Norway: "🇳🇴", Denmark: "🇩🇰", Finland: "🇫🇮", Germany: "🇩🇪", Turkey: "🇹🇷", Albania: "🇦🇱", Indonesia: "🇮🇩", Nordics: "❄️", Asia: "🌏", Other: "🌍" };
export const norm = (c: string | null | undefined) => { if (!c) return "Other"; if (c === "Scandinavia") return "Nordics"; if (c === "International" || c === "Europe") return "Other"; return c; };
export const slug = (c: string) => c.toLowerCase().replace(/[^a-z]+/g, "-");
export const unslug = (s: string, known: string[]) => known.find((k) => slug(k) === s) || s;
export const isNew = (d: string | null) => !!d && Date.now() - new Date(d).getTime() < 7 * 86400000;
export const cleanCap = (c: string | null) => (c || "").replace(/🏠?\s*Listing is up on Patreon[^.✨\n]*[.✨]?/gi, "").replace(/#\w+/g, "").replace(/\s+/g, " ").trim();

export type IG = { id: string; source_account: string; shortcode: string; caption: string | null; image_urls: string[] | null; posted_at: string | null; location_name: string | null; country_guess: string | null; price_eur: number | null; price_raw: string | null; likes: number | null; is_beach: boolean | null; price_in_image?: boolean; lat?: number | null; lng?: number | null; sqm?: number | null; bedrooms?: number | null; post_url?: string; caption_en?: string | null; hook?: string | null; rank_score?: number | null };

export const EBC: IG = { id: "ebc", source_account: "ecobeachcity", shortcode: "ecobeachcity", caption: "Beachfront cabin in a new eco village. 80-year lease that extends. Payable in instalments.", image_urls: ["/images/ebc/ebc-card-v2.webp"], posted_at: null, location_name: "Mamboro, Sumba", country_guess: "Indonesia", // €18,000 = the €11,500 cabin plus the €6,500 second-line plot. The cabin alone was misleading on a
// feed where every other card shows what you actually pay to own the thing.
  price_eur: 18000, price_raw: null, likes: null, is_beach: true, lat: -9.4, lng: 119.6,
  // The bottom line of a grid card renders `hook`. Every scraped find carries one that names the
  // price, so EBC needs one too — otherwise its card is the only one showing no price down there.
  hook: "Beachfront cabin plus land in Mamboro, Sumba, for €18,000" };
export const CALENDLY = "https://calendly.com/equinoxinvestmentgroup/eco-beach-city-info-call";

export const sid = () => { try { let s = localStorage.getItem("rh_sid"); if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("rh_sid", s); } return s; } catch { return "anon"; } };
// Events are queued and flushed as ONE multi-row insert instead of a request per event. A home page
// view used to fire about seven separate inserts, and with a few hundred people on the site at once
// those requests were a large part of what exhausted the connection pool and pushed first paint past
// 20 seconds. Nothing is lost: the queue is also flushed when the page is hidden or unloaded.
const QUEUE: any[] = [];
let flushTimer: any = null;

const flush = async () => {
  flushTimer = null;
  if (!QUEUE.length) return;
  const rows = QUEUE.splice(0, QUEUE.length);
  try {
    const { error } = await db.from("rh_events").insert(rows);
    if (error) console.warn("rh_events", error.message);
  } catch {}
};

if (typeof document !== "undefined") {
  // Best effort on the way out — never block the unload.
  const bail = () => { if (QUEUE.length) { clearTimeout(flushTimer); flushTimer = null; flush(); } };
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") bail(); });
  window.addEventListener("pagehide", bail);
}

export const track = async (event: string, extra: { find?: string; meta?: any } = {}) => {
  try {
    const { data } = await supabase.auth.getSession();
    let exp: any = null, tz: string | null = null, internal = false;
    try { exp = JSON.parse(sessionStorage.getItem("rh_exp_assign") || "null"); } catch {}
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch {}
    try { if (new URLSearchParams(location.search).get("rh_me") === "1") localStorage.setItem("rh_internal", "1"); internal = localStorage.getItem("rh_internal") === "1"; } catch {}
    const meta = { ...(extra.meta || {}), ...(exp ? { exp } : {}), ...(tz ? { tz } : {}), ...(internal ? { internal: true } : {}) };
    QUEUE.push({ sid: sid(), user_id: data.session?.user.id || null, event, path: location.pathname, find_shortcode: extra.find || null, meta });
    if (QUEUE.length >= 20) { clearTimeout(flushTimer); flushTimer = null; flush(); return; }
    if (!flushTimer) flushTimer = setTimeout(flush, 2500);
  } catch {}
};

export const srcSet = (u: string) => (u.endsWith(".webp") ? `${u.replace(/\.webp$/, "-s.webp")} 360w, ${u} 720w` : undefined);

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
  Denmark: { pct: 1, fixed: 1500, note: "Registration 0.6% plus about DKK 1,850. Non-residents need Ministry of Justice permission unless from the EU and moving in." },
  Finland: { pct: 3, fixed: 500, note: "Transfer tax 3% for real estate, 1.5% for housing company shares. No notary." },
  Germany: { pct: 10, fixed: 1500, note: "Transfer tax 3.5 to 6.5%, notary and registry about 2%, agent up to 3.57% if any." },
  Turkey: { pct: 5, fixed: 1000, note: "Title deed fee 4%, agent 2%, plus valuation and insurance. Some military zones are off limits to foreigners." },
  Albania: { pct: 3, fixed: 700, note: "Notary and registration about 2 to 3%. Foreigners can buy apartments, land needs a company." },
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
