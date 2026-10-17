// STATIC MODE (17-oct-2026, Carlos: "que no gaste créditos, que sea estática").
// Lovable Cloud bills the database server for every hour it is awake, and every visit woke it with
// 6-8 queries (feed, filter counts, nearby, scores, session, flags, tracking). Now every public read
// comes from /data/rh-static.json (a snapshot of all published homes, regenerated whenever homes are
// added) and is filtered/sorted in the browser with the same rules as the SQL functions
// community_feed / community_quick_counts / community_near / community_nearby / community_scores.
// Visitor tracking writes are skipped. Only explicit actions (sign in, vote, save, submit, admin)
// still talk to the database, so the Cloud backend can stay paused and the site keeps working.
import { supabase } from "@/integrations/supabase/client";

type Row = Record<string, any>;
type Snap = { v: number; generated: string; meta: Row; live: { live: number; today: number }; flags: Record<string, boolean>; rows: Row[] };

let snapP: Promise<Snap> | null = null;
export function snapshot(): Promise<Snap> {
  return (snapP ||= fetch("/data/rh-static.json", { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error("static data " + r.status);
    return r.json();
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
    (!ids || ids.includes(e.id)) &&
    (minScore == null || num(e.nota) >= minScore) &&
    need.every((t) => Array.isArray(e.amen) && e.amen.includes(t)) &&
    Object.entries(dmin).every(([k, v]) => num(e.dims?.[k]) >= num(v)) &&
    terms.every((t) => has([e.title, e.location_name, e.why_great].join(" "), t)) &&
    (!q || q.split(" ").filter(Boolean).every((w) => has([e.title, e.location_name, e.country, e.category, e.why_great].join(" "), w))));
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
const getJson = (u: string) => fetch(u, { cache: "force-cache" }).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
let topListsP: Promise<Record<string, any>> | null = null;
// New-build Top 100 lists and project pages (snapshots in /data/top-lists.json and /data/top/<slug>.json).
const ASYNC_READS: Record<string, (a: Row) => Promise<any>> = {
  top_list: (a) => (topListsP ||= getJson("/data/top-lists.json")).then((l) => l[a?.p_dest] || []),
  top_project: (a) => /^[a-z0-9-]+$/.test(String(a?.p_slug || "")) ? getJson(`/data/top/${a.p_slug}.json`) : Promise.resolve(null),
};
const SKIP_TABLES: Record<string, any> = { page_visits: null, rh_events: null, experiments: [], feature_flags: null };
const SKIP_FUNCTIONS = new Set(["track-visit"]);

const origRpc = (supabase.rpc as any).bind(supabase);
(supabase as any).rpc = (fn: string, args: Row = {}, opts?: any) => {
  if (READS[fn]) return chain(snapshot().then((s) => ok(READS[fn](s, args))).catch(() => origRpc(fn, args, opts)));
  if (SKIP_RPC.has(fn)) return chain(ok(null));
  if (ASYNC_READS[fn]) return chain(ASYNC_READS[fn](args).then(ok).catch(() => origRpc(fn, args, opts)));
  if (fn === "community_api") {
    const action = args?.p_action;
    if (action === "detail") {
      return chain(snapshot().then((s) => {
        const r = s.rows.find((x) => x.slug === args?.p_payload?.slug && visible(x));
        if (!r) return ok({ error: "Deal not found" });
        const deal: Row = { ...r, has_source: true };
        if (!["fotocasa", "immoscout24"].includes(deal.hunter_handle || "") && !signedIn()) delete deal.source_url;
        return ok({ deal, comments: [] });
      }).catch(() => origRpc(fn, args, opts)));
    }
    if (action === "winners") return chain(getJson("/data/winners.json").then(ok).catch(() => origRpc(fn, args, opts)));
    if (action === "session" && !signedIn()) {
      return chain(ok({ token: readToken() || "static-guest", admin: false, pending_submissions: null, hunter: null, votes: {}, saved: [] }));
    }
  }
  return origRpc(fn, args, opts);
};

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
  return origFrom(table);
};

const fns: any = (supabase as any).functions;
if (fns?.invoke) {
  const origInvoke = fns.invoke.bind(fns);
  fns.invoke = (name: string, o?: any) => (SKIP_FUNCTIONS.has(name) ? Promise.resolve(ok(null)) : origInvoke(name, o));
}

// Start downloading the snapshot right away, in parallel with the app bundle.
snapshot().catch(() => {});
