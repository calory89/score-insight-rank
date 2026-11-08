// realhunt-live-search (v2, 8-nov-2026): searches the web for homes to buy or rent while the person waits, checks
// every find with Claude vision and turns the good ones into real RealHunt homes.
//   POST {q, lang}  -> {job_id, parsed}   (or {status:"rejected"|"need_login"|"capped", ...})
//   GET  ?job=<id>  -> {status, progress 0-100, stage, results[] (only the ones that passed), hidden, note, parsed}
//   POST {action:"work", job, secret}      internal: continues a long job in a fresh invocation (see slice)
//   POST {action:"regate", slugs?, secret}  internal: runs the v2 check on homes earlier live searches imported
// Order of work, cheapest first:
//   1. our own data: approved RealHunt homes (score >= 80) and finds earlier live searches published (last 30 days,
//      passed the gate). With 6 or more good matches it answers from them and spends nothing.
//   2. Coldwell Banker (free, readable) for US cities.
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
// realhunt.live_listings with its review, also the ones not shown. Spending caps: LIMITS below.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as C from "./core.ts";

export const LIMITS = {
  ANON_FREE_SEARCHES: 1, // searches without an account, per IP hash
  NET_ANON_PER_DAY: 60, // anonymous jobs per network address per UTC day (see whoIs)
  IP_JOBS_PER_DAY: 8, // new jobs per IP hash per UTC day (signed in or not)
  GLOBAL_JOBS_PER_DAY: 300,
  USER_USD_PER_DAY: 1, // Claude spend (search + AI checks) per user (or per IP hash without an account) per UTC day
  GLOBAL_USD_PER_DAY: 30,
  EST_CLAUDE_JOB_USD: 0.5, // what the web search part of one job may cost, checked against the caps before calling
  EST_REVIEW_USD: 0.03, // what one AI check may cost; each check runs only while the job's budget still covers it
  MAX_REVIEWS: 12, // AI checks per job
  REUSE_ENOUGH: 6, // good matches we must already have to skip the web
  REUSE_DAYS: 30,
  CACHE_HOURS: 24,
  SLICE_START_MS: 45_000, // an invocation starts new listings only during its first 45 s, then hands over
  JOB_MAX_MS: 10 * 60_000, // a job stops after 10 minutes and finishes with what it has
  KICK_MS: 90_000, // a running job not updated for this long is re-started by the next poll
  STALE_MS: 300_000, // ... and after this long it is marked as failed
  MAX_CANDS: 18,
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
  hoa_monthly?: number | null; hoa_currency?: string | null; tax_annual?: number | null; hoa_unknown?: boolean;
};
type Cand = { url: string; title: string; price: number | null; currency: string; beds: number | null; sqm: number | null; location: string; country: string | null; kind: "buy" | "rent"; image: string | null; provider: string; cb?: C.CbRow; lat?: number | null; lng?: number | null };
type Who = { user: string | null; ipHash: string; netHash: string; ipSrc: string };
type Work = { p: C.LiveQuery; q: string; lang: string; who: Who; t0: number; cands: Cand[]; i: number; median: number | null; median_from: string | null; country_medians: Record<string, number | null>; scan_medians?: Record<string, number | null>; budget: number; reviews: number; units: number; slices: number; note: string; provider: string; search_cost: number; done?: boolean };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (req.method === "GET") return await poll(new URL(req.url).searchParams.get("job") || "");
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.action === "work" || body.action === "regate" || body.action === "selftest") {
        if (!body.secret || body.secret !== (await secret())) return json({ error: "Forbidden" }, 403);
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
  const shown = all.filter(isShown);
  return json({ job_id: j.id, status: j.status, progress: j.progress, stage: j.stage, results: shown, found: all.length, hidden: all.length - shown.length, note: j.note, parsed: j.parsed });
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
  return { user, ipHash, netHash, ipSrc: viaProxy ? "proxy" : "direct" };
}

async function start(req: Request, body: any) {
  const q = String(body.q || "").replace(/\s+/g, " ").trim().slice(0, 300);
  const lang = body.lang === "es" ? "es" : "en";
  const who = await whoIs(req);
  const p = C.parseLiveQuery(q);
  const base = { q: q || "(empty)", lang, parsed: p, user_id: who.user, ip_hash: who.ipHash, usage: { ip_src: who.ipSrc, net: who.netHash } };
  const log = async (status: string, extra: Record<string, unknown> = {}) => {
    const { data } = await db.from("live_jobs").insert({ ...base, qkey: p.ok ? C.liveKey(p) : null, status, progress: 100, ...extra }).select("id").single();
    return data?.id as string | undefined;
  };
  if (!p.ok) { await log("rejected", { note: p.reason }); return json({ status: "rejected", reason: p.reason, parsed: p }); }
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
    db.from("live_jobs").select("id", { count: "exact", head: true }).eq("ip_hash", who.ipHash).in("status", real).gte("created_at", today),
    db.from("live_jobs").select("id", { count: "exact", head: true }).in("status", real).gte("created_at", today),
  ]);
  if ((mine || 0) >= LIMITS.IP_JOBS_PER_DAY || (all || 0) >= LIMITS.GLOBAL_JOBS_PER_DAY) {
    await log("capped", { note: (mine || 0) >= LIMITS.IP_JOBS_PER_DAY ? "ip_cap" : "global_cap" });
    return json({ status: "capped", note: "tomorrow", parsed: p });
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
async function spentToday(col: string | null, val: string | null) {
  let qy = db.from("live_jobs").select("cost_usd").gte("created_at", dayStart()).gt("cost_usd", 0).limit(5000);
  if (col && val) qy = qy.eq(col, val);
  const { data } = await qy; return (data || []).reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0);
}

async function begin(id: string, p: C.LiveQuery, q: string, lang: string, who: Who) {
  const t0 = Date.now();
  const results: Result[] = [];
  let cost = 0;
  const set = (patch: Record<string, unknown>) => db.from("live_jobs").update({ ...patch, results, cost_usd: cost, updated_at: new Date().toISOString() }).eq("id", id);
  await set({ status: "running", progress: 5, stage: { k: "parsed" } });

  // 1. our own data first
  await set({ progress: 8, stage: { k: "ours" } });
  const rows = await approved();
  const now = new Date().toISOString();
  if (p.kind === "buy") {
    for (const r of rows) {
      if ((Number(r.nota) || 0) < C.SHOW_MIN) continue;
      if (!C.fits({ kind: "buy", country: r.country, place: `${r.location_name || ""}, ${r.country || ""}`, price_eur: Number(r.price_eur) || null, beds: r.bedrooms ?? null }, p)) continue;
      results.push({
        id: "rh-" + r.slug, source: "realhunt", provider: "realhunt", url: "https://realhunt.co/deal/" + r.slug, deal_slug: r.slug, deal_id: r.id, title: r.title, price: Number(r.price_eur) || null, currency: "EUR",
        price_eur: Number(r.price_eur) || null, beds: r.bedrooms ?? null, sqm: r.sqm ?? null, location: r.location_name || "", country: r.country, kind: "buy", image: abs(r.image_urls?.[0] || "") || null,
        image_urls: (r.image_urls || []).slice(0, 3).map(abs), photos: r.image_urls?.length ?? null, score: Number(r.nota), found_at: r.approved_at || now, show: true, why_cheap: r.why_cheap || null, flags: r.ai_flags || [], ai_checked_at: r.ai_checked ? r.ai_checked_at : null,
      });
    }
  }
  // finds earlier live searches checked and published (v2 only: shown = true)
  const { data: earlierAll } = await db.from("live_listings").select("url,kind,country,place,price_eur,beds,sqm,score,data,deal_slug,first_seen")
    .eq("kind", p.kind).eq("shown", true).gte("last_seen", new Date(Date.now() - LIMITS.REUSE_DAYS * 86400_000).toISOString()).order("score", { ascending: false }).limit(400);
  const earlier = (earlierAll || []).filter((x: any) => (!p.country || !x.country || x.country === p.country) && C.fits({ kind: x.kind, country: x.country, place: x.place, price_eur: x.price_eur, beds: x.beds }, p));
  const slugs = earlier.map((l: any) => l.deal_slug).filter(Boolean);
  const live = new Set<string>();
  if (slugs.length) { const { data } = await db.from("community_deals").select("slug").in("slug", slugs).eq("status", "approved"); for (const d of data || []) live.add(d.slug); }
  for (const l of earlier) {
    if (l.kind === "buy" && (!l.deal_slug || !live.has(l.deal_slug))) continue; // rejected by a person since
    if (l.deal_slug && results.some((r) => r.deal_slug === l.deal_slug)) continue;
    results.push({ ...(l.data as Result), source: "earlier", score: l.score, show: true });
  }
  results.sort((a, b) => b.score - a.score);
  if (results.length >= LIMITS.REUSE_ENOUGH) {
    results.splice(8);
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
  if (p.city && p.state) {
    await set({ progress: 15, stage: { k: "searching_cb" } });
    const pages = await Promise.all(C.cbSearchUrls(p, 5).map((u) => cand({ action: "scan", url: u, rx: C.CB_RX }, 45000)));
    const scanned = pages.flatMap((r: any) => (Array.isArray(r?.matches) ? r.matches : [])).map(C.parseCbMatch).filter(Boolean) as C.CbRow[];
    const clean = scanned.filter((r) => r.status === "ACTIVE" && !/land|lot|manufactured|mobile/i.test(r.type));
    scanPpm = C.cbPpm(clean);
    scanMedians = C.cbGroupMedians(clean);
    for (const r of C.pickCb(scanned, p, 14)) {
      cands.push({ url: r.url, title: "", price: r.price, currency: "USD", beds: r.beds, sqm: r.sqft ? Math.round(r.sqft * 0.092903) : null, location: r.address, country: "United States", kind: p.kind, image: r.photo, provider: "coldwellbanker", cb: r, lat: r.lat, lng: r.lng });
    }
    if (cands.length) provider = "coldwellbanker";
    await set({ progress: 22, stage: { k: "found", n: cands.length } });
  }

  // 3. the web: Claude with web search, within the caps (for US cities only when the free source found too few)
  const [mine, all] = await Promise.all([who.user ? spentToday("user_id", who.user) : spentToday("ip_hash", who.ipHash), spentToday(null, null)]);
  const budget = Math.max(0, Math.min(LIMITS.USER_USD_PER_DAY - mine, LIMITS.GLOBAL_USD_PER_DAY - all));
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) note = "no_key";
  else if (cands.length >= 6) { /* enough readable listings: no need to pay for a web search */ }
  else if (budget < LIMITS.EST_CLAUDE_JOB_USD) note = mine + LIMITS.EST_CLAUDE_JOB_USD > LIMITS.USER_USD_PER_DAY ? "user_budget" : "global_budget";
  else {
    await set({ progress: 24, stage: { k: "searching" } });
    let prog = 24;
    const tick = setInterval(() => { prog = Math.min(42, prog + 1); set({ progress: prog, stage: { k: "searching" } }).then(() => {}, () => {}); }, 4000);
    try {
      const c = await claude(key, p, q, Math.max(1, 8 - results.length));
      cost = c.cost; usage = c.usage; provider = [provider, c.model].filter(Boolean).join("+");
      for (const it of c.items.filter((i) => C.withinAsk(i, p) && !C.blockedUrl(i.url))) if (!cands.some((x) => x.url === it.url)) cands.push({ ...it, image: it.image_url, provider: "claude" });
      if (c.error) note = "claude_" + c.error;
    } finally { clearInterval(tick); }
    await set({ progress: 44, stage: { k: "found", n: cands.length }, usage: { ...(usage || {}), model: provider, ip_src: who.ipSrc, net: who.netHash } });
  }

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

  const work: Work = { p, q, lang, who, t0, cands: cands.slice(0, LIMITS.MAX_CANDS), i: 0, median: m.ppm, median_from: m.from, country_medians, scan_medians: scanMedians, budget: Math.max(0, budget - cost), reviews: 0, units: 0, slices: 0, note, provider, search_cost: cost };
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
  const shownCount = () => results.filter(isShown).length;
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
  results.sort((a, b) => Number(isShown(b)) - Number(isShown(a)) || b.score - a.score);
  const good = results.filter(isShown).length;
  w.done = true;
  const reviewCost = Math.round((cost - w.search_cost) * 1e5) / 1e5;
  await set({
    status: "done", progress: 100, stage: { k: "done", n: good, of: results.length }, provider: w.provider || "ours",
    note: good ? w.note || null : "none_80" + (w.note ? ":" + w.note : ""),
    usage: { ...(j.usage || {}), reviews: w.reviews, review_cost: reviewCost, search_cost: w.search_cost, slices: w.slices, median_from: w.median_from, ms: Date.now() - w.t0 },
  });
  // fill the new homes' sub-scores now (the hourly cron does it too), so their pages show a full score
  if (results.some((r) => r.source === "web" && r.deal_slug && isShown(r))) await db.rpc("community_dims_fill").then(() => {}, () => {});
}

const sourceKey = (u: string) => String(u).replace(/^https?:\/\/(www\.)?/, "").split("#")[0].replace(/\/+$/, "").toLowerCase();

async function checkOne(c: Cand, w: Work, results: Result[], spend: (usd: number) => void, step: (k: string) => PromiseLike<unknown>) {
  const p = w.p;
  const [x, factsRaw] = await Promise.all([cand({ action: "extract", url: c.url }, 25000), c.cb ? cand({ action: "scan", url: c.url, rx: C.CB_FACTS_RX }, 25000) : Promise.resolve(null)]);
  await step("reading");
  const okPage = x && !x.error;
  const facts = c.cb ? C.parseCbFacts(factsRaw?.matches) : null;
  let photos: string[] = [];
  if (c.cb) photos = C.cbPhotos(okPage ? x.images || [] : [], c.cb.photo);
  else if (okPage) photos = (x.images || []).filter((u: string) => /^https:\/\//.test(u));
  const price = c.price ?? (okPage ? x.price : null);
  const currency = c.price != null ? c.currency : (okPage && x.currency) || c.currency;
  const price_eur = C.toEur(price, currency);
  const beds = c.beds ?? (okPage ? x.bedrooms : null);
  const baths = c.cb?.baths ?? facts?.baths ?? null;
  const sqm = c.sqm ?? (okPage && !c.cb ? x.sqm : null);
  const lat = c.lat ?? (okPage ? x.lat : null), lng = c.lng ?? (okPage && !c.cb ? x.lng : null);
  const desc = (facts?.remarks || (okPage ? String(x.description || "") : "")).slice(0, 3000);
  const cityName = c.cb ? (c.cb.path.split("/")[2] || "").replace(/-/g, " ") : "";
  const stateName = p.state ? C.US_STATES[p.state] : "";
  const tc = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (m) => m.toUpperCase());
  const location = c.cb ? [facts?.subdivision, tc(cityName), tc(stateName)].filter(Boolean).join(", ") : c.location || (okPage && x.locality) || "";
  const country = c.country || p.country;
  // the same kind of home in the same city first (a townhouse against townhouses), then the job's median
  const median = (c.cb && w.scan_medians?.[C.cbGroup(c.cb.type)]) || w.median || (country ? w.country_medians[country] ?? null : null);
  const ptype = c.cb?.type || (p.ptype !== "any" ? p.ptype : "");
  const flags0 = C.textFlags([desc, c.title, facts?.text || "", facts?.style || "", facts?.body || ""].join(" "), { beds, baths, sqm });
  if (facts?.senior && !flags0.includes("age_restricted")) flags0.push("age_restricted");
  const base = { price_eur, sqm, photos: okPage ? photos.length : null, beds, lat, lng, desc_len: desc.length, kind: c.kind };
  const ctx = { median_ppm: median, min_beds: p.min_beds };
  const best = C.liveScore({ ...base, photo_quality: 10, flags: flags0.filter((f) => !(C.FLAG_PENALTY[f] > 0)), why_cheap: "if explained" }, ctx);
  const pre = C.liveScore({ ...base, flags: flags0 }, ctx);

  // an existing home for this listing (a person may have approved or rejected it already)
  const slug = C.slugFor(c.url, c.cb ? { city: cityName, address: c.cb.address, price } : {});
  let existing: any = null;
  if (c.kind === "buy") {
    const sel = "id,slug,status,image_urls,ai_checked,ai_checked_at,title,why_great,why_cheap,ai_flags";
    existing = (await db.from("community_deals").select(sel).eq("source_key", sourceKey(c.url)).maybeSingle()).data || (await db.from("community_deals").select(sel).eq("slug", slug).maybeSingle()).data;
  }

  let review: C.Review | null = null; let reviewed = 0; let skip = "";
  if (existing?.status === "rejected") skip = "rejected_before";
  else if (existing?.status === "approved") skip = "already_live";
  else if (!okPage && !c.cb) skip = "unreadable";
  else if (photos.length < 4 && !(existing?.image_urls?.length >= 4)) skip = "few_photos";
  else if (best.score < C.SHOW_MIN) skip = "cannot_reach_80";
  else if (w.reviews >= LIMITS.MAX_REVIEWS) skip = "review_cap";
  else if (w.budget < LIMITS.EST_REVIEW_USD) skip = "budget";
  const pics = existing?.status === "pending" && existing.image_urls?.length >= 4 ? existing.image_urls : photos;
  if (!skip) {
    w.reviews++;
    await step("reviewing");
    const rv = await aiReview(pics.slice(0, 6), { kind: c.kind, price, currency, price_eur, beds, baths, sqm, ptype, location: c.cb ? `${c.cb.address}` : location, country, ratio: pre.parts.ratio, text: desc, facts: facts ? facts.text : "" });
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
  const isCondo = /condo|co-?op|apartment|townhouse/i.test(ptype);
  const hoa = review?.hoa_monthly ?? facts?.hoa ?? null;
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
    show: gate.show, reasons: gate.reasons, photo_quality: review?.photo_quality ?? null, flags: soft, why_cheap, why_great: review?.why_great || null,
    ai_checked_at: review ? new Date().toISOString() : existing?.ai_checked_at || null, hoa_monthly: hoa, hoa_currency: hoa || tax ? currency : null, tax_annual: tax, hoa_unknown: isCondo && !hoa,
  };

  // homes to buy: a full RealHunt home page. New ones are imported (photos copied in the best order) and published
  // as AI-checked; an earlier pending import of the same listing is updated and published; a live one is linked.
  if (r.kind === "buy" && r.show) {
    await step("publishing");
    if (existing?.status === "approved") {
      Object.assign(r, { deal_slug: existing.slug, deal_id: existing.id, title: existing.title, image: abs(existing.image_urls?.[0] || "") || r.image, image_urls: (existing.image_urls || []).slice(0, 3), why_cheap: existing.why_cheap ?? r.why_cheap, flags: existing.ai_flags || r.flags, ai_checked_at: existing.ai_checked ? existing.ai_checked_at : null });
    } else if (r.country && price_eur) {
      const aiCols = { status: "approved", ai_checked: true, ai_checked_at: r.ai_checked_at, why_cheap: r.why_cheap, ai_flags: soft.length ? soft : null, hoa_monthly: hoa, hoa_currency: r.hoa_currency, tax_annual: tax, hoa_unknown: !!r.hoa_unknown, costs_note, reject_reason: null };
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
        body: JSON.stringify({ model, max_tokens: 900, messages: [{ role: "user", content }] }),
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
        await db.from("community_deals").update({ status: "approved", ai_checked: true, ai_checked_at: new Date().toISOString(), title: rv.review.title, why_great: rv.review.why_great || d.why_great, why_cheap: rv.review.why_cheap, ai_flags: soft.length ? soft : null, image_urls: ordered, reject_reason: null }).eq("id", d.id);
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
async function claude(key: string, p: C.LiveQuery, q: string, want: number): Promise<{ items: C.LiveItem[]; cost: number; usage: any; model: string; error?: string }> {
  const wants = [
    p.kind === "rent" ? "to rent" : "to buy",
    p.ptype !== "any" ? (p.ptype === "apartment" ? "an apartment / flat / condo" : "a house") : "any home (house or apartment)",
    `in ${[p.place || p.city, p.state?.toUpperCase(), p.country].filter(Boolean).join(", ")}`,
    p.min_beds ? `at least ${p.min_beds} bedrooms` : "",
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
