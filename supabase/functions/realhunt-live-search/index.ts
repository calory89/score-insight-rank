// realhunt-live-search (v2, 8-nov-2026): searches the web for homes to buy or rent while the person waits, checks
// every find with Claude vision and turns the good ones into real RealHunt homes.
//   POST {q, lang}  -> {job_id, parsed}   (or {status:"rejected"|"need_login"|"capped", ...})
//   GET  ?job=<id>  -> {status, progress 0-100, stage, results[] (only the ones that passed), hidden, note, parsed}
//   POST {action:"work", job, secret}      internal: continues a long job in a fresh invocation (see slice)
//   POST {action:"regate", slugs?, secret}  internal: runs the v2 check on homes earlier live searches imported
//   POST {action:"translate", limit?}       fills title_es / why_great_es / why_cheap_es of approved homes that have none
//                                           (idempotent: only untranslated homes, at most 12 a call, so its cost is bounded
//                                           by the homes published; scripts/build_static.py calls it daily)
// Order of work, cheapest first:
//   1. our own data: approved RealHunt homes (score >= 80) and finds earlier live searches published (last 30 days,
//      passed the gate). With 6 or more good matches it answers from them and spends nothing.
//   2. Coldwell Banker (free, readable) for US cities; pisos.com (free, readable, v3) for Spain (pisos.ts).
//   3. Claude with web search + web fetch (ANTHROPIC_API_KEY; model ANTHROPIC_MODEL, default claude-sonnet-5-5), when
//      the free source found fewer than 6 listings (most US portals block robots, so their pages cannot be checked).
//   4. every candidate: read the page, a first score, then (only if it could still reach 80) the AI check:
//      Claude vision (REVIEW_MODEL, cheap) on up to 6 photos plus the listing text returns photo quality, the best
//      photo order, flags (mobile home, land lease, 55+...), a polished title, why it is great and why it is cheap.
//      Shown only if score >= 80, photos >= 7/10, 4+ good photos and no blocking flag (core.ts gateDecision).
//   5. homes to buy that pass are imported through realhunt-candidates "import" (photos copied in the best order)
//      and published at once with ai_checked = true ("Checked by AI, not yet by a person"); a person can still
//      approve (clears the label) or reject them in /hunt/admin. Rentals that pass link to the portal.
// A job may take several minutes: each invocation works for about a minute and a half, saves its state in
// live_jobs.work and calls the function again ("work"); a poll re-starts a job whose invocation died.
// Every search is saved in realhunt.live_jobs (with its cost: search + AI checks) and every listing in
// realhunt.live_listings with its review, also the ones not shown. Spending caps: LIMITS below and core.ts CAPS/dayBudget.
// v3 (8-nov-2026): typo-tolerant parser, "en el centro" as a preference, places in several countries resolved from
// the visitor's time zone or asked first (POST answers {status:"ask", options}; the choice comes back as `where`),
// admins (realhunt.is_admin) with their own budget, per IP and per network daily caps, `closest` misses in the poll.
// v4 (8-nov-2026, Carlos: "I said in the centre of Seville and they show me the outskirts"): the centre is real
// geography (centre.ts). The city-centre point comes from a built-in table or, for other cities, from Nominatim once
// (kept in the job's work, reused by later jobs for the same place). Every listing gets distance_to_centre_km and a
// short fact ("1.2 km from the centre"); a "centre" search shows only central homes in `results`, the closest others
// in `outside_centre` (never mixed), and says honestly in the note when nothing central passed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as C from "./core.ts";
import * as PS from "./pisos.ts";
import * as CT from "./centre.ts";

export const LIMITS = {
  ANON_FREE_SEARCHES: 1, // searches without an account, per IP hash
  NET_ANON_PER_DAY: 60, // anonymous jobs per network address per UTC day (see whoIs)
  IP_JOBS_PER_DAY: 8, // new jobs per IP hash per UTC day (signed in or not)
  GLOBAL_JOBS_PER_DAY: 300,
  // Claude spend (search + AI checks) per UTC day: core.ts CAPS (v3, 8-nov-2026: US$2 a person, US$2 an IP address
  // summed over all its accounts and anonymous use, US$6 a network address, US$30 everyone; admins US$15 each, US$30 together)
  ADMIN_JOBS_PER_DAY: 80,
  EST_CLAUDE_JOB_USD: 0.5, // what the web search part of one job may cost, checked against the caps before calling
  EST_REVIEW_USD: 0.03, // what one AI check may cost; each check runs only while the job's budget still covers it
  MAX_REVIEWS: 18, // AI checks per job (about US$0.01 each with Haiku, 8-nov-2026)
  REUSE_ENOUGH: 6, // good matches we must already have to skip the web
  REUSE_DAYS: 30,
  CACHE_HOURS: 24,
  SLICE_START_MS: 45_000, // an invocation starts new listings only during its first 45 s, then hands over
  JOB_MAX_MS: 10 * 60_000, // a job stops after 10 minutes and finishes with what it has
  KICK_MS: 90_000, // a running job not updated for this long is re-started by the next poll
  STALE_MS: 300_000, // ... and after this long it is marked as failed
  MAX_CANDS: 22,
};
const REVIEW_MODEL = "claude-haiku-4-5";
const MODELS = [Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5", "claude-sonnet-5-5", "claude-haiku-4-5"].filter((m, i, a) => a.indexOf(m) === i);
const SUPA = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPA, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "realhunt" }, auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const dayStart = () => new Date().toISOString().slice(0, 10) + "T00:00:00Z";
// deno-lint-ignore no-explicit-any
const background = (p: Promise<unknown>) => ((globalThis as any).EdgeRuntime?.waitUntil ? (globalThis as any).EdgeRuntime.waitUntil(p) : p);

let secretP: PromiseLike<string> | null = null;
const secret = () => (secretP ||= db.from("app_secrets").select("value").eq("key", "rh_check_secret").maybeSingle().then(({ data }) => String(data?.value || "")));
async function sha(s: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

async function cand(body: Record<string, unknown>, timeout = 60000): Promise<any> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(`${SUPA}/functions/v1/realhunt-candidates`, { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` }, body: JSON.stringify({ ...body, secret: await secret() }) });
    return await r.json().catch(() => ({ error: "bad json" }));
  } catch (e) { return { error: String(e) }; } finally { clearTimeout(t); }
}
/** Hands a job over to a fresh invocation of this function (each one has its own time limit). */
async function chain(id: string): Promise<string> {
  try {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 15000);
    const r = await fetch(`${SUPA}/functions/v1/realhunt-live-search`, { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` }, body: JSON.stringify({ action: "work", job: id, secret: await secret() }) });
    const body = (await r.text()).slice(0, 80);
    clearTimeout(t);
    return r.status + " " + body;
  } catch (e) { console.error("chain", id, e); return "err " + String(e).slice(0, 80); }
}

// ---------------------------------------------------------------- RealHunt's approved homes (the site's own snapshot)
type Snap = { rows: any[]; at: number };
let snap: Snap | null = null;
async function approved(): Promise<any[]> {
  if (snap && Date.now() - snap.at < 30 * 60_000) return snap.rows;
  try { const r = await fetch("https://realhunt.co/data/rh-static.json"); const d = await r.json(); snap = { rows: Array.isArray(d.rows) ? d.rows : [], at: Date.now() }; } catch { snap = snap || { rows: [], at: Date.now() }; }
  return snap.rows;
}
const abs = (u: string) => (u?.startsWith("/") ? "https://realhunt.co" + u : u);
const ppm = (price_eur: number | null, sqm: number | null) => (price_eur && sqm && sqm >= 15 ? price_eur / sqm : 0);

// ---------------------------------------------------------------- results
type Result = {
  id: string; source: "realhunt" | "earlier" | "web"; provider: string; url: string; deal_slug: string | null; deal_id?: string | null; title: string; price: number | null; currency: string;
  price_eur: number | null; beds: number | null; sqm: number | null; location: string; country: string | null; kind: "buy" | "rent"; image: string | null; image_urls?: string[]; photos: number | null;
  score: number; parts?: Record<string, unknown>; found_at: string;
  // v2: the AI check
  show: boolean; reasons?: string[]; photo_quality?: number | null; flags?: string[]; why_cheap?: string | null; why_great?: string | null; ai_checked_at?: string | null;
  // 8-nov-2026: Spanish versions, so the Spanish page never shows a card in English
  title_es?: string | null; why_great_es?: string | null; why_cheap_es?: string | null;
  hoa_monthly?: number | null; hoa_currency?: string | null; tax_annual?: number | null; hoa_unknown?: boolean;
  /** v3: in the city centre (pisos.com district), when the person asked for the centre */
  central?: boolean | null;
  /** v4: km from the city-centre point (null without a map position), how that was decided, the card's fact */
  distance_to_centre_km?: number | null; centre_status?: CT.CentreFit["status"] | null; centre_fact?: string | null; centre_fact_es?: string | null;
  /** v4: for a "centre" search, whether it belongs in the main results (false: only in outside_centre) */
  centre_ok?: boolean | null; lat?: number | null; lng?: number | null;
};
type Cand = { url: string; title: string; price: number | null; currency: string; beds: number | null; sqm: number | null; location: string; country: string | null; kind: "buy" | "rent"; image: string | null; provider: string; cb?: C.CbRow; ps?: PS.PisosRow; lat?: number | null; lng?: number | null };
type Who = { user: string | null; ipHash: string; netHash: string; ipSrc: string; admin?: boolean };
type Work = { p: C.LiveQuery; q: string; lang: string; who: Who; t0: number; cands: Cand[]; i: number; median: number | null; median_from: string | null; country_medians: Record<string, number | null>; scan_medians?: Record<string, number | null>; budget: number; reviews: number; units: number; slices: number; note: string; provider: string; search_cost: number; done?: boolean; centre?: CT.Centre | null; outside_reviews?: number; centre_medians?: Record<string, CT.CentreMedian> | null };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (req.method === "GET") return await poll(new URL(req.url).searchParams.get("job") || "");
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.action === "translate") return json(await translateMissing(Math.min(Math.max(Number(body.limit) || 12, 1), 12)));
      if (body.action === "work" || body.action === "regate" || body.action === "selftest" || body.action === "translate_strings") {
        if (!body.secret || body.secret !== (await secret())) return json({ error: "Forbidden" }, 403);
        if (body.action === "translate_strings") return json(await translateStrings(Array.isArray(body.items) ? body.items.slice(0, 40) : [], String(body.context || "").slice(0, 500)));
        if (body.action === "selftest") return json({ chain: await chain("00000000-0000-0000-0000-000000000000") }); // can this function call itself?
        if (body.action === "work") { background(slice(String(body.job || "")).catch((e) => console.error("slice", e))); return json({ ok: true }); }
        return json(await regate(Array.isArray(body.slugs) ? body.slugs.map(String) : null, body.apply === true));
      }
      return await start(req, body);
    }
    return json({ error: "GET or POST" }, 405);
  } catch (e) {
    console.error("live-search", e);
    return json({ status: "error", note: "server" }, 500);
  }
});

/** The centre fields of a result (v4). `central`: the person asked for the centre, so centre_ok decides the list. */
function centreCols(f: CT.CentreFit | null, central: boolean) {
  const fact = CT.centreFact(f);
  return { distance_to_centre_km: f?.km ?? null, centre_status: f?.status ?? null, centre_fact: fact?.en ?? null, centre_fact_es: fact?.es ?? null, centre_ok: central ? CT.inCentre(f) : null };
}

/**
 * The centre of a city not in centre.ts's table, from OpenStreetMap's Nominatim (free; one request, with a proper
 * User-Agent as its policy asks). A city is looked up once: the answer is kept in the job's work and later jobs for
 * the same place reuse it. Null when it cannot be found: the search then cannot enforce the centre and says nothing false.
 */
async function geocode(p: C.LiveQuery): Promise<CT.Centre | null> {
  const name = p.place || p.city;
  if (!name || !p.country) return null;
  try {
    const { data } = await db.from("live_jobs").select("c:work->centre").eq("parsed->>place", p.place).eq("parsed->>country", p.country).not("work->centre", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const c: any = (data as any)?.c;
    if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) return c as CT.Centre;
  } catch { /* look it up */ }
  const q = [name, p.state ? C.US_STATES[p.state] : "", p.country].filter(Boolean).join(", ");
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`, { signal: ctl.signal, headers: { "User-Agent": "RealHunt/1.0 (https://realhunt.co)", "Accept-Language": "en" } });
    if (!r.ok) return null;
    const arr = await r.json().catch(() => []);
    return CT.centreFromGeocode(name, p.country, Array.isArray(arr) ? arr[0] : null);
  } catch { return null; } finally { clearTimeout(t); }
}

async function poll(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad job" }, 400);
  const { data: j } = await db.from("live_jobs").select("id,status,progress,stage,results,note,parsed,updated_at,provider,work").eq("id", id).maybeSingle();
  if (!j) return json({ error: "not found" }, 404);
  const idle = Date.now() - Date.parse(j.updated_at);
  if ((j.status === "running" || j.status === "queued") && idle > LIMITS.STALE_MS) {
    await db.from("live_jobs").update({ status: "error", note: "timeout", updated_at: new Date().toISOString() }).eq("id", id);
    j.status = "error"; j.note = "timeout";
  } else if (j.status === "running" && idle > LIMITS.KICK_MS && j.work && j.work.i < (j.work.cands || []).length) {
    // the invocation working on it died (time limit): start a new one where it stopped
    await db.from("live_jobs").update({ updated_at: new Date().toISOString() }).eq("id", id);
    background(chain(id));
  }
  const all: Result[] = Array.isArray(j.results) ? j.results : [];
  // v4: a "centre" search shows only central homes; the closest others come apart in outside_centre
  const centre: CT.Centre | null = j.work?.centre || null;
  const wantsCentre = !!(j.parsed?.central && centre);
  const shownAll = all.filter(isShown);
  const shown = wantsCentre ? shownAll.filter((r) => r.centre_ok !== false) : shownAll;
  // the closest others only: within 3 x the centre's radius (a home 8 km out is not "near the centre" to anyone)
  const outside = wantsCentre ? shownAll.filter((r) => r.centre_ok === false && (r.distance_to_centre_km ?? 99) <= centre!.r_km * 3).sort((a, b) => (a.distance_to_centre_km ?? 99) - (b.distance_to_centre_km ?? 99)).slice(0, 6) : [];
  // 8-nov-2026: results saved before the Spanish texts existed get them from their home page row
  const slugs = shown.filter((r) => r.deal_slug && !r.title_es).map((r) => r.deal_slug!);
  if (slugs.length) {
    const { data: es } = await db.from("community_deals").select("slug,title,why_great,why_cheap,title_es,why_great_es,why_cheap_es").in("slug", slugs);
    const by = new Map((es || []).map((d: any) => [d.slug, d]));
    for (const r of shown) {
      const d: any = r.deal_slug ? by.get(r.deal_slug) : null;
      if (!d?.title_es) continue;
      if (r.title === d.title) r.title_es = d.title_es;
      if (r.why_great && r.why_great === d.why_great) r.why_great_es = d.why_great_es || null;
      if (r.why_cheap && r.why_cheap === d.why_cheap) r.why_cheap_es = d.why_cheap_es || null;
    }
  }
  // v3: when nothing passed, the closest listings we checked, labelled honestly as not passing (they link to the portal)
  const closest = j.status === "done" && shown.length < 3 ? C.closestMisses(wantsCentre ? all.filter((r) => r.centre_ok !== false) : all) : [];
  // the honest note in both languages (a cached job may have been started in the other one)
  let message: { en: string; es: string } | null = null;
  if (wantsCentre && j.status === "done" && !shown.length) {
    const x = { place: centre!.name, max_price: j.parsed.max_price, currency: j.parsed.currency, min_beds: j.parsed.min_beds, kind: j.parsed.kind, ...CT.centreTally(all) };
    message = { en: CT.centreNote(x, "en"), es: CT.centreNote(x, "es") };
  }
  const centreInfo = centre ? { name: centre.name, label: centre.label || null, lat: centre.lat, lng: centre.lng, radius_km: centre.r_km, src: centre.src, asked: !!j.parsed?.central, message: message?.en ?? null, message_es: message?.es ?? null } : null;
  return json({ job_id: j.id, status: j.status, progress: j.progress, stage: j.stage, results: shown, outside_centre: outside, closest, found: all.length, hidden: all.length - shown.length - outside.length, note: j.note, parsed: j.parsed, centre: centreInfo });
}
// v1 results (no `show`) are never shown again: they were not checked by the AI
const isShown = (r: Result) => r.show === true && r.score >= C.SHOW_MIN;

// The client IP: realhunt.co's own proxy (/__sb) sends it as x-jm-client-ip (there cf-connecting-ip is the
// proxy's); a direct call has it in cf-connecting-ip, which Cloudflare sets and callers cannot fake. x-jm-client-ip
// could be faked on a direct call, so anonymous searches are also capped per network address (netHash).
async function whoIs(req: Request): Promise<Who> {
  const h = req.headers;
  const net = h.get("cf-connecting-ip") || (h.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const viaProxy = h.get("x-jm-client-ip");
  const ip = viaProxy || net;
  const salt = (await secret()).slice(0, 16);
  const ipHash = (await sha("rh-live|" + salt + "|" + ip)).slice(0, 32);
  const netHash = (await sha("rh-live-net|" + salt + "|" + net)).slice(0, 32);
  let user: string | null = null;
  const tok = (h.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (tok && tok !== ANON && tok.split(".").length === 3) {
    try { const { data } = await db.auth.getUser(tok); user = data?.user?.id || null; } catch { /* anonymous */ }
  }
  let admin = false;
  if (user) { try { const { data } = await db.rpc("is_admin", { _user_id: user }); admin = data === true; } catch { /* not admin */ } }
  return { user, ipHash, netHash, ipSrc: viaProxy ? "proxy" : "direct", admin };
}

async function start(req: Request, body: any) {
  const q = String(body.q || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const lang = body.lang === "es" ? "es" : "en";
  const who = await whoIs(req);
  // v3: a place found in several countries is resolved from what was typed, the choice (?in=es) or the visitor's
  // time zone; otherwise we ask before spending anything
  const tz = typeof body.tz === "string" ? body.tz.slice(0, 60) : null;
  const choice = typeof body.where === "string" ? body.where.slice(0, 12) : null;
  const res = C.resolveLive(C.parseLiveQuery(q), { tz, choice });
  const p = res.p;
  // a town only our own homes know ("Ostuni", "Kavala"): its country from the site's snapshot
  if (p.ok && p.place && !p.country && !res.ask) {
    const want = p.place.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const cs = new Set((await approved()).filter((r) => String(r.location_name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().split(/[,(]/).some((x: string) => x.trim() === want)).map((r) => r.country).filter(Boolean));
    if (cs.size === 1) C.placeInto(p, [...cs][0] as string);
  }
  const base = { q: q || "(empty)", lang, parsed: p, user_id: who.user, ip_hash: who.ipHash, admin: !!who.admin, usage: { ip_src: who.ipSrc, net: who.netHash, tz, where: choice } };
  // the slice keeps usage.net on every job, so spend per network address can be summed (dayBudget)
  const log = async (status: string, extra: Record<string, unknown> = {}) => {
    const { data } = await db.from("live_jobs").insert({ ...base, qkey: p.ok ? C.liveKey(p) : null, status, progress: 100, ...extra }).select("id").single();
    return data?.id as string | undefined;
  };
  if (!p.ok) { await log("rejected", { note: p.reason }); return json({ status: "rejected", reason: p.reason, parsed: p }); }
  if (res.ask) { await log("ask", { note: "ambiguous_place" }); return json({ status: "ask", options: res.ask, parsed: p }); }
  const key = C.liveKey(p);

  // the same search in the last 24 h: reuse it (free for everyone, also without an account, and it lets a visitor
  // who left the page come back to the same job)
  const since = new Date(Date.now() - LIMITS.CACHE_HOURS * 3600_000).toISOString();
  const { data: hit } = await db.from("live_jobs").select("id").eq("qkey", key).in("status", ["queued", "running", "done"]).gte("created_at", since).not("work", "is", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (hit) { await log("cached", { ref_job: hit.id, note: "cached" }); return json({ job_id: hit.id, cached: true, parsed: p }); }

  // without an account: the first search is free, then sign in (reused searches above do not count)
  if (!who.user) {
    const { count } = await db.from("live_jobs").select("id", { count: "exact", head: true }).eq("ip_hash", who.ipHash).is("user_id", null).in("status", ["queued", "running", "done", "error", "capped"]);
    const { count: netCount } = await db.from("live_jobs").select("id", { count: "exact", head: true }).eq("usage->>net", who.netHash).is("user_id", null).in("status", ["queued", "running", "done", "error"]).gte("created_at", dayStart());
    if ((count || 0) >= LIMITS.ANON_FREE_SEARCHES || (netCount || 0) >= LIMITS.NET_ANON_PER_DAY) { await log("need_login"); return json({ status: "need_login", parsed: p }); }
  }
  // job caps
  const today = dayStart();
  const real = ["queued", "running", "done", "error"];
  const [{ count: mine }, { count: all }] = await Promise.all([
    who.admin ? db.from("live_jobs").select("id", { count: "exact", head: true }).eq("user_id", who.user!).in("status", real).gte("created_at", today)
      : db.from("live_jobs").select("id", { count: "exact", head: true }).eq("ip_hash", who.ipHash).in("status", real).gte("created_at", today),
    db.from("live_jobs").select("id", { count: "exact", head: true }).in("status", real).eq("admin", false).gte("created_at", today),
  ]);
  const ipCap = who.admin ? LIMITS.ADMIN_JOBS_PER_DAY : LIMITS.IP_JOBS_PER_DAY;
  if ((mine || 0) >= ipCap || (!who.admin && (all || 0) >= LIMITS.GLOBAL_JOBS_PER_DAY)) {
    await log("capped", { note: (mine || 0) >= ipCap ? "ip_cap" : "global_cap" });
    return json({ status: "capped", note: (mine || 0) >= ipCap ? "ip_cap" : "global_cap", parsed: p });
  }
  const { data: job, error } = await db.from("live_jobs").insert({ ...base, qkey: key, status: "queued", progress: 2, stage: { k: "start" } }).select("id").single();
  if (error || !job) return json({ status: "error", note: "db" }, 500);
  background(begin(job.id, p, q, lang, who).catch(async (e) => {
    console.error("live-search run", e);
    await db.from("live_jobs").update({ status: "error", note: "failed", updated_at: new Date().toISOString() }).eq("id", job.id);
  }));
  return json({ job_id: job.id, parsed: p });
}

// ---------------------------------------------------------------- the job, part 1: our data, then find candidates
async function spentToday(col: string | null, val: string | number | boolean | null, nonAdmin = false) {
  let qy = db.from("live_jobs").select("cost_usd").gte("created_at", dayStart()).gt("cost_usd", 0).limit(5000);
  if (col && val != null) qy = qy.eq(col, val);
  if (nonAdmin) qy = qy.eq("admin", false); // an admin testing from home does not use up the family's allowance
  const { data } = await qy; return (data || []).reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0);
}

async function begin(id: string, p: C.LiveQuery, q: string, lang: string, who: Who) {
  const t0 = Date.now();
  const results: Result[] = [];
  let cost = 0;
  const set = (patch: Record<string, unknown>) => db.from("live_jobs").update({ ...patch, results, cost_usd: cost, updated_at: new Date().toISOString() }).eq("id", id);
  await set({ status: "running", progress: 5, stage: { k: "parsed" } });

  // v4: the city-centre point (built-in table; Nominatim once for other cities, only when the centre was asked for)
  const centre = CT.centreFor(p.city || p.place, p.country) || (p.central ? await geocode(p) : null);
  const central = !!(p.central && centre);
  const atCentre = (lat: number | null | undefined, lng: number | null | undefined, text: string) => (centre ? CT.centreFit(centre, { lat: lat ?? null, lng: lng ?? null, text }) : null);
  const main = (r: Result) => !central || r.centre_ok !== false;

  // 1. our own data first
  await set({ progress: 8, stage: { k: "ours" } });
  const rows = await approved();
  const now = new Date().toISOString();
  if (p.kind === "buy") {
    for (const r of rows) {
      if ((Number(r.nota) || 0) < C.SHOW_MIN) continue;
      if (!C.fits({ kind: "buy", country: r.country, place: `${r.location_name || ""}, ${r.country || ""}`, price_eur: Number(r.price_eur) || null, beds: r.bedrooms ?? null, title: r.title }, p)) continue;
      // v4: a published home far from the centre stays published, but is not a result of a "centre" search
      const f = atCentre(Number(r.lat) || null, Number(r.lng) || null, String(r.location_name || ""));
      results.push({
        ...centreCols(f, central), lat: Number(r.lat) || null, lng: Number(r.lng) || null,
        id: "rh-" + r.slug, source: "realhunt", provider: "realhunt", url: "https://realhunt.co/deal/" + r.slug, deal_slug: r.slug, deal_id: r.id, title: r.title, price: Number(r.price_eur) || null, currency: "EUR",
        price_eur: Number(r.price_eur) || null, beds: r.bedrooms ?? null, sqm: r.sqm ?? null, location: r.location_name || "", country: r.country, kind: "buy", image: abs(r.image_urls?.[0] || "") || null,
        image_urls: (r.image_urls || []).slice(0, 3).map(abs), photos: r.image_urls?.length ?? null, score: Number(r.nota), found_at: r.approved_at || now, show: true, why_cheap: r.why_cheap || null, flags: r.ai_flags || [], ai_checked_at: r.ai_checked ? r.ai_checked_at : null,
        title_es: r.title_es || null, why_great_es: r.why_great_es || null, why_cheap_es: r.why_cheap_es || null,
      });
    }
  }
  // finds earlier live searches checked and published (v2 only: shown = true)
  const { data: earlierAll } = await db.from("live_listings").select("url,kind,country,place,price_eur,beds,sqm,score,data,deal_slug,first_seen")
    .eq("kind", p.kind).eq("shown", true).gte("last_seen", new Date(Date.now() - LIMITS.REUSE_DAYS * 86400_000).toISOString()).order("score", { ascending: false }).limit(400);
  const earlier = (earlierAll || []).filter((x: any) => (!p.country || !x.country || x.country === p.country) && C.fits({ kind: x.kind, country: x.country, place: x.place, price_eur: x.price_eur, beds: x.beds, title: x.data?.title }, p));
  const slugs = earlier.map((l: any) => l.deal_slug).filter(Boolean);
  const live = new Map<string, any>();
  if (slugs.length) { const { data } = await db.from("community_deals").select("slug,lat,lng,location_name").in("slug", slugs).eq("status", "approved"); for (const d of data || []) live.set(d.slug, d); }
  for (const l of earlier) {
    if (l.kind === "buy" && (!l.deal_slug || !live.has(l.deal_slug))) continue; // rejected by a person since
    if (l.deal_slug && results.some((r) => r.deal_slug === l.deal_slug)) continue;
    const d = l.deal_slug ? live.get(l.deal_slug) : null;
    const lat = d?.lat ?? l.data?.lat ?? null, lng = d?.lng ?? l.data?.lng ?? null;
    const f = atCentre(lat, lng, String(d?.location_name || l.data?.location || l.place || ""));
    results.push({ ...(l.data as Result), ...centreCols(f, central), lat, lng, source: "earlier", score: l.score, show: true });
  }
  results.sort((a, b) => Number(main(b)) - Number(main(a)) || b.score - a.score);
  if (results.filter(main).length >= LIMITS.REUSE_ENOUGH) {
    // the 8 best central ones, and up to 4 of the closest others for outside_centre
    const keep = [...results.filter(main).slice(0, 8), ...results.filter((r) => !main(r)).sort((a, b) => (a.distance_to_centre_km ?? 99) - (b.distance_to_centre_km ?? 99)).slice(0, 4)];
    results.splice(0, results.length, ...keep);
    await set({ status: "done", progress: 100, stage: { k: "done", n: results.length }, note: "from_earlier", provider: "ours", work: { done: true } });
    return;
  }
  await set({ progress: 12, stage: { k: "ours_some", n: results.length } });

  // 2. Coldwell Banker for US cities (free, and its pages can be read; most US portals block robots, so their
  //    listings could never pass the AI check): first. Its pages are also the same-city comparables.
  const cands: Cand[] = [];
  let note = ""; let provider = ""; let usage: any = null;
  let scanPpm: number[] = [];
  let scanMedians: Record<string, number | null> = {};
  // v5: central comparables for a centre search (value against the centre, not the whole city)
  const comps: { ppm: number; group: CT.Group | null; id?: string }[] = [];
  const cbKind = (t: string): CT.Group => (C.cbGroup(t) === "condo" ? "flat" : "house");
  if (p.city && p.state) {
    await set({ progress: 15, stage: { k: "searching_cb" } });
    const pages = await Promise.all(C.cbSearchUrls(p, 5).map((u) => cand({ action: "scan", url: u, rx: C.CB_RX }, 45000)));
    const scanned = pages.flatMap((r: any) => (Array.isArray(r?.matches) ? r.matches : [])).map(C.parseCbMatch).filter(Boolean) as C.CbRow[];
    const clean = scanned.filter((r) => r.status === "ACTIVE" && !/land|lot|manufactured|mobile/i.test(r.type));
    scanPpm = C.cbPpm(clean);
    scanMedians = C.cbGroupMedians(clean);
    if (central) for (const r of clean) if (r.sqft && r.sqft > 150 && r.price >= 20000 && CT.inCentre(atCentre(r.lat, r.lng, r.address))) comps.push({ ppm: (C.toEur(r.price, "USD") || 0) / (r.sqft * 0.092903), group: cbKind(r.type), id: r.url });
    let picked = C.pickCb(scanned, p, central ? 80 : 14);
    if (central) {
      // v4: downtown first by map position, then the 4 closest others (for outside_centre); the rest are not checked
      const d = (r: C.CbRow) => atCentre(r.lat, r.lng, r.address);
      const inC = picked.filter((r) => CT.inCentre(d(r)));
      const out = picked.filter((r) => d(r)?.status === "outside").sort((a, b) => (d(a)!.km ?? 99) - (d(b)!.km ?? 99)).slice(0, 4);
      picked = [...inC.slice(0, 14), ...out];
    }
    for (const r of picked) {
      cands.push({ url: r.url, title: "", price: r.price, currency: "USD", beds: r.beds, sqm: r.sqft ? Math.round(r.sqft * 0.092903) : null, location: r.address, country: "United States", kind: p.kind, image: r.photo, provider: "coldwellbanker", cb: r, lat: r.lat, lng: r.lng });
    }
    if (cands.length) provider = "coldwellbanker";
    await set({ progress: 22, stage: { k: "found", n: cands.length } });
  }
  // 2b. pisos.com for Spain (v3, free and readable; idealista and fotocasa block our reader)
  if (p.kind === "buy" && p.country === "Spain") {
    const urls = PS.pisosSearchUrls(p, 3);
    if (urls.length) {
      await set({ progress: 15, stage: { k: "searching_cb" } });
      const pages = await Promise.all(urls.map((u) => cand({ action: "scan", url: u.url, rx: PS.PISOS_RX }, 45000).then((r: any) => ({ r }))));
      const parse = (list: { r: any }[]) => list.flatMap(({ r }) => (Array.isArray(r?.matches) ? r.matches : []).map((m: string) => PS.parsePisosCard(m))).filter(Boolean) as PS.PisosRow[];
      // v5: pages marked comps (the centre without the budget) are comparables only, never candidates
      const rowsPs = parse(pages.filter((_, i) => !urls[i].comps));
      const compRows = parse(pages);
      scanPpm = PS.pisosPpm(rowsPs);
      if (central) for (const r of compRows) if (r.sqm && r.sqm >= 25 && CT.inCentre(CT.centreFit(centre!, { text: CT.cardPlaceText(r.area, centre!.name) }))) comps.push({ ppm: r.price / r.sqm, group: PS.pisosGroup(r.type), id: r.url });
      for (const r of PS.pickPisos(rowsPs, p, 20, central ? centre : null)) {
        if (cands.some((x) => x.url === r.url)) continue;
        cands.push({ url: r.url, title: r.title, price: r.price, currency: "EUR", beds: r.beds, sqm: r.sqm, location: PS.pisosArea(r.area, p.place), country: "Spain", kind: "buy", image: r.photo, provider: "pisos.com", ps: r });
      }
      if (cands.some((c) => c.ps)) provider = [provider, "pisos.com"].filter(Boolean).join("+");
      await set({ progress: 22, stage: { k: "found", n: cands.length }, usage: { ip_src: who.ipSrc, net: who.netHash, scanned: rowsPs.length, pages: pages.map((x: any) => (x.r?.matches ? x.r.matches.length : String(x.r?.error || "?").slice(0, 20))) } });
    }
  }

  // v4: for a "centre" search, a candidate that may be central (the 4 closest others, read for outside_centre, do not count)
  const likelyCentral = (x: Cand) => {
    if (!central) return true;
    const f = atCentre(x.lat, x.lng, x.ps ? CT.cardPlaceText(x.ps.area, centre!.name) : x.location);
    return CT.inCentre(f) || (f?.status === "unknown" && !(x.ps && /distrito/i.test(x.ps.area)));
  };
  // 3. the web: Claude with web search, within the caps (for US cities only when the free source found too few)
  // admins: their own day budget and a pool of their own; everyone else: per person and the global cap
  const [mine, ipSpent, netSpent, all] = await Promise.all([
    who.user ? spentToday("user_id", who.user) : spentToday("ip_hash", who.ipHash, true), who.admin ? 0 : spentToday("ip_hash", who.ipHash, true),
    who.admin ? 0 : spentToday("usage->>net", who.netHash, true), spentToday("admin", !!who.admin),
  ]);
  const day = C.dayBudget({ admin: !!who.admin, user: mine, ip: ipSpent, net: netSpent, all });
  const budget = day.budget;
  const budgetNote = () => day.why || "user_budget";
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) note = "no_key";
  else if (budget < LIMITS.EST_REVIEW_USD * 2) note = budgetNote(); // not even the AI checks: say so at once
  else if (cands.filter(likelyCentral).length >= 6) { /* enough readable listings: no need to pay for a web search */ }
  else if (budget < LIMITS.EST_CLAUDE_JOB_USD) note = budgetNote();
  else {
    await set({ progress: 24, stage: { k: "searching" } });
    let prog = 24;
    const tick = setInterval(() => { prog = Math.min(42, prog + 1); set({ progress: prog, stage: { k: "searching" } }).then(() => {}, () => {}); }, 4000);
    try {
      const c = await claude(key, p, q, Math.max(1, 8 - results.filter(main).length), central ? centre : null);
      cost = c.cost; usage = c.usage; provider = [provider, c.model].filter(Boolean).join("+");
      for (const it of c.items.filter((i) => C.withinAsk(i, p) && !C.blockedUrl(i.url))) if (!cands.some((x) => x.url === it.url)) cands.push({ ...it, image: it.image_url, provider: "claude" });
      if (c.error) note = "claude_" + c.error;
    } finally { clearInterval(tick); }
    await set({ progress: 44, stage: { k: "found", n: cands.length }, usage: { ...(usage || {}), model: provider, ip_src: who.ipSrc, net: who.netHash, scanned: scanPpm.length } });
  }
  // the page tells the person at once when the day's live searches are used up (never "nothing found")
  if (note) await set({ note });

  // medians for the value part of the score (core.ts pickMedian)
  const country_medians: Record<string, number | null> = {};
  for (const c of [p.country, ...cands.map((x) => x.country)]) {
    if (!c || c in country_medians) continue;
    country_medians[c] = p.kind === "buy" ? C.median(rows.filter((r) => r.country === c).map((r) => ppm(Number(r.price_eur) || null, Number(r.sqm) || null))) : null;
  }
  const want = (p.city || p.place || "").toLowerCase();
  const { data: prev } = await db.from("live_listings").select("price_eur,sqm,place").eq("kind", p.kind).gte("last_seen", new Date(Date.now() - 90 * 86400_000).toISOString()).limit(1000);
  const local = [...(prev || []).filter((x: any) => !want || String(x.place || "").toLowerCase().includes(want)).map((x: any) => ppm(Number(x.price_eur), Number(x.sqm))),
    ...cands.filter((c) => !c.cb).map((c) => ppm(C.toEur(c.price, c.currency), c.sqm))];
  const m = C.pickMedian(scanPpm, local, p.country ? country_medians[p.country] ?? null : null);
  // v5: a centre search values each home against central comparables: this job's central scan plus central live finds
  // of the last 60 days (centre.ts centreMedians); the city median x a centre premium only when there are too few
  let centreMedians: Record<string, CT.CentreMedian> | null = null;
  if (central) {
    const { data: near } = await db.from("live_listings").select("url,price_eur,sqm,place,data->lat,data->lng,data->title,data->centre_status,data->location")
      .eq("kind", p.kind).ilike("place", `%${centre!.name}%`).gte("last_seen", new Date(Date.now() - 60 * 86400_000).toISOString()).limit(1000);
    for (const x of (near || []) as any[]) {
      const v = ppm(Number(x.price_eur) || null, Number(x.sqm) || null);
      if (!v) continue;
      const f = x.lat != null && x.lng != null ? atCentre(Number(x.lat), Number(x.lng), "") : x.centre_status ? { status: x.centre_status } as CT.CentreFit : atCentre(null, null, String(x.location || ""));
      if (!CT.inCentre(f)) continue;
      const tt = C.titleType(x.title);
      comps.push({ ppm: v, group: tt === "house" ? "house" : tt === "apartment" ? "flat" : null, id: x.url });
    }
    centreMedians = CT.centreMedians(comps, m.ppm);
  }

  // a listing already in the results (an earlier find) is not checked again: it would show twice
  const work: Work = { p, q, lang, who, t0, cands: cands.filter((c) => !results.some((r) => r.url === c.url)).slice(0, LIMITS.MAX_CANDS), i: 0, median: m.ppm, median_from: centreMedians ? centreMedians.all.from : m.from, centre_medians: centreMedians, country_medians, scan_medians: scanMedians, budget: Math.max(0, budget - cost), reviews: 0, units: 0, slices: 0, note, provider, search_cost: cost, centre, outside_reviews: 0 };
  await set({ progress: 45, stage: { k: "checking", n: 0, of: work.cands.length }, work, provider: provider || "ours" });
  await slice(id, t0);
}

// ---------------------------------------------------------------- the job, part 2: check each candidate (resumable)
async function slice(id: string, sliceT0 = Date.now()) {
  const { data: j } = await db.from("live_jobs").select("status,results,cost_usd,work,usage").eq("id", id).maybeSingle();
  if (!j || j.status !== "running" || !j.work || j.work.done) return;
  const w = j.work as Work;
  const results: Result[] = Array.isArray(j.results) ? j.results : [];
  let cost = Number(j.cost_usd) || 0;
  const total = w.cands.length;
  const units = () => total * 3;
  const pct = () => Math.min(97, 45 + Math.round((w.units / Math.max(units(), 1)) * 52));
  const set = (patch: Record<string, unknown>) => db.from("live_jobs").update({ ...patch, results, cost_usd: Math.round(cost * 1e5) / 1e5, work: w, updated_at: new Date().toISOString() }).eq("id", id);
  const step = (k: string, n?: number) => { w.units++; return set({ progress: pct(), stage: { k, n: n ?? Math.min(w.i, total), of: total } }); };
  w.slices++;
  const wantsCentre = !!(w.p.central && w.centre);
  const mainShown = (r: Result) => isShown(r) && (!wantsCentre || r.centre_ok !== false);
  const shownCount = () => results.filter(mainShown).length;
  const tooLate = () => Date.now() - w.t0 > LIMITS.JOB_MAX_MS;

  // heartbeat: a slow listing (an import can take a minute) must not look like a dead job to the poll's re-start
  const beat = setInterval(() => { db.from("live_jobs").update({ updated_at: new Date().toISOString() }).eq("id", id).then(() => {}, () => {}); }, 20_000);
  try {
  while (w.i < total && !tooLate() && shownCount() < 12 && Date.now() - sliceT0 < LIMITS.SLICE_START_MS) {
    const batch = w.cands.slice(w.i, w.i + 3);
    w.i += batch.length;
    await set({ progress: pct(), stage: { k: "checking", n: w.i, of: total } });
    await Promise.all(batch.map((c) => checkOne(c, w, results, (usd) => { cost += usd; }, step).catch((e) => console.error("check", c.url, e))));
    await set({ progress: pct(), stage: { k: "checking", n: w.i, of: total } });
  }
  } finally { clearInterval(beat); }
  if (w.i < total && !tooLate() && shownCount() < 12) { await set({}); const st = await chain(id); if (!st.startsWith("200")) console.error("chain failed", id, st); return; }

  // done
  results.sort((a, b) => Number(mainShown(b)) - Number(mainShown(a)) || Number(isShown(b)) - Number(isShown(a)) || b.score - a.score);
  const good = results.filter(mainShown).length;
  w.done = true;
  const reviewCost = Math.round((cost - w.search_cost) * 1e5) / 1e5;
  // v4: nothing central passed: say so, with how far the closest listing we checked is (codes such as user_budget
  // stay in brackets, so the page still knows a limit was reached)
  const centreNote = wantsCentre && !good ? CT.centreNote({ place: w.centre!.name, max_price: w.p.max_price, currency: w.p.currency, min_beds: w.p.min_beds, kind: w.p.kind, ...CT.centreTally(results) }, w.lang === "es" ? "es" : "en") + (w.note ? ` [${w.note}]` : "") : null;
  await set({
    status: "done", progress: 100, stage: { k: "done", n: good, of: results.length }, provider: w.provider || "ours",
    note: centreNote || (good ? w.note || null : "none_80" + (w.note ? ":" + w.note : "")),
    usage: { ...(j.usage || {}), reviews: w.reviews, review_cost: reviewCost, search_cost: w.search_cost, slices: w.slices, median_from: w.median_from, centre_medians: w.centre_medians || undefined, ms: Date.now() - w.t0 },
  });
  // fill the new homes' sub-scores now (the hourly cron does it too), so their pages show a full score
  if (results.some((r) => r.source === "web" && r.deal_slug && isShown(r))) await db.rpc("community_dims_fill").then(() => {}, () => {});
}

const sourceKey = (u: string) => String(u).replace(/^https?:\/\/(www\.)?/, "").split("#")[0].replace(/\/+$/, "").toLowerCase();

async function checkOne(c: Cand, w: Work, results: Result[], spend: (usd: number) => void, step: (k: string) => PromiseLike<unknown>) {
  const p = w.p;
  const factsRx = c.cb ? C.CB_FACTS_RX : c.ps ? PS.PISOS_FACTS_RX : null;
  const [x, factsRaw] = await Promise.all([cand({ action: "extract", url: c.url }, 25000), factsRx ? cand({ action: "scan", url: c.url, rx: factsRx }, 25000) : Promise.resolve(null)]);
  await step("reading");
  const okPage = x && !x.error;
  const facts = c.cb ? C.parseCbFacts(factsRaw?.matches) : null;
  const pf = c.ps ? PS.parsePisosFacts(factsRaw?.matches) : null;
  let photos: string[] = [];
  if (c.cb) photos = C.cbPhotos(okPage ? x.images || [] : [], c.cb.photo);
  else if (c.ps) photos = PS.pisosPhotos(okPage ? x.images || [] : [], c.ps.photo);
  else if (okPage) photos = (x.images || []).filter((u: string) => /^https:\/\//.test(u));
  const price = c.price ?? (okPage ? x.price : null);
  const currency = c.price != null ? c.currency : (okPage && x.currency) || c.currency;
  const price_eur = C.toEur(price, currency);
  const beds = c.beds ?? (okPage ? x.bedrooms : null);
  const baths = c.cb?.baths ?? facts?.baths ?? c.ps?.baths ?? pf?.baths ?? null;
  const sqm = c.sqm ?? (okPage && !c.cb ? x.sqm : null);
  const lat = c.lat ?? pf?.lat ?? (okPage ? x.lat : null), lng = c.lng ?? pf?.lng ?? (okPage && !c.cb ? x.lng : null);
  const desc = (facts?.remarks || (okPage ? String(x.description || "") : "") || c.ps?.desc || "").slice(0, 3000);
  const cityName = c.cb ? (c.cb.path.split("/")[2] || "").replace(/-/g, " ") : "";
  const stateName = p.state ? C.US_STATES[p.state] : "";
  const tc = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());
  const location = c.cb ? [facts?.subdivision, tc(cityName), tc(stateName)].filter(Boolean).join(", ") : c.location || (okPage && x.locality) || "";
  const country = c.country || p.country;
  // v4: where it stands against the city centre (map position first, then its own district)
  const fit = w.centre ? CT.centreFit(w.centre, { lat, lng, text: c.ps ? CT.cardPlaceText(c.ps.area, w.centre.name) : [location, c.cb?.address].filter(Boolean).join(" ") }) : null;
  const wantsCentre = !!(p.central && w.centre);
  // a "centre" search checks a listing outside the centre only for the honest "closest" list: at most 4, within 2.5 x the radius
  const outsideOk = wantsCentre && fit?.status === "outside" && (fit.km ?? 99) <= w.centre!.r_km * 2.5 && (w.outside_reviews || 0) < 4;
  // the same kind of home in the same city first (a townhouse against townhouses), then the job's median
  // v5: a centre search compares with central homes of the same kind (centre.ts centreMedians)
  const kind: CT.Group | null = c.ps ? PS.pisosGroup(c.ps.type) : c.cb ? (C.cbGroup(c.cb.type) === "condo" ? "flat" : "house") : (() => { const t = C.titleType(c.title); return t === "house" ? "house" : t === "apartment" ? "flat" : null; })();
  // only for central homes: a home outside the centre (read for the honest "closest" list) keeps the city median, or
  // it would look far cheaper than it is
  const cm = wantsCentre && w.centre_medians && CT.inCentre(fit) ? (kind && w.centre_medians[kind]) || w.centre_medians.all : null;
  const median = cm?.ppm || (c.cb && w.scan_medians?.[C.cbGroup(c.cb.type)]) || w.median || (country ? w.country_medians[country] ?? null : null);
  const ptype = c.cb?.type || c.ps?.type || (p.ptype !== "any" ? p.ptype : "");
  const flags0 = C.textFlags([desc, c.title, facts?.text || "", facts?.style || "", facts?.body || "", pf?.text || ""].join(" "), { beds, baths, sqm });
  if (facts?.senior && !flags0.includes("age_restricted")) flags0.push("age_restricted");
  const base = { price_eur, sqm, photos: okPage ? photos.length : null, beds, lat, lng, desc_len: desc.length, kind: c.kind };
  const ctx = { median_ppm: median, min_beds: p.min_beds };
  const best = C.liveScore({ ...base, photo_quality: 10, flags: flags0.filter((f) => !(C.FLAG_PENALTY[f] > 0)), why_cheap: "if explained" }, ctx);
  const pre = C.liveScore({ ...base, flags: flags0 }, ctx);

  // an existing home for this listing (a person may have approved or rejected it already)
  const slug = C.slugFor(c.url, c.cb ? { city: cityName, address: c.cb.address, price } : {});
  let existing: any = null;
  if (c.kind === "buy") {
    const sel = "id,slug,status,image_urls,ai_checked,ai_checked_at,title,why_great,why_cheap,ai_flags,title_es,why_great_es,why_cheap_es";
    existing = (await db.from("community_deals").select(sel).eq("source_key", sourceKey(c.url)).maybeSingle()).data || (await db.from("community_deals").select(sel).eq("slug", slug).maybeSingle()).data;
  }

  let review: C.Review | null = null; let reviewed = 0; let skip = "";
  if (existing?.status === "rejected") skip = "rejected_before";
  else if (existing?.status === "approved") skip = "already_live";
  else if (!okPage && !c.cb) skip = "unreadable";
  else if (photos.length < 4 && !(existing?.image_urls?.length >= 4)) skip = "few_photos";
  else if (best.score < C.SHOW_MIN) skip = "cannot_reach_80";
  else if (wantsCentre && !CT.inCentre(fit) && !outsideOk) skip = fit?.status === "outside" ? "far_from_centre" : "centre_unknown";
  else if (w.reviews >= LIMITS.MAX_REVIEWS) skip = "review_cap";
  else if (w.budget < LIMITS.EST_REVIEW_USD) skip = "budget";
  const pics = existing?.status === "pending" && existing.image_urls?.length >= 4 ? existing.image_urls : photos;
  if (!skip) {
    w.reviews++;
    if (wantsCentre && !CT.inCentre(fit)) w.outside_reviews = (w.outside_reviews || 0) + 1;
    await step("reviewing");
    const rv = await aiReview(pics.slice(0, 6), { kind: c.kind, price, currency, price_eur, beds, baths, sqm, ptype, location: c.cb ? `${c.cb.address}` : location, country, ratio: pre.parts.ratio, text: desc, facts: [facts ? facts.text : pf ? [pf.text, c.ps?.central ? "In the city centre district" : ""].filter(Boolean).join("; ") : "", fit?.km != null ? `${fit.km} km from the city centre` : ""].filter(Boolean).join("; ") });
    spend(rv.cost); w.budget -= rv.cost;
    review = rv.review; reviewed = rv.reviewed;
  } else await step("reviewing");

  const flags = [...new Set([...flags0, ...(review?.flags || [])])];
  const sc = review ? C.liveScore({ ...base, photo_quality: review.photo_quality, flags, why_cheap: review.why_cheap }, ctx) : pre;
  const ordered = C.orderPhotos(pics, review, reviewed, 10);
  const gate = existing?.status === "approved" ? { show: true, reasons: [] as string[] } : C.gateDecision(sc.score, review ? { ...review, flags } : null, ordered.length);
  if (skip && skip !== "already_live") gate.reasons.unshift("skip:" + skip);
  const soft = flags.filter((f) => (C.SOFT_FLAGS as readonly string[]).includes(f));
  const why_cheap = review?.why_cheap || (soft.includes("age_restricted") && (pre.parts.ratio ?? 1) < 0.7 ? "Only for buyers aged 55 or more." : null);
  const why_cheap_es = review?.why_cheap ? review.why_cheap_es : why_cheap ? "Solo para compradores de 55 años o más." : null;
  const isCondo = /condo|co-?op|apartment|townhouse/i.test(ptype);
  const hoa = review?.hoa_monthly ?? facts?.hoa ?? pf?.fee ?? null;
  // Florida (Carlos, 7-nov-2026): the listing's tax is the seller's, with the homestead discount; a buyer pays about 1.8 % a year
  const fl = c.cb && p.state === "fl" && c.kind === "buy" && price;
  const est = fl ? Math.round((price! * 0.018) / 100) * 100 : 0;
  const sellerTax = facts?.tax || 0;
  const tax = fl ? Math.max(est, Math.round(sellerTax / 100) * 100) : review?.tax_annual ?? facts?.tax ?? null;
  const costs_note = !fl ? null : sellerTax > est
    ? `Property tax: the last tax bill was $${Math.round(sellerTax).toLocaleString("en-US")} a year.`
    : `Property tax is an estimate for a new owner (about 1.8% of the price a year)${sellerTax ? `; the seller paid $${Math.round(sellerTax).toLocaleString("en-US")} in the last tax bill, which may include a homestead discount` : ""}.`;
  const r: Result = {
    id: "web-" + (await sha(c.url)).slice(0, 12), source: "web", provider: c.provider, url: c.url, deal_slug: null, deal_id: null,
    title: (review?.title || existing?.title || c.title || (okPage && x.title) || "Home").slice(0, 160), price, currency, price_eur, beds, sqm,
    location, country, kind: c.kind, image: ordered[0] || c.image || null, image_urls: ordered.slice(0, 3), photos: okPage ? photos.length : null,
    score: sc.score, parts: { ...sc.parts, caps: sc.caps }, found_at: new Date().toISOString(),
    central: c.ps ? c.ps.central : null,
    ...centreCols(fit, wantsCentre), lat: lat ?? null, lng: lng ?? null,
    show: gate.show, reasons: gate.reasons, photo_quality: review?.photo_quality ?? null, flags: soft, why_cheap, why_great: review?.why_great || null,
    title_es: review?.title ? review.title_es : existing?.title_es || null, why_great_es: review?.why_great ? review.why_great_es : null, why_cheap_es,
    ai_checked_at: review ? new Date().toISOString() : existing?.ai_checked_at || null, hoa_monthly: hoa, hoa_currency: hoa || tax ? currency : null, tax_annual: tax, hoa_unknown: isCondo && !hoa,
  };

  // homes to buy: a full RealHunt home page. New ones are imported (photos copied in the best order) and published
  // as AI-checked; an earlier pending import of the same listing is updated and published; a live one is linked.
  if (r.kind === "buy" && r.show) {
    await step("publishing");
    if (existing?.status === "approved") {
      Object.assign(r, { deal_slug: existing.slug, deal_id: existing.id, title: existing.title, title_es: existing.title_es || null, why_great_es: existing.why_great_es || null, why_cheap_es: existing.why_cheap ? existing.why_cheap_es || null : r.why_cheap_es, image: abs(existing.image_urls?.[0] || "") || r.image, image_urls: (existing.image_urls || []).slice(0, 3), why_cheap: existing.why_cheap ?? r.why_cheap, flags: existing.ai_flags || r.flags, ai_checked_at: existing.ai_checked ? existing.ai_checked_at : null });
    } else if (r.country && price_eur) {
      const aiCols = { status: "approved", ai_checked: true, ai_checked_at: r.ai_checked_at, why_cheap: r.why_cheap, ai_flags: soft.length ? soft : null, hoa_monthly: hoa, hoa_currency: r.hoa_currency, tax_annual: tax, hoa_unknown: !!r.hoa_unknown, costs_note, reject_reason: null, title_es: r.title_es || null, why_great_es: r.why_great_es || null, why_cheap_es: r.why_cheap_es || null };
      let dealId: string | null = null; let dealSlug: string | null = null;
      if (existing?.status === "pending") {
        const { error } = await db.from("community_deals").update({ ...aiCols, title: r.title, why_great: r.why_great || existing.why_great, image_urls: ordered }).eq("id", existing.id).eq("status", "pending");
        if (!error) { dealId = existing.id; dealSlug = existing.slug; }
      } else {
        const imp = await cand({ action: "import", deal: { slug, title: r.title, source_url: c.url, price_eur: Math.round(price_eur / 100) * 100, country: r.country, location_name: location, sqm, bedrooms: beds, category: "city", why_great: r.why_great || r.title, images: ordered, lat, lng } }, 60000);
        if (imp?.deal?.id) {
          const { error } = await db.from("community_deals").update(aiCols).eq("id", imp.deal.id).eq("status", "pending");
          if (!error) { dealId = imp.deal.id; dealSlug = imp.deal.slug; }
        } else r.reasons = [...(r.reasons || []), "import:" + String(imp?.error || (imp?.duplicate ? "duplicate" : "failed")).slice(0, 60)];
      }
      if (dealId && dealSlug) {
        const { data: d } = await db.from("community_deals").select("image_urls").eq("id", dealId).maybeSingle();
        Object.assign(r, { deal_slug: dealSlug, deal_id: dealId, image: d?.image_urls?.[0] || r.image, image_urls: (d?.image_urls || []).slice(0, 3) });
      } else r.show = false; // no page, no card: every home to buy shown must open a full RealHunt page
    } else { r.show = false; r.reasons = [...(r.reasons || []), "no_price_or_country"]; }
  } else await step("publishing");

  await db.from("live_listings").upsert({
    url: c.url, kind: c.kind, q: w.q, qkey: C.liveKey(p), country: r.country, place: `${c.cb ? c.cb.address + ", " : ""}${location}, ${c.country || ""}`.slice(0, 300), price_eur, beds, sqm,
    data: { ...r, source: "earlier" }, score: r.score, last_seen: new Date().toISOString(), deal_slug: r.deal_slug, shown: r.show, review: review ? { ...review, reviewed, model: REVIEW_MODEL, reasons: r.reasons } : { skip, reasons: r.reasons },
  }, { onConflict: "url" });
  results.push(r);
}

// ---------------------------------------------------------------- the AI check (Claude vision)
function b64(buf: Uint8Array): string {
  let s = ""; const n = 0x8000;
  for (let i = 0; i < buf.length; i += n) s += String.fromCharCode(...buf.subarray(i, i + n));
  return btoa(s);
}
async function image(url: string): Promise<{ media_type: string; data: string } | null> {
  const u = /images-listings\.coldwellbanker\.com/.test(url) ? url.split("?")[0] + "?width=800" : url;
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 12000);
  try {
    const r = await fetch(u, { signal: c.signal, headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36", Accept: "image/webp,image/jpeg,image/png,image/*" } });
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!r.ok || !/^image\/(jpeg|png|webp|gif)$/.test(ct)) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length < 8000 || buf.length > 4_500_000) return null;
    return { media_type: ct, data: b64(buf) };
  } catch { return null; } finally { clearTimeout(t); }
}
async function aiReview(urls: string[], info: Omit<Parameters<typeof C.reviewPrompt>[0], "nPhotos">): Promise<{ review: C.Review | null; reviewed: number; cost: number }> {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return { review: null, reviewed: 0, cost: 0 };
  // keep each photo's position: the AI's indexes refer to the list it saw, which must match `urls`
  const imgs = await Promise.all(urls.map(image));
  const okIdx = imgs.map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
  if (okIdx.length < 2) return { review: null, reviewed: 0, cost: 0 };
  // only a gapless prefix can be mapped back by index; photos after the first unreadable one count as unseen
  let n = 0; while (n < imgs.length && imgs[n]) n++;
  if (n < 2) return { review: null, reviewed: 0, cost: 0 };
  const content = [...imgs.slice(0, n).map((m) => ({ type: "image", source: { type: "base64", ...m! } })), { type: "text", text: C.reviewPrompt({ ...info, nPhotos: n }) }];
  let cost = 0;
  for (const model of [REVIEW_MODEL, MODELS[0]]) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 40000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: c.signal, headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 1500, messages: [{ role: "user", content }] }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 404 || d?.error?.type === "not_found_error") continue;
      cost += C.jobCost(model, d?.usage);
      if (!r.ok) { console.error("review", r.status, d?.error?.message); return { review: null, reviewed: 0, cost }; }
      const text = (Array.isArray(d.content) ? d.content : []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
      return { review: C.parseReview(text, n), reviewed: n, cost };
    } catch (e) { console.error("review", e); return { review: null, reviewed: 0, cost }; } finally { clearTimeout(t); }
  }
  return { review: null, reviewed: 0, cost };
}

// ---------------------------------------------------------------- Spanish texts of homes that have none (8-nov-2026)
async function translateMissing(limit: number) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const MISSING = "title_es.is.null,and(why_great.not.is.null,why_great_es.is.null),and(why_cheap.not.is.null,why_cheap_es.is.null)";
  const { data: rows } = await db.from("community_deals").select("id,title,why_great,why_cheap").eq("status", "approved").or(MISSING).order("approved_at", { ascending: false }).limit(limit);
  const left = async () => (await db.from("community_deals").select("id", { count: "exact", head: true }).eq("status", "approved").or(MISSING)).count ?? null;
  if (!rows?.length || !key) return { translated: 0, left: await left() };
  const items = rows.map((r: any) => ({ id: r.id, title: r.title, why_great: r.why_great, why_cheap: r.why_cheap }));
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 90000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: c.signal, headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 6000, messages: [{ role: "user", content: C.translatePrompt(items) }] }),
    });
    const d = await r.json().catch(() => ({}));
    const cost = C.jobCost("claude-haiku-4-5", d?.usage);
    if (!r.ok) return { translated: 0, error: d?.error?.message || r.status, cost };
    const text = (Array.isArray(d.content) ? d.content : []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    const out = C.parseTranslations(text, rows.map((x: any) => x.id));
    let n = 0;
    for (const o of out) {
      const src: any = rows.find((x: any) => x.id === o.id);
      const { error } = await db.from("community_deals").update({ title_es: o.title_es, why_great_es: src?.why_great ? o.why_great_es || "" : null, why_cheap_es: src?.why_cheap ? o.why_cheap_es || "" : null }).eq("id", o.id); // "" = tried, no Spanish: never paid for twice
      if (!error) n++;
    }
    return { translated: n, cost, left: await left() };
  } catch (e) { return { translated: 0, error: String(e) }; } finally { clearTimeout(t); }
}

/** Internal (secret): Spanish of site texts (buying rules, guide steps) for the dictionary, 40 strings a call. */
async function translateStrings(items: unknown[], context: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  const list = items.map((x) => String(x || "").slice(0, 2000)).filter(Boolean);
  if (!key || !list.length) return { out: [] };
  const prompt = [
    "Translate these texts of RealHunt (a site where foreigners find, check and buy homes abroad) from English into natural, precise Spanish (Spain).",
    "Keep numbers, percentages, currencies, dates, law and tax names, place names and local terms (e.g. IMU, ITP, Hak Pakai, fideicomiso) exactly; write numbers the Spanish way (1,5% and 4.014 m²). No em dashes. Keep the meaning exact, add nothing.",
    context ? "Context: " + context : "",
    'Return ONLY a JSON array of strings, same order and same count as the input.',
    JSON.stringify(list),
  ].filter(Boolean).join("\n");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 8000, messages: [{ role: "user", content: prompt }] }),
  });
  const d = await r.json().catch(() => ({}));
  const cost = C.jobCost("claude-haiku-4-5", d?.usage);
  const text = (Array.isArray(d.content) ? d.content : []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
  const a = text.indexOf("["), b = text.lastIndexOf("]");
  let out: unknown = [];
  try { out = JSON.parse(text.slice(a, b + 1)); } catch { /* bad answer */ }
  return { out: Array.isArray(out) && out.length === list.length ? out.map((x) => String(x).replace(/\s*[—–]\s*/g, ", ")) : [], cost };
}

// ---------------------------------------------------------------- re-check homes earlier live searches imported
async function regate(only: string[] | null, apply: boolean) {
  const { data: listed } = await db.from("live_listings").select("url,deal_slug,data,q,country,price_eur,sqm,beds").not("deal_slug", "is", null).limit(500);
  const bySlug = new Map((listed || []).map((l: any) => [l.deal_slug, l]));
  const slugs = only?.length ? only.filter((s) => bySlug.has(s)) : [...bySlug.keys()];
  const { data: deals } = await db.from("community_deals").select("id,slug,status,ai_checked,image_urls,title,why_great,price_eur,sqm,bedrooms,lat,lng,country,location_name,source_url").in("slug", slugs.length ? slugs : ["-"]);
  const rows = await approved();
  const out: any[] = []; let cost = 0;
  for (const d of deals || []) {
    if (!(d.status === "pending" || (d.status === "approved" && d.ai_checked))) { out.push({ slug: d.slug, status: d.status, skipped: "not_live_search_owned" }); continue; }
    if (cost > 0.6) { out.push({ slug: d.slug, skipped: "budget" }); continue; }
    const l: any = bySlug.get(d.slug);
    const facts = /coldwellbanker\.com/.test(d.source_url || "") ? C.parseCbFacts((await cand({ action: "scan", url: d.source_url, rx: C.CB_FACTS_RX }, 25000))?.matches) : null;
    const desc = facts?.remarks || d.why_great || "";
    const med = C.median(rows.filter((r) => r.country === d.country).map((r) => ppm(Number(r.price_eur) || null, Number(r.sqm) || null)));
    const { data: near } = await db.from("live_listings").select("price_eur,sqm,place").ilike("place", `%${(() => { const parts = String(d.location_name || "").split(",").map((x) => x.trim()).filter(Boolean); return parts.length >= 2 ? parts[parts.length - 2] : parts[0] || ""; })()}%`).limit(300);
    const m = C.pickMedian([], (near || []).map((x: any) => ppm(Number(x.price_eur), Number(x.sqm))), med);
    const flags0 = C.textFlags([desc, facts?.text || ""].join(" "), { beds: d.bedrooms, baths: facts?.baths, sqm: d.sqm });
    if (facts?.senior && !flags0.includes("age_restricted")) flags0.push("age_restricted");
    const base = { price_eur: d.price_eur, sqm: d.sqm, photos: d.image_urls?.length || 0, beds: d.bedrooms, lat: d.lat, lng: d.lng, desc_len: desc.length, kind: "buy" as const };
    const pre = C.liveScore({ ...base, flags: flags0 }, { median_ppm: m.ppm, min_beds: null });
    const rv = await aiReview((d.image_urls || []).slice(0, 6), { kind: "buy", price: l?.data?.price ?? d.price_eur, currency: l?.data?.currency || "EUR", price_eur: d.price_eur, beds: d.bedrooms, baths: facts?.baths, sqm: d.sqm, ptype: "", location: d.location_name || "", country: d.country, ratio: pre.parts.ratio, text: desc, facts: facts?.text || "" });
    cost += rv.cost;
    const flags = [...new Set([...flags0, ...(rv.review?.flags || [])])];
    const sc = rv.review ? C.liveScore({ ...base, photo_quality: rv.review.photo_quality, flags, why_cheap: rv.review.why_cheap }, { median_ppm: m.ppm, min_beds: null }) : pre;
    const ordered = C.orderPhotos(d.image_urls || [], rv.review, rv.reviewed, 10);
    const gate = C.gateDecision(sc.score, rv.review ? { ...rv.review, flags } : null, ordered.length);
    const soft = flags.filter((f) => (C.SOFT_FLAGS as readonly string[]).includes(f));
    const row: any = { slug: d.slug, was: d.status, score: sc.score, photo_quality: rv.review?.photo_quality ?? null, flags, reasons: gate.reasons, title: rv.review?.title, why_cheap: rv.review?.why_cheap };
    if (apply && rv.review) {
      if (gate.show) {
        await db.from("community_deals").update({ status: "approved", ai_checked: true, ai_checked_at: new Date().toISOString(), title: rv.review.title, why_great: rv.review.why_great || d.why_great, why_cheap: rv.review.why_cheap, title_es: rv.review.title_es, why_great_es: rv.review.why_great ? rv.review.why_great_es : null, why_cheap_es: rv.review.why_cheap_es, ai_flags: soft.length ? soft : null, image_urls: ordered, reject_reason: null }).eq("id", d.id);
        row.now = "approved";
      } else {
        await db.from("community_deals").update({ status: "rejected", ai_checked: false, reject_reason: ("AI check v2 (live search): " + gate.reasons.join(", ")).slice(0, 500) }).eq("id", d.id);
        row.now = "rejected";
      }
      await db.from("live_listings").update({ shown: gate.show, score: sc.score, review: { ...rv.review, reviewed: rv.reviewed, model: REVIEW_MODEL, reasons: gate.reasons } }).eq("deal_slug", d.slug);
    }
    out.push(row);
  }
  await db.from("live_jobs").insert({ q: "(regate)", status: "done", progress: 100, cost_usd: Math.round(cost * 1e5) / 1e5, ip_hash: "test:regate", note: apply ? "regate_apply" : "regate_dry", usage: { n: out.length } });
  if (apply) await db.rpc("community_dims_fill").then(() => {}, () => {});
  return { cost, out };
}

// ---------------------------------------------------------------- Claude with web search
async function claude(key: string, p: C.LiveQuery, q: string, want: number, centre: CT.Centre | null = null): Promise<{ items: C.LiveItem[]; cost: number; usage: any; model: string; error?: string }> {
  const wants = [
    p.kind === "rent" ? "to rent" : "to buy",
    p.ptype !== "any" && !p.ptype_soft ? (p.ptype === "apartment" ? "an apartment / flat / condo" : "a house") : "any home (house or apartment)",
    `in ${[p.place || p.city, p.state?.toUpperCase(), p.country].filter(Boolean).join(", ")}`,
    p.min_beds ? `at least ${p.min_beds} bedrooms` : "",
    p.central ? (centre ? `in the city centre: within about ${centre.r_km} km of ${centre.label || "the centre"} (not the outskirts, not nearby towns)` : "in the city centre / old town (not the outskirts, not nearby towns)") : "",
    p.max_price ? `price at most ${p.max_price} ${p.currency}${p.kind === "rent" ? " per month" : ""}` : "",
    p.min_price ? `price at least ${p.min_price} ${p.currency}` : "",
  ].filter(Boolean).join("; ");
  const system = "You find real estate listings for RealHunt, a site of the best-value homes: attractive, well-kept homes with good photos in good areas. Use the web_search tool to find CURRENT individual property listings (one home per page, " +
    "not search result pages, not news, not blogs) on real estate portals or agency websites. Never invent a listing, a price or a URL: every url you return " +
    "must be exactly a URL that appeared in your web search results or in a page you opened with web_fetch. Search results are often list pages " +
    "(e.g. Redfin, Trulia, homes.com, Idealista, Rightmove category pages): open 1 to 3 of the most relevant list pages with web_fetch and take the " +
    "individual listing URLs, prices and details shown there (make relative links absolute with that page's domain). If you are not sure a listing is current or matches, leave it out. " +
    "Leave out mobile or manufactured homes, homes on rented land, 55+ communities, auctions, timeshares, shares of a property and homes that need a full renovation. " +
    `Only listings whose page our robot can read count: prefer ${C.READABLE_PORTALS.join(", ")} and estate agents' own websites; never return listings from idealista, fotocasa, yaencontre, zillow, redfin, homes.com, realtor.com, trulia, casa.sapo, supercasa, kyero, engelvoelkers, rightmove or zoopla (they block robots). ` +
    "Reply with ONLY a JSON array, no prose, no code fences: " +
    '[{"url":"","title":"","price":0,"currency":"USD","beds":0,"sqm":0,"location":"town, region","country":"country name in English","kind":"buy","image_url":""}]. ' +
    "price is a number in the listing currency (monthly rent for rentals), sqm is the living area in square metres (convert from sq ft by multiplying by 0.0929), " +
    "kind is \"buy\" or \"rent\", image_url only if it appeared in the results. Use null for anything the results do not say. Return [] if nothing fits.";
  const user = `The person searched: "${q}"\nWhat they want: ${wants}.\nFind up to ${Math.min(10, want + 4)} matching listings.`;
  let lastErr = "";
  for (const model of MODELS) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 100_000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: c.signal,
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-beta": "web-fetch-2025-09-10", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 3000, system, messages: [{ role: "user", content: user }], tools: [
          // 8-nov-2026: 4 searches + 3 fetches of 12k tokens cost US$0.76 on one search; this keeps it near US$0.3
          { type: "web_search_20250305", name: "web_search", max_uses: 3 },
          { type: "web_fetch_20250910", name: "web_fetch", max_uses: 2, max_content_tokens: 8000 },
        ] }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 404 || d?.error?.type === "not_found_error") { lastErr = "model"; continue; }
      if (!r.ok) { console.error("claude", r.status, d?.error?.type, d?.error?.message); return { items: [], cost: C.jobCost(model, d?.usage), usage: d?.usage || null, model, error: "http_" + r.status }; }
      const blocks: any[] = Array.isArray(d.content) ? d.content : [];
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const urls = blocks.filter((b) => b.type === "web_search_tool_result" && Array.isArray(b.content)).flatMap((b) => b.content.map((x: any) => x.url)).filter(Boolean);
      // list pages opened with web_fetch hold the individual listings; accept a URL found in their text, or a relative
      // link from that page made absolute with the page's own domain.
      const fetched = blocks.filter((b) => b.type === "web_fetch_tool_result").map((b) => b.content).filter((x: any) => x && x.url);
      for (const f of fetched) {
        urls.push(f.url);
        const doc = String(f.content?.source?.data || f.content?.content?.source?.data || "");
        const origin = (() => { try { return new URL(f.url).origin; } catch { return ""; } })();
        for (const m of doc.matchAll(/https?:\/\/[^\s)"'<>\]]+/g)) urls.push(m[0]);
        if (origin) for (const m of doc.matchAll(/\]\((\/[^\s)]+)\)|href="(\/[^"]+)"/g)) urls.push(origin + (m[1] || m[2]));
      }
      const items = C.parseClaudeListings(text, urls, p.kind);
      return { items, cost: C.jobCost(model, d.usage), usage: { ...d.usage, result_urls: urls.length, items_raw: (text.match(/"url"/g) || []).length, kept: items.length, text_head: text.slice(0, 600), fetched: fetched.length }, model };
    } catch (e) { lastErr = String(e).slice(0, 60); } finally { clearTimeout(t); }
  }
  return { items: [], cost: 0, usage: null, model: "", error: lastErr || "failed" };
}
