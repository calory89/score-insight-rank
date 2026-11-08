// realhunt-live-search (8-nov-2026): searches the web for homes to buy or rent while the person waits.
//   POST {q, lang}  -> {job_id, parsed}   (or {status:"rejected"|"need_login"|"capped", ...})
//   GET  ?job=<id>  -> {status, progress 0-100, stage, results[], hidden, note, parsed}
// Order of work, cheapest first:
//   1. our own data: approved RealHunt homes (score >= 80) and listings earlier live searches found (last 30 days,
//      provisional score >= 80). With 6 or more good matches it answers from them and spends nothing.
//   2. Claude with the web search tool (ANTHROPIC_API_KEY; model ANTHROPIC_MODEL, default claude-haiku-4-5), within
//      the spending caps below. Cost per job (tokens at the model's price + $10 per 1,000 searches) is saved per job.
//   3. Coldwell Banker (free) for US cities, as fallback or to fill up.
// Every search is saved in realhunt.live_jobs and every listing found in realhunt.live_listings (also the ones under
// 80, which are not shown). Homes to buy that reach 80 go to the human review queue (/hunt/admin) as 'pending'
// through realhunt-candidates "import"; nothing is ever approved here.
// Who: signed-in people by user id (Supabase JWT, verified). Without an account, one free search per IP (salted hash).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as C from "./core.ts";

export const LIMITS = {
  ANON_FREE_SEARCHES: 1, // searches without an account, per IP hash
  NET_ANON_PER_DAY: 60, // anonymous jobs per network address per UTC day (see whoIs)
  IP_JOBS_PER_DAY: 8, // new jobs per IP hash per UTC day (signed in or not)
  GLOBAL_JOBS_PER_DAY: 300,
  USER_USD_PER_DAY: 1, // Claude spend per user (or per IP hash without an account) per UTC day
  GLOBAL_USD_PER_DAY: 30,
  EST_CLAUDE_JOB_USD: 0.15, // what one Claude job may cost, checked against the caps before calling
  REUSE_ENOUGH: 6, // good matches we must already have to skip the web
  REUSE_DAYS: 30,
  CACHE_HOURS: 24,
  DEADLINE_MS: 140_000, // background work stops here and the job finishes with what it has
  STALE_MS: 240_000, // a running job not updated for this long is marked as failed
};
const MODELS = [Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-4-5", "claude-sonnet-4-5"].filter((m, i, a) => a.indexOf(m) === i);
const SUPA = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPA, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { db: { schema: "realhunt" }, auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const dayStart = () => new Date().toISOString().slice(0, 10) + "T00:00:00Z";

let secretP: Promise<string> | null = null;
const secret = () => (secretP ||= db.from("app_secrets").select("value").eq("key", "rh_check_secret").maybeSingle().then(({ data }) => String(data?.value || "")));
async function sha(s: string) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }

async function cand(body: Record<string, unknown>, timeout = 60000): Promise<any> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
  try {
    const r = await fetch(`${SUPA}/functions/v1/realhunt-candidates`, { method: "POST", signal: c.signal, headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` }, body: JSON.stringify({ ...body, secret: await secret() }) });
    return await r.json().catch(() => ({ error: "bad json" }));
  } catch (e) { return { error: String(e) }; } finally { clearTimeout(t); }
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

// ---------------------------------------------------------------- results
type Result = {
  id: string; source: "realhunt" | "earlier" | "web"; provider: string; url: string; deal_slug: string | null; title: string; price: number | null; currency: string;
  price_eur: number | null; beds: number | null; sqm: number | null; location: string; country: string | null; kind: "buy" | "rent"; image: string | null; photos: number | null;
  score: number; parts?: Record<string, number>; found_at: string;
};
type Stage = { k: string; n?: number; of?: number };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (req.method === "GET") return await poll(new URL(req.url).searchParams.get("job") || "");
    if (req.method === "POST") return await start(req);
    return json({ error: "GET or POST" }, 405);
  } catch (e) {
    console.error("live-search", e);
    return json({ status: "error", note: "server" }, 500);
  }
});

async function poll(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return json({ error: "bad job" }, 400);
  const { data: j } = await db.from("live_jobs").select("id,status,progress,stage,results,note,parsed,updated_at,provider").eq("id", id).maybeSingle();
  if (!j) return json({ error: "not found" }, 404);
  if ((j.status === "running" || j.status === "queued") && Date.now() - Date.parse(j.updated_at) > LIMITS.STALE_MS) {
    await db.from("live_jobs").update({ status: "error", note: "timeout", updated_at: new Date().toISOString() }).eq("id", id);
    j.status = "error"; j.note = "timeout";
  }
  const all: Result[] = Array.isArray(j.results) ? j.results : [];
  const shown = all.filter((r) => r.score >= C.SHOW_MIN);
  return json({ job_id: j.id, status: j.status, progress: j.progress, stage: j.stage, results: shown, found: all.length, hidden: all.length - shown.length, note: j.note, parsed: j.parsed });
}

// The client IP: realhunt.co's own proxy (/__sb) sends it as x-jm-client-ip (there cf-connecting-ip is the
// proxy's); a direct call has it in cf-connecting-ip, which Cloudflare sets and callers cannot fake. x-jm-client-ip
// could be faked on a direct call, so anonymous searches are also capped per network address (netHash).
async function whoIs(req: Request): Promise<{ user: string | null; ipHash: string; netHash: string; ipSrc: string }> {
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

async function start(req: Request) {
  const body = await req.json().catch(() => ({}));
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

  // without an account: the first search is free, then sign in
  if (!who.user) {
    const { count } = await db.from("live_jobs").select("id", { count: "exact", head: true }).eq("ip_hash", who.ipHash).is("user_id", null).in("status", ["queued", "running", "done", "error", "cached", "capped"]);
    const { count: netCount } = await db.from("live_jobs").select("id", { count: "exact", head: true }).eq("usage->>net", who.netHash).is("user_id", null).in("status", ["queued", "running", "done", "error"]).gte("created_at", dayStart());
    if ((count || 0) >= LIMITS.ANON_FREE_SEARCHES || (netCount || 0) >= LIMITS.NET_ANON_PER_DAY) { await log("need_login"); return json({ status: "need_login", parsed: p }); }
  }
  // the same search in the last 24 h: reuse it
  const since = new Date(Date.now() - LIMITS.CACHE_HOURS * 3600_000).toISOString();
  const { data: hit } = await db.from("live_jobs").select("id").eq("qkey", key).in("status", ["queued", "running", "done"]).gte("created_at", since).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (hit) { await log("cached", { ref_job: hit.id, note: "cached" }); return json({ job_id: hit.id, cached: true, parsed: p }); }
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
  const work = run(job.id, p, q, lang, who).catch(async (e) => {
    console.error("live-search run", e);
    await db.from("live_jobs").update({ status: "error", note: "failed", updated_at: new Date().toISOString() }).eq("id", job.id);
  });
  // deno-lint-ignore no-explicit-any
  (globalThis as any).EdgeRuntime?.waitUntil ? (globalThis as any).EdgeRuntime.waitUntil(work) : await work;
  return json({ job_id: job.id, parsed: p });
}

// ---------------------------------------------------------------- the job
async function run(id: string, p: C.LiveQuery, q: string, lang: string, who: { user: string | null; ipHash: string; netHash: string; ipSrc: string }) {
  const t0 = Date.now();
  const late = () => Date.now() - t0 > LIMITS.DEADLINE_MS;
  const results: Result[] = [];
  let cost = 0; let usage: any = null; let provider = "";
  const set = (patch: Record<string, unknown>) => db.from("live_jobs").update({ ...patch, results, cost_usd: cost, updated_at: new Date().toISOString() }).eq("id", id);
  await set({ status: "running", progress: 5, stage: { k: "parsed" } });

  // 1. our own data first
  await set({ progress: 10, stage: { k: "ours" } });
  const rows = await approved();
  const now = new Date().toISOString();
  if (p.kind === "buy") {
    for (const r of rows) {
      if ((Number(r.nota) || 0) < C.SHOW_MIN) continue;
      if (!C.fits({ kind: "buy", country: r.country, place: `${r.location_name || ""}, ${r.country || ""}`, price_eur: Number(r.price_eur) || null, beds: r.bedrooms ?? null }, p)) continue;
      results.push({ id: "rh-" + r.slug, source: "realhunt", provider: "realhunt", url: "https://realhunt.co/deal/" + r.slug, deal_slug: r.slug, title: r.title, price: Number(r.price_eur) || null, currency: "EUR", price_eur: Number(r.price_eur) || null, beds: r.bedrooms ?? null, sqm: r.sqm ?? null, location: r.location_name || "", country: r.country, kind: "buy", image: abs(r.image_urls?.[0] || "") || null, photos: r.image_urls?.length ?? null, score: Number(r.nota), found_at: r.approved_at || now });
    }
  }
  const { data: earlierAll } = await db.from("live_listings").select("url,kind,country,place,price_eur,beds,sqm,score,data,deal_slug,first_seen")
    .eq("kind", p.kind).gte("score", C.SHOW_MIN).gte("last_seen", new Date(Date.now() - LIMITS.REUSE_DAYS * 86400_000).toISOString()).order("score", { ascending: false }).limit(400);
  const earlier = (earlierAll || []).filter((x: any) => !p.country || !x.country || x.country === p.country);
  for (const l of earlier || []) {
    if (!C.fits({ kind: l.kind, country: l.country, place: l.place, price_eur: l.price_eur, beds: l.beds }, p)) continue;
    if (l.deal_slug && results.some((r) => r.deal_slug === l.deal_slug)) continue;
    results.push({ ...(l.data as Result), source: "earlier", score: l.score });
  }
  results.sort((a, b) => b.score - a.score);
  if (results.length >= LIMITS.REUSE_ENOUGH) {
    results.splice(8);
    await set({ status: "done", progress: 100, stage: { k: "done" }, note: "from_earlier", provider: "ours" });
    return;
  }
  await set({ progress: 14, stage: { k: "ours_some", n: results.length } });

  // 2. the web: Claude, within the caps
  type Cand = { url: string; title: string; price: number | null; currency: string; beds: number | null; sqm: number | null; location: string; country: string | null; kind: "buy" | "rent"; image: string | null; provider: string; cb?: C.CbRow; lat?: number | null; lng?: number | null };
  const cands: Cand[] = [];
  let note = "";
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (key) {
    const today = dayStart();
    const spent = async (col: string | null, val: string | null) => {
      let qy = db.from("live_jobs").select("cost_usd").gte("created_at", today).gt("cost_usd", 0).limit(5000);
      if (col && val) qy = qy.eq(col, val);
      const { data } = await qy; return (data || []).reduce((s: number, r: any) => s + Number(r.cost_usd || 0), 0);
    };
    const [mine, all] = await Promise.all([who.user ? spent("user_id", who.user) : spent("ip_hash", who.ipHash), spent(null, null)]);
    if (mine + LIMITS.EST_CLAUDE_JOB_USD > LIMITS.USER_USD_PER_DAY) note = "user_budget";
    else if (all + LIMITS.EST_CLAUDE_JOB_USD > LIMITS.GLOBAL_USD_PER_DAY) note = "global_budget";
    else {
      await set({ progress: 15, stage: { k: "searching" } });
      let prog = 15;
      const tick = setInterval(() => { prog = Math.min(44, prog + 2); set({ progress: prog, stage: { k: "searching" } }).then(() => {}, () => {}); }, 4000);
      try {
        const c = await claude(key, p, q, lang, Math.max(1, 8 - results.length));
        cost = c.cost; usage = c.usage; provider = c.model || "";
        for (const it of c.items.filter((i) => C.withinAsk(i, p))) cands.push({ ...it, image: it.image_url, provider: "claude" });
        if (c.error) note = "claude_" + c.error;
      } finally { clearInterval(tick); }
      await set({ progress: 45, stage: { k: "found", n: cands.length }, usage: { ...(usage || {}), model: provider, ip_src: who.ipSrc, net: who.netHash } });
    }
  } else note = "no_key";

  // 3. Coldwell Banker for US cities (free): fallback, or to fill up
  if (!late() && p.city && p.state && cands.length < 8) {
    await set({ progress: Math.max(20, cands.length ? 46 : 20), stage: { k: "searching_cb" } });
    const pages = await Promise.all(C.cbSearchUrls(p, 5).map((u) => cand({ action: "scan", url: u, rx: C.CB_RX }, 45000)));
    const cb = C.pickCb(pages.flatMap((r: any) => (Array.isArray(r?.matches) ? r.matches : [])).map(C.parseCbMatch).filter(Boolean) as C.CbRow[], p, 16);
    for (const r of cb) {
      if (cands.some((c) => c.url === r.url)) continue;
      cands.push({ url: r.url, title: "", price: r.price, currency: "USD", beds: r.beds, sqm: r.sqft ? Math.round(r.sqft * 0.092903) : null, location: r.address, country: "United States", kind: p.kind, image: r.photo, provider: "coldwellbanker", cb: r, lat: r.lat, lng: r.lng });
    }
    provider = provider ? provider + "+coldwellbanker" : "coldwellbanker";
    await set({ progress: 45, stage: { k: "found", n: cands.length } });
  }

  // medians for the value part of the score
  const ppm = (price_eur: number | null, sqm: number | null) => (price_eur && sqm && sqm >= 15 ? price_eur / sqm : 0);
  const medians = new Map<string, number | null>();
  const medianFor = (country: string | null) => {
    if (p.kind !== "buy" || !country) return null;
    if (!medians.has(country)) medians.set(country, C.median(rows.filter((r) => r.country === country).map((r) => ppm(Number(r.price_eur) || null, Number(r.sqm) || null))));
    return medians.get(country) ?? null;
  };
  const countryMedian = medianFor(p.country);
  let localMedian: number | null = null;
  if (!countryMedian) {
    const { data: prev } = await db.from("live_listings").select("price_eur,sqm,place").eq("kind", p.kind).gte("last_seen", new Date(Date.now() - 90 * 86400_000).toISOString()).limit(1000);
    const want = (p.city || p.place || "").toLowerCase();
    const vals = [...(prev || []).filter((x: any) => !want || String(x.place || "").toLowerCase().includes(want)).map((x: any) => ppm(Number(x.price_eur), Number(x.sqm))),
      ...cands.map((c) => ppm(C.toEur(c.price, c.currency), c.sqm))].filter((v) => v > 0);
    localMedian = vals.length >= 4 ? C.median(vals) : null;
  }
  const medianPpm = countryMedian || localMedian;

  // 4. check each listing: read the page, score, save, send good homes to the review queue
  const todo = cands.slice(0, 16);
  let done = 0; let shown = results.filter((r) => r.score >= C.SHOW_MIN).length;
  const checkOne = async (c: Cand) => {
    if (late() || shown >= 12) return;
    const [x, facts] = await Promise.all([cand({ action: "extract", url: c.url }, 30000), c.cb ? cand({ action: "scan", url: c.url, rx: C.CB_FACTS_RX }, 30000) : Promise.resolve(null)]);
    const okPage = x && !x.error;
    let photos: string[] = [];
    if (c.cb) photos = C.cbPhotos(okPage ? x.images || [] : [], c.cb.photo);
    else if (okPage) photos = (x.images || []).filter((u: string) => /^https:\/\//.test(u));
    const price = c.price ?? (okPage ? x.price : null);
    const currency = c.price != null ? c.currency : (okPage && x.currency) || c.currency;
    const price_eur = C.toEur(price, currency);
    const beds = c.beds ?? (okPage ? x.bedrooms : null);
    const sqm = c.sqm ?? (okPage && !c.cb ? x.sqm : null);
    const lat = c.lat ?? (okPage ? x.lat : null), lng = c.lng ?? (okPage && !c.cb ? x.lng : null);
    const desc = okPage ? String(x.description || "") : "";
    const sc = C.liveScore({ price_eur, sqm, photos: okPage ? photos.length : null, beds, lat, lng, desc_len: desc.length, kind: c.kind }, { median_ppm: medianFor(c.country || p.country) || medianPpm, min_beds: p.min_beds });
    if (C.AGE_RESTRICTED.test([desc, c.title, ...(Array.isArray(facts?.matches) ? facts.matches : [])].join(" "))) { sc.score = Math.min(sc.score, C.SHOW_MIN - 1); (sc.parts as any).age_restricted = 1; }
    const cityName = c.cb ? (c.cb.path.split("/")[2] || "").replace(/-/g, " ") : "";
    const stateName = p.state ? C.US_STATES[p.state] : "";
    const titleCase = (s: string) => s.replace(/\b[a-z]/g, (m) => m.toUpperCase());
    const title = c.title || (c.cb ? `${beds ? beds + "-bed " : ""}${(c.cb.type || "home").toLowerCase()} in ${titleCase(cityName)}, ${titleCase(stateName)}` : (okPage && x.title) || "Home");
    const location = c.cb ? `${c.cb.address.split(",")[0]}, ${titleCase(cityName)}, ${titleCase(stateName)}` : c.location || (okPage && x.locality) || "";
    const r: Result = {
      id: "web-" + (await sha(c.url)).slice(0, 12), source: "web", provider: c.provider, url: c.url, deal_slug: null, title: title.slice(0, 160), price, currency, price_eur, beds, sqm,
      location, country: c.country || p.country, kind: c.kind, image: photos[0] || c.image || null, photos: okPage ? photos.length : null, score: sc.score, parts: sc.parts, found_at: new Date().toISOString(),
    };
    // homes to buy that reach the bar go to the human review queue (pending, never approved here)
    if (r.kind === "buy" && r.score >= C.SHOW_MIN && r.country && price_eur && photos.length >= 4) {
      const slug = C.slugFor(c.url, c.cb ? { city: cityName, address: c.cb.address, price } : {});
      const imp = await cand({ action: "import", deal: { slug, title: r.title, source_url: c.url, price_eur: Math.round(price_eur / 100) * 100, country: r.country, location_name: location, sqm, bedrooms: beds, category: "city", why_great: desc.slice(0, 400) || r.title, images: photos.slice(0, 12), lat, lng } }, 90000);
      const s = imp?.deal?.slug || imp?.duplicate?.slug || null;
      if (s) {
        r.deal_slug = s;
        const { data: d } = await db.from("community_deals").select("image_urls,status").eq("slug", s).maybeSingle();
        if (d?.image_urls?.[0]) r.image = d.image_urls[0];
      }
    }
    await db.from("live_listings").upsert({ url: c.url, kind: c.kind, q, qkey: C.liveKey(p), country: r.country, place: `${location}, ${c.country || ""}`.slice(0, 300), price_eur, beds, sqm, data: { ...r, source: "earlier" }, score: r.score, last_seen: new Date().toISOString(), deal_slug: r.deal_slug }, { onConflict: "url" });
    results.push(r);
    if (r.score >= C.SHOW_MIN) shown++;
    done++;
    await set({ progress: Math.min(95, 45 + Math.round((done / Math.max(todo.length, 1)) * 50)), stage: { k: "checking", n: done, of: todo.length } });
  };
  for (let i = 0; i < todo.length && !late(); i += 4) await Promise.all(todo.slice(i, i + 4).map((c) => checkOne(c).catch((e) => console.error("check", c.url, e))));

  results.sort((a, b) => b.score - a.score);
  const good = results.filter((r) => r.score >= C.SHOW_MIN).length;
  await set({ status: "done", progress: 100, stage: { k: "done", n: good, of: results.length }, provider: provider || "ours", note: good ? note || null : "none_80" + (note ? ":" + note : ""), usage: { ...(usage || {}), model: provider, ip_src: who.ipSrc, net: who.netHash } });
}

// ---------------------------------------------------------------- Claude with web search
async function claude(key: string, p: C.LiveQuery, q: string, lang: string, want: number): Promise<{ items: C.LiveItem[]; cost: number; usage: any; model: string; error?: string }> {
  const wants = [
    p.kind === "rent" ? "to rent" : "to buy",
    p.ptype !== "any" ? (p.ptype === "apartment" ? "an apartment / flat / condo" : "a house") : "any home (house or apartment)",
    `in ${[p.place || p.city, p.state?.toUpperCase(), p.country].filter(Boolean).join(", ")}`,
    p.min_beds ? `at least ${p.min_beds} bedrooms` : "",
    p.max_price ? `price at most ${p.max_price} ${p.currency}${p.kind === "rent" ? " per month" : ""}` : "",
    p.min_price ? `price at least ${p.min_price} ${p.currency}` : "",
  ].filter(Boolean).join("; ");
  const system = "You find real estate listings for RealHunt. Use the web_search tool to find CURRENT individual property listings (one home per page, " +
    "not search result pages, not news, not blogs) on real estate portals or agency websites. Never invent a listing, a price or a URL: every url you return " +
    "must be exactly a URL that appeared in your web search results. If you are not sure a listing is current or matches, leave it out. " +
    "Reply with ONLY a JSON array, no prose, no code fences: " +
    '[{"url":"","title":"","price":0,"currency":"USD","beds":0,"sqm":0,"location":"town, region","country":"country name in English","kind":"buy","image_url":""}]. ' +
    "price is a number in the listing currency (monthly rent for rentals), sqm is the living area in square metres (convert from sq ft by multiplying by 0.0929), " +
    "kind is \"buy\" or \"rent\", image_url only if it appeared in the results. Use null for anything the results do not say. Return [] if nothing fits.";
  const user = `The person searched: "${q}"\nWhat they want: ${wants}.\nFind up to ${Math.min(8, want + 2)} matching listings.`;
  let lastErr = "";
  for (const model of MODELS) {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), 100_000);
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", signal: c.signal,
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model, max_tokens: 2000, system, messages: [{ role: "user", content: user }], tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 404 || d?.error?.type === "not_found_error") { lastErr = "model"; continue; }
      if (!r.ok) { console.error("claude", r.status, d?.error?.type, d?.error?.message); return { items: [], cost: C.jobCost(model, d?.usage), usage: d?.usage || null, model, error: "http_" + r.status }; }
      const blocks: any[] = Array.isArray(d.content) ? d.content : [];
      const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const urls = blocks.filter((b) => b.type === "web_search_tool_result" && Array.isArray(b.content)).flatMap((b) => b.content.map((x: any) => x.url)).filter(Boolean);
      const items = C.parseClaudeListings(text, urls, p.kind);
      return { items, cost: C.jobCost(model, d.usage), usage: { ...d.usage, result_urls: urls.length, items_raw: (text.match(/"url"/g) || []).length, kept: items.length, text_head: text.slice(0, 1200), url_sample: urls.slice(0, 12) }, model };
    } catch (e) { lastErr = String(e).slice(0, 60); } finally { clearTimeout(t); }
  }
  return { items: [], cost: 0, usage: null, model: "", error: lastErr || "failed" };
}
