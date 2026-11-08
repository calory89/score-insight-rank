// STATIC MODE (17-oct-2026, Carlos: "que no gaste créditos, que sea estática").
// Lovable Cloud bills the database server for every hour it is awake, and every visit woke it with
// 6-8 queries (feed, filter counts, nearby, scores, session, flags, tracking). Now every public read
// comes from /data/rh-static.json (a snapshot of all published homes, regenerated whenever homes are
// added) and is filtered/sorted in the browser with the same rules as the SQL functions
// community_feed / community_quick_counts / community_near / community_nearby / community_scores.
// Visitor tracking writes are skipped. Only explicit actions (sign in, vote, save, submit, admin)
// still talk to the database, so the Cloud backend can stay paused and the site keeps working.
import { mediaDeep } from "./media";
import { wordMatches } from "./synonyms"; // FIND layer: "apartment" also finds flats and condos
import { supabase } from "@/integrations/supabase/client";

type Row = Record<string, any>;
type Snap = { v: number; generated: string; meta: Row; live: { live: number; today: number }; flags: Record<string, boolean>; rows: Row[] };

let snapP: Promise<Snap> | null = null;
export function snapshot(): Promise<Snap> {
  return (snapP ||= fetch("/data/rh-static.json", { cache: "no-cache" }).then((r) => {
    if (!r.ok) throw new Error("static data " + r.status);
    return r.json().then(mediaDeep);
  }).catch((e) => { snapP = null; throw e; }));
}

const now = () => Date.now();
const pub = (r: Row) => Date.parse(r.publish_at || r.approved_at || 0) || 0;
const visible = (r: Row) => !r.publish_at || pub(r) <= now();
const num = (v: any, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const has = (s: any, w: string) => String(s ?? "").toLowerCase().includes(w.toLowerCase());

function feed(snap: Snap, p: Row = {}) {
  const scope = p.scope || "week";
  const rk = (r: Row) => (scope === "week" ? num(r.wrank ?? r.rank) : num(r.rank));
  const country = p.country ? String(p.country).split(",") : null;
  const cat = p.category || null;
  const max = p.max_price ? num(p.max_price) : null;
  const minSqm = p.min_sqm ? num(p.min_sqm) : null;
  const minPrice = p.min_price ? num(p.min_price) : null;
  const minBeds = p.min_beds ? num(p.min_beds) : null;
  const dropped = !!p.price_drop;
  const ids: string[] | null = Array.isArray(p.ids) ? p.ids : null;
  const minScore = p.min_score ? num(p.min_score) : null;
  const need: string[] = Array.isArray(p.need) ? p.need : [];
  const dmin: Row = p.dim_min && typeof p.dim_min === "object" ? p.dim_min : {};
  const terms: string[] = Array.isArray(p.terms) ? p.terms : [];
  const q = String(p.q || "").trim().toLowerCase();
  const sort = p.sort || "rank";
  const limit = Math.min(Math.max(num(p.limit, 24) || 24, 1), 100);
  const offset = Math.max(num(p.offset, 0), 0);
  const all = snap.rows.filter(visible);
  let f = all.filter((e) =>
    (!country || country.includes(e.country)) &&
    (!cat || e.category === cat) &&
    (max == null || num(e.price_eur) <= max) &&
    (minSqm == null || num(e.sqm) >= minSqm) &&
    (minPrice == null || num(e.price_eur) >= minPrice) &&
    (minBeds == null || num(e.bedrooms) >= minBeds) &&
    (!dropped || num(e.price_drop) > 0) &&
    (!ids || ids.includes(e.id)) &&
    (minScore == null || num(e.nota) >= minScore) &&
    need.every((t) => Array.isArray(e.amen) && e.amen.includes(t)) &&
    Object.entries(dmin).every(([k, v]) => num(e.dims?.[k]) >= num(v)) &&
    terms.every((t) => has([e.title, e.location_name, e.why_great].join(" "), t)) &&
    (!q || q.split(" ").filter(Boolean).every((w) => wordMatches([e.title, e.location_name, e.country, e.category, e.why_great].join(" "), w))));
  // rh_fresh_boost_v1: in the default order every 4th card is a home published in the last 7 days
  const key = new Map<string, number>();
  if (sort === "rank") {
    const week = now() - 7 * 864e5;
    const byRank = [...f].sort((a, b) => rk(a) - rk(b));
    let nf = 0, no = 0;
    for (const e of byRank) {
      const fresh = !ids && pub(e) > week;
      if (fresh) { nf++; key.set(e.id, 4 * nf); } else { no++; key.set(e.id, no + Math.floor((no - 1) / 3)); }
    }
  }
  const cmp = (a: Row, b: Row) => {
    let d = 0;
    if (sort === "price_asc") d = num(a.price_eur) - num(b.price_eur);
    else if (sort === "price_desc") d = num(b.price_eur) - num(a.price_eur);
    else if (sort === "new") d = pub(b) - pub(a);
    else if (sort === "sqm") d = num(b.sqm) - num(a.sqm);
    else if (sort === "ppsqm") d = (num(a.sqm) > 0 ? num(a.price_eur) / num(a.sqm) : 1e9) - (num(b.sqm) > 0 ? num(b.price_eur) / num(b.sqm) : 1e9);
    else if (sort === "airport") d = num(a.airport_km, 99999) - num(b.airport_km, 99999);
    else if (sort === "score") d = num(b.nota) - num(a.nota);
    else if (String(sort).startsWith("dim:")) { const k = String(sort).slice(4); d = num(b.dims?.[k], -1) - num(a.dims?.[k], -1); }
    else if (sort === "rank") d = (key.get(a.id) ?? 0) - (key.get(b.id) ?? 0);
    return d || rk(a) - rk(b);
  };
  f = f.sort(cmp);
  const total = f.length;
  const rows = f.slice(offset, offset + limit).map((e) => ({ ...e, rank: rk(e) }));
  const countries_count: Record<string, number> = {};
  all.forEach((e) => { countries_count[e.country] = (countries_count[e.country] || 0) + 1; });
  const last = Math.max(0, ...all.map(pub));
  const meta = { ...snap.meta };
  delete meta.picks;
  return {
    ...meta, scope, rows, total, countries_count,
    new_today: all.filter((e) => pub(e) > now() - 864e5).length,
    last_added: last ? new Date(last).toISOString() : null,
    global_deals: all.length,
    countries: Object.keys(countries_count).sort(),
  };
}

function quickCounts(snap: Snap, p: Row = {}) {
  const base: Row = { ...(p || {}), limit: 1, scope: "all" };
  delete base.offset;
  const need: string[] = Array.isArray(base.need) ? base.need : [];
  const dm: Row = base.dim_min && typeof base.dim_min === "object" ? base.dim_min : {};
  const ms = base.min_score ? num(base.min_score) : 0;
  const chips: [string, Row][] = [["s85", { min_score: 85 }], ["water", { dim_min: { water: 70 } }], ["garden", { need: ["garden"] }], ["views", { need: ["views"] }], ["air", { dim_min: { access: 70 } }], ["big", { dim_min: { space: 70 } }], ["cheapbuy", { dim_min: { costs: 80 } }], ["sauna", { need: ["sauna"] }], ["pool", { need: ["pool"] }]];
  const out: Record<string, number> = {};
  for (const [k, f] of chips) {
    const pp: Row = { ...base };
    if (f.min_score) pp.min_score = Math.max(ms, f.min_score);
    if (f.need) pp.need = Array.from(new Set([...need, ...f.need]));
    if (f.dim_min) { const m: Row = { ...dm }; for (const [k2, v2] of Object.entries(f.dim_min)) m[k2] = Math.max(num(dm[k2]), num(v2)); pp.dim_min = m; }
    out[k] = feed(snap, pp).total;
  }
  return out;
}

function near(snap: Snap, p: Row = {}) {
  const la = Number(p.lat), lo = Number(p.lng);
  const n = Math.min(num(p.limit, 6) || 6, 12);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return { rows: [] };
  const rad = (x: number) => (x * Math.PI) / 180;
  const km = (r: Row) => Math.round(6371 * 2 * Math.asin(Math.sqrt(Math.sin(rad(r.lat - la) / 2) ** 2 + Math.cos(rad(la)) * Math.cos(rad(r.lat)) * Math.sin(rad(r.lng - lo) / 2) ** 2)));
  const d = snap.rows.filter((r) => visible(r) && r.lat != null && r.lng != null).map((r) => ({ r, k: km(r) })).sort((a, b) => a.k - b.k).slice(0, 30);
  if (!d.length) return { rows: [] };
  const kmBy = new Map(d.map((x) => [x.r.id, x.k]));
  const f = feed(snap, { scope: "all", sort: "score", limit: 30, ids: d.map((x) => x.r.id) }).rows;
  const rows = f.map((r: Row) => ({ ...r, km: kmBy.get(r.id) }))
    .sort((a: Row, b: Row) => (num(b.nota, 70) - 0.04 * num(b.km)) - (num(a.nota, 70) - 0.04 * num(a.km))).slice(0, n);
  return { rows, nearest_km: Math.min(...d.map((x) => x.k)) };
}

function scores(snap: Snap) {
  const m: Record<string, any> = {};
  snap.rows.forEach((r) => { m[r.id] = { n: r.nota, d: r.dims, a: r.amen || [], k: r.airport_km }; });
  return m;
}

function readToken() { try { return localStorage.getItem("rh_community_token") || null; } catch { return null; } }
function signedIn() {
  try { return Object.keys(localStorage).some((k) => /^sb-.*-auth-token$/.test(k) && !!localStorage.getItem(k)); } catch { return false; }
}

const ok = (data: any) => ({ data, error: null, count: null, status: 200, statusText: "OK" });
// A thenable that accepts any query-builder chain (.select().eq().single().abortSignal()...) and resolves `res`.
function chain(res: any): any {
  const p = Promise.resolve(res);
  const h: ProxyHandler<any> = {
    get(_t, k) {
      if (k === "then") return p.then.bind(p);
      if (k === "catch") return p.catch.bind(p);
      if (k === "finally") return p.finally.bind(p);
      return () => proxy;
    },
  };
  const proxy: any = new Proxy(function () {}, h);
  return proxy;
}

const READS: Record<string, (s: Snap, a: Row) => any> = {
  community_feed: (s, a) => feed(s, a?.p || {}),
  community_quick_counts: (s, a) => quickCounts(s, a?.p || {}),
  community_near: (s, a) => near(s, a?.p || {}),
  community_nearby: (s, a) => { const r = s.rows.find((x) => x.slug === a?.p_slug); return r ? (r.nearby || (r.lat != null ? { lat: r.lat, lng: r.lng, approx: false } : null)) : null; },
  community_scores: (s) => scores(s),
  community_rankings: (s, a) => feed(s, { scope: a?.p_scope || "week", country: a?.p_country || "", category: a?.p_category || "", limit: a?.p_limit || 24, offset: a?.p_offset || 0, sort: "rank_plain" }),
  rh_live_stats: (s) => [s.live || { live: 0, today: 0 }],
  community_availability_summary: () => null,
  community_similar: (s, a) => {
    const d = s.rows.find((x) => x.slug === a?.p_slug);
    if (!d) return [];
    const sea = (x: Row) => num(x.nearby?.sea_km, 99) < 2;
    const lp = (x: Row) => Math.abs(Math.log(Math.max(num(x.price_eur), 1) / Math.max(num(d.price_eur, num(x.price_eur)), 1)));
    return s.rows.filter((x) => x.slug !== d.slug && visible(x) && (x.image_urls || []).length && x.price_eur != null)
      .sort((x, y) => (+(y.country === d.country) - +(x.country === d.country)) || (+(sea(y) === sea(d)) - +(sea(x) === sea(d))) || (+(y.category === d.category) - +(x.category === d.category)) || (lp(x) - lp(y)))
      .slice(0, Math.min(num(a?.p_limit, 6), 12)).map((x) => { const e = { ...x }; delete e.dims; return e; });
  },
};
const SKIP_RPC = new Set(["record_telemetry", "rh_seen", "find_view_counts", "top_track"]);
const getJson = (u: string) => fetch(u, { cache: "force-cache" }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json().then(mediaDeep); });
let topListsP: Promise<Record<string, any>> | null = null;
// New-build Top 100 lists and project pages (snapshots in /data/top-lists.json and /data/top/<slug>.json).
const ASYNC_READS: Record<string, (a: Row) => Promise<any>> = {
  top_list: (a) => (topListsP ||= getJson("/data/top-lists.json")).then((l) => l[a?.p_dest] || []),
  top_project: (a) => /^[a-z0-9-]+$/.test(String(a?.p_slug || "")) ? getJson(`/data/top/${a.p_slug}.json`) : Promise.resolve(null),
};
const SKIP_TABLES: Record<string, any> = { page_visits: null, rh_events: null, experiments: [], feature_flags: null };
const SKIP_FUNCTIONS = new Set(["track-visit"]);

// ---------------------------------------------------------------------------------------------
// Offline mode for writes. The main database can be paused to save credits. When a write or a
// signed-in call cannot reach it, the site keeps working:
//  - session falls back to a guest session; votes and saves are kept in this browser;
//  - leads, submissions, comments, reports and newsletter/alert sign-ups go to a small inbox
//    table (insert-only, nobody can read it from the browser) so nothing is lost.
// ---------------------------------------------------------------------------------------------
const INBOX_URL = "https://gmdalfsvtfhzepyrdmjj.supabase.co/rest/v1/rh_inbox";
const INBOX_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtZGFsZnN2dGZoemVweXJkbWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2Mzc3MjIsImV4cCI6MjA1OTIxMzcyMn0.IIbXzmsRZzBeS6DhTHtYJjQNAFVJMaqb0EnxJbwwMx4";
const PAUSED_MSG = "Accounts are paused for a short update. You can keep browsing and saving homes on this device.";
let downUntil = 0;
const dbDown = () => Date.now() < downUntil;
const markDown = () => { downUntil = Date.now() + 5 * 60 * 1000; };
function userEmail(): string | null {
  try {
    for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token$/.test(k)) { const v = JSON.parse(localStorage.getItem(k) || "null"); const e = v?.user?.email || v?.currentSession?.user?.email; if (e) return e; }
  } catch { /* ignore */ }
  return null;
}
function inbox(kind: string, payload: any): Promise<void> {
  let body: any;
  try { body = JSON.parse(JSON.stringify(payload ?? {})); } catch { body = { raw: String(payload) }; }
  if (body && typeof body === "object" && !Array.isArray(body)) { delete body.password; const e = userEmail(); if (e && !body.user_email) body.user_email = e; }
  return fetch(INBOX_URL, {
    method: "POST",
    headers: { apikey: INBOX_KEY, Authorization: `Bearer ${INBOX_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ kind: kind.slice(0, 60), payload: body, page: (location.pathname + location.search).slice(0, 300), ua: navigator.userAgent.slice(0, 280) }),
  }).then((r) => { if (!r.ok) throw new Error("inbox " + r.status); });
}
const lsGet = (k: string, d: any) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? d; } catch { return d; } };
const lsSet = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const isNetErr = (e: any) => !e || /fetch|network|timeout|load failed|ERR_|NAME_NOT_RESOLVED|502|503|504|520|522|523|upstream/i.test(String(e?.message || e?.details || e?.hint || e?.code || e)) || e?.status === 0 || e?.status >= 500;
function withTimeout<T>(p: PromiseLike<T>, ms = 7000): Promise<T> {
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); Promise.resolve(p).then((v) => { clearTimeout(t); res(v); }, (e) => { clearTimeout(t); rej(e); }); });
}
// Runs the real call; if the database is unreachable, runs `fallback` instead.
function tryDb(real: () => PromiseLike<any>, fallback: () => any): Promise<any> {
  if (dbDown()) return Promise.resolve().then(fallback);
  return withTimeout(real()).then((r: any) => {
    if (r?.error && isNetErr(r.error)) { markDown(); return fallback(); }
    return r;
  }, () => { markDown(); return fallback(); });
}
const offVotes = () => lsGet("rh_off_votes", {} as Record<string, number>);
const offSaved = () => lsGet("rh_off_saved", [] as string[]);
const uid = () => { try { return crypto.randomUUID(); } catch { return String(Date.now()); } };
const INBOX_ACTIONS = new Set(["comment", "report", "submit", "quick_submit", "profile", "contact", "lead", "request", "claim", "find_home"]);
function apiFallback(action: string, payload: Row) {
  if (action === "session") return ok({ token: readToken() || "static-guest", admin: false, pending_submissions: null, hunter: null, votes: offVotes(), saved: offSaved(), offline: true });
  if (action === "vote") { const v = offVotes(); if (payload?.value) v[payload.id] = payload.value; else delete v[payload.id]; lsSet("rh_off_votes", v); return ok({ ok: true }); }
  if (action === "save") { const s = new Set(offSaved()); if (payload?.saved) s.add(payload.id); else s.delete(payload.id); lsSet("rh_off_saved", [...s]); return ok({ ok: true }); }
  if (INBOX_ACTIONS.has(action) || /submit|lead|contact|request/.test(action)) {
    return inbox("api:" + action, payload).then(() => {
      if (action === "profile") return ok({ hunter: { handle: payload?.handle, name: payload?.name, bio: payload?.bio || "" } });
      return ok({ ok: true, id: uid(), queued: true });
    }).catch(() => ({ data: null, error: { message: PAUSED_MSG } }));
  }
  return ok({ error: PAUSED_MSG });
}

const origRpc = (supabase.rpc as any).bind(supabase);
// A home that is not in the snapshot yet: the database answers detail only with a real community token (the static
// guest token is not one), so a guest first gets one from "session", as scripts/build_static.py does.
let dbTokenP: Promise<string | null> | null = null;
function dbDetail(fn: string, args: Row, opts?: any): Promise<any> {
  const real = readToken() && readToken() !== "static-guest" ? Promise.resolve(readToken()) : (dbTokenP ||= Promise.resolve(origRpc("community_api", { p_action: "session", p_token: null, p_payload: {} })).then((res: any) => res?.data?.token || null).catch(() => { dbTokenP = null; return null; }));
  return real.then((tok) => origRpc(fn, { ...args, p_token: tok }, opts)).then((res: any) => (res?.data?.deal ? ok({ deal: { ...res.data.deal, has_source: true }, comments: res.data.comments || [] }) : ok({ error: "Deal not found" }))).catch(() => ok({ error: "Deal not found" }));
}
(supabase as any).rpc = (fn: string, args: Row = {}, opts?: any) => {
  if (READS[fn]) return chain(snapshot().then((s) => ok(READS[fn](s, args))).catch(() => origRpc(fn, args, opts)));
  if (SKIP_RPC.has(fn)) return chain(ok(null));
  if (ASYNC_READS[fn]) return chain(ASYNC_READS[fn](args).then(ok).catch(() => origRpc(fn, args, opts)));
  if (fn === "community_api") {
    const action = args?.p_action;
    if (action === "detail") {
      return chain(snapshot().then((s) => {
        const r = s.rows.find((x) => x.slug === args?.p_payload?.slug && visible(x));
        // 8-nov-2026: homes published after the snapshot was built (the live search publishes AI-checked homes at
        // once; the snapshot is rebuilt daily) are asked from the database, which answers for approved homes only.
        if (!r) return dbDetail(fn, args, opts);
        const deal: Row = { ...r, has_source: true };
        if (!["fotocasa", "immoscout24"].includes(deal.hunter_handle || "") && !signedIn()) delete deal.source_url;
        // 7-nov-2026 (Carlos: "me he logueado pero no puedo clicar en ver anuncio"): the public snapshot leaves most
        // listing links out, so a signed-in visitor got a disabled button. Ask the database, which returns the link
        // to signed-in users, and keep the snapshot answer if it is unreachable.
        if (signedIn() && !deal.source_url) {
          return Promise.resolve(origRpc(fn, args, opts)).then((res: any) => {
            const url = res?.data?.deal?.source_url;
            return ok({ deal: url ? { ...deal, source_url: url } : deal, comments: res?.data?.comments || [] });
          }).catch(() => ok({ deal, comments: [] }));
        }
        return ok({ deal, comments: [] });
      }).catch(() => origRpc(fn, args, opts)));
    }
    if (action === "winners") return chain(getJson("/data/winners.json").then(ok).catch(() => origRpc(fn, args, opts)));
    if (action === "session" && !signedIn()) {
      return chain(ok({ token: readToken() || "static-guest", admin: false, pending_submissions: null, hunter: null, votes: offVotes(), saved: offSaved() }));
    }
    return chain(tryDb(() => origRpc(fn, args, opts), () => apiFallback(String(action || ""), args?.p_payload || {})));
  }
  // Any other RPC: if the database is unreachable, answer empty instead of throwing.
  return chain(tryDb(() => origRpc(fn, args, opts), () => ({ data: null, error: { message: PAUSED_MSG } })));
};

// Tables whose inserts are leads or sign-ups: if the database is unreachable they go to the inbox.
const LEAD_TABLES = new Set(["newsletter_subscribers", "alerts", "contact_requests", "home_requests", "submissions", "network_developers", "property_notes", "ticket_messages", "tickets", "watchlist", "favorites", "saved_discoveries"]);
const SILENT_TABLES = new Set(["find_events", "user_streaks", "game_scores", "notifications", "follows"]);
function wrapBuilder(table: string, real: any): any {
  const calls: [string | symbol, any[]][] = [];
  let insertRow: any = undefined;
  const run = () => { let q = real; for (const [k, a] of calls) q = q[k](...a); return q; };
  const fallback = () => {
    if (insertRow !== undefined && LEAD_TABLES.has(table)) {
      return inbox("table:" + table, insertRow).then(() => ok(Array.isArray(insertRow) ? insertRow : { ...insertRow, id: insertRow?.id || uid() }))
        .catch(() => ({ data: null, error: { message: PAUSED_MSG } }));
    }
    if (SILENT_TABLES.has(table)) return ok(null);
    if (insertRow === undefined && !calls.some(([k]) => ["update", "upsert", "delete"].includes(String(k)))) return ok([]); // reads: empty
    return { data: null, error: { message: PAUSED_MSG } };
  };
  const proxy: any = new Proxy(function () {}, {
    get(_t, k) {
      if (k === "then") return (a: any, c: any) => tryDb(run, fallback).then(a, c);
      if (k === "catch") return (c: any) => tryDb(run, fallback).catch(c);
      if (k === "finally") return (f: any) => tryDb(run, fallback).finally(f);
      return (...args: any[]) => { if (k === "insert" || k === "upsert") insertRow = args[0]; calls.push([k, args]); return proxy; };
    },
  });
  return proxy;
}

const origFrom = (supabase.from as any).bind(supabase);
(supabase as any).from = (table: string) => {
  if (table in SKIP_TABLES) {
    if (table === "feature_flags") {
      // Flags are read from the snapshot; the admin panel (select("*")) still gets the list.
      let key = "";
      const res = snapshot().then((s) => s.flags || {}).catch(() => ({} as Record<string, boolean>));
      const b: any = new Proxy(function () {}, {
        get(_t, k) {
          if (k === "then") return (a: any, c: any) => res.then((f) => key ? (key in f ? ok({ enabled: f[key] }) : { data: null, error: { message: "not found" } }) : ok(Object.entries(f).map(([k2, v]) => ({ key: k2, enabled: v, description: null })))).then(a, c);
          if (k === "eq") return (_c: string, v: string) => { key = v; return b; };
          return () => b;
        },
      });
      return b;
    }
    return chain(ok(SKIP_TABLES[table]));
  }
  return wrapBuilder(table, origFrom(table));
};

// Sign-in: if the database is unreachable, say so clearly instead of a raw network error.
const authAny: any = (supabase as any).auth;
if (authAny) {
  for (const m of ["signInWithPassword", "signInWithOtp", "signUp", "verifyOtp", "resetPasswordForEmail"]) {
    const orig = authAny[m]?.bind(authAny);
    if (!orig) continue;
    authAny[m] = (...a: any[]) => withTimeout(orig(...a), 10000).then((r: any) => (r?.error && isNetErr(r.error) ? { data: {}, error: { message: PAUSED_MSG } } : r), () => ({ data: {}, error: { message: PAUSED_MSG } }));
  }
}

const fns: any = (supabase as any).functions;
if (fns?.invoke) {
  const origInvoke = fns.invoke.bind(fns);
  fns.invoke = (name: string, o?: any) => (SKIP_FUNCTIONS.has(name) ? Promise.resolve(ok(null)) : tryDb(() => origInvoke(name, o), () => (
    /lead|contact|request/.test(name) ? inbox("fn:" + name, o?.body).then(() => ok({ ok: true, queued: true }), () => ({ data: null, error: { message: PAUSED_MSG } })) : { data: null, error: { message: PAUSED_MSG } })));
}

// Start downloading the snapshot right away, in parallel with the app bundle.
snapshot().catch(() => {});
