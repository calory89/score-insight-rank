// RealHunt Score — service worker. The only place that talks to the RealHunt backend.
// No API keys beyond the public (anon) key; all writes go through security-definer RPCs that accept
// derived listing features only. Nothing is sent before the user gives consent.
// v0.15: the backend lives on RealHunt's own server (realhunt.co), no third-party builder in between.
const BASE = "https://realhunt.co/__sb/realhunt";
const API = BASE + "/rest/v1/rpc/";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im95a2NzbWV4dGNscGRudWdpeHF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzOTMzNjYsImV4cCI6MjEwNzk2OTM2Nn0.n4lmkzPgZe64B18altwRMYFiQrLQ2Quqg9uV9SoJhAw";
const FREE_REPORTS_PER_DAY = 1; // the first full report is free; after that it is free too, with an email
const EXT_API = BASE + "/functions/v1/ext-api";
const CONSENT_VERSION = "v1-2026-10";
const HDR = { apikey: ANON, Authorization: "Bearer " + ANON, "Content-Type": "application/json" };
// v0.15: every call has a time limit and one retry on a network error or a server hiccup, and we remember
// whether the server answered lately so the card can say "calculated in your browser" instead of hanging.
let backendOk = true, backendAt = 0;
const mark = (ok) => { backendOk = ok; backendAt = Date.now(); };
async function call(url, body, ms) {
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { method: "POST", headers: HDR, body: JSON.stringify(body), signal: AbortSignal.timeout(ms) });
      if (r.status >= 500 && i === 0) { await new Promise((z) => setTimeout(z, 700)); continue; }
      mark(r.status < 500); return r;
    } catch { if (i === 0) { await new Promise((z) => setTimeout(z, 700)); continue; } mark(false); return null; }
  }
  return null;
}
async function rpc(fn, body) {
  const r = await call(API + fn, body, 10000); if (!r || !r.ok) return null;
  try { const t = await r.text(); return t ? JSON.parse(t) : null; } catch { return null; }
}
async function api(body) {
  const r = await call(EXT_API, body, 25000); if (!r) return null;
  try { const t = await r.text(); const j = t ? JSON.parse(t) : null; return r.ok ? j : { ...(j || {}), _status: r.status }; } catch { return null; }
}
const L = (k) => chrome.storage.local.get(k).then((o) => o[k]);
const S = (o) => chrome.storage.local.set(o);
const today = () => new Date().toISOString().slice(0, 10);

async function deviceId() { let d = await L("device_id"); if (!d) { d = crypto.randomUUID(); await S({ device_id: d }); } return d; }
// v0.9: the account (consent, token, email) is mirrored in chrome.storage.sync, so reinstalling or updating the
// extension never asks for the email again on the same Chrome profile.
async function acctSave() { try { const o = await chrome.storage.local.get(["consent", "consent_at", "token", "email"]); await chrome.storage.sync.set({ acct: o }); } catch { /* sync off */ } }
let restored = false;
async function acctRestore() {
  if (restored) return; restored = true;
  try { const tok = await L("token"); if (tok) return; const a = (await chrome.storage.sync.get("acct")).acct; if (a && a.token) await S({ consent: !!a.consent, consent_at: a.consent_at || null, token: a.token, email: a.email || null }); } catch { /* nothing to restore */ }
}
async function state() {
  await acctRestore();
  const [consent, token, email, profile, quota] = await Promise.all([L("consent"), L("token"), L("email"), L("profile"), L("quota")]);
  const used = quota && quota.day === today() ? quota.used.length : 0;
  const min = await L("min");
  return { consent: !!consent, token: token || null, email: email || null, profile: profile || null, min: !!min, quotaLeft: email ? 999 : Math.max(0, FREE_REPORTS_PER_DAY - used) };
}
async function track(kind, extra = {}) {
  const st = await state(); if (!st.consent) return; // no analytics before consent
  rpc("ext_track", { p: { token: st.token, device_id: await deviceId(), kind, ...extra } });
}

// ---------------------------------------------------------------- comparable homes, kept in this browser
// Every search page the user opens adds its homes (derived numbers only) to a local pool. A listing is then
// compared with homes within 2 km (5 km if needed), else the same neighbourhood, else the last search page.
const POOL_MAX = 4000;
async function poolGet() { return (await chrome.storage.local.get("pool")).pool || []; }
async function poolAdd(items) {
  const now = Date.now(); const pool = (await poolGet()).filter((x) => now - x.t < 30 * 864e5);
  const idx = new Map(pool.map((x, i) => [x.h, i]));
  for (const it of items) { if (!it.h || !(it.pp > 0 || (it.price > 0 && it.rooms > 0))) continue; const row = { ...it, t: now }; if (idx.has(it.h)) pool[idx.get(it.h)] = row; else { idx.set(it.h, pool.length); pool.push(row); } }
  await chrome.storage.local.set({ pool: pool.slice(-POOL_MAX) });
}
const kmBetween = (a, b, c, d) => { const R = 6371, x = (c - a) * Math.PI / 180, y = (d - b) * Math.PI / 180; const h = Math.sin(x / 2) ** 2 + Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const medianOf = (a) => { const b = a.filter((x) => x > 0).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
async function localComps(f, hash) {
  // similar homes only: same currency, same tenure (freehold vs leasehold), and between half and double the size
  const ten = (f.tenure && f.tenure.k) || "-";
  // v0.12.1: a sale is never compared with rents (and the other way round)
  const deal = f.deal || "sale";
  const all = (await poolGet()).filter((x) => x.h !== hash && x.cur === f.currency && (x.ten || "-") === ten && (x.deal || "sale") === deal);
  if (!f.sqm) {
    // v0.7: sites without m² (common for villas and agencies): compare the price per bedroom instead
    if (!(f.rooms > 0)) return null;
    const pr = all.filter((x) => x.price > 0 && x.rooms > 0 && Math.abs(x.rooms - f.rooms) <= 2 && x.price > f.price / 8 && x.price < f.price * 8);
    const near = f.lat != null ? pr.filter((x) => x.lat != null && kmBetween(f.lat, f.lng, x.lat, x.lng) <= 5) : [];
    const a0 = String(f.area || "").toLowerCase(); const sameA = a0 ? pr.filter((x) => String(x.area || "").toLowerCase() === a0) : [];
    const use = near.length >= 5 ? near : sameA; // v0.13.1: never price per bedroom against homes from anywhere
    return use.length >= 5 ? { room: { bench: Math.round(medianOf(use.map((x) => x.price / x.rooms))), n: use.length } } : null;
  }
  const pool = all.filter((x) => x.pp > 0 && (!x.sqm || (x.sqm >= f.sqm / 2 && x.sqm <= f.sqm * 2)));
  if (f.lat != null && f.lng != null) {
    for (const km of [1, 2, 5]) {
      const near = pool.filter((x) => x.lat != null && kmBetween(f.lat, f.lng, x.lat, x.lng) <= km);
      if (near.length >= 5) return { bench: Math.round(medianOf(near.map((x) => x.pp))), n: near.length, source: "near", km };
    }
  }
  const a = String(f.area || "").toLowerCase();
  if (a) { const same = pool.filter((x) => String(x.area || "").toLowerCase() === a); if (same.length >= 5) return { bench: Math.round(medianOf(same.map((x) => x.pp))), n: same.length, source: "area" }; }
  return null;
}

// v0.8: the homes to fit a fair price on: same currency and tenure, nearest first (or the same area / search)
async function compRows(f, hash) {
  const ten = (f.tenure && f.tenure.k) || "-";
  const deal = f.deal || "sale";
  let pool = (await poolGet()).filter((x) => x.h !== hash && x.cur === f.currency && (x.ten || "-") === ten && (x.deal || "sale") === deal && x.price > 0 && (x.sqm > 0 || x.rooms > 0));
  let near = false;
  if (f.lat != null && f.lng != null) {
    const geo = pool.filter((x) => x.lat != null).map((x) => ({ x, d: kmBetween(f.lat, f.lng, x.lat, x.lng) })).sort((a, b) => a.d - b.d);
    const close = geo.filter((g) => g.d <= 8).slice(0, 300).map((g) => g.x);
    if (close.length >= 15) { pool = close; near = true; }
  }
  if (!near) {
    // v0.13.1: never fall back to "every home on this site" or "every home you've seen": only the same place counts.
    // Without enough homes nearby the card leaves the price comparison out instead of comparing with another country.
    const a = String(f.area || f.city || "").toLowerCase(), loc = f.loc || null;
    const same = pool.filter((x) => (loc && x.loc === loc) || (a && String(x.area || "").toLowerCase() === a));
    const wide = f.lat != null && f.lng != null ? pool.filter((x) => x.lat != null && kmBetween(f.lat, f.lng, x.lat, x.lng) <= 30) : [];
    pool = same.length >= 15 ? same : wide.length >= 12 ? wide : [];
  }
  return { rows: pool.slice(0, 400).map((x) => ({ price: x.price, sqm: x.sqm, rooms: x.rooms, baths: x.baths, year: x.year, lot: x.lot, ptype: x.ptype, loc: x.loc, deal: x.deal || "sale", lat: x.lat ?? null, lng: x.lng ?? null, tax: x.tax || null, _zest: x.zest || null, _enriched: true })), near };
}

// ---------------------------------------------------------------- what's within a walk (OpenStreetMap, cached 30 days)
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
async function nearby(lat, lng) {
  if (lat == null || lng == null || !isFinite(lat) || !isFinite(lng)) return null;
  const key = `loc2:${lat.toFixed(3)},${lng.toFixed(3)}`;
  const c = (await chrome.storage.local.get(key))[key];
  if (c && Date.now() - c.t < 30 * 864e5) return c.v;
  const A = (r) => `(around:${r},${lat},${lng})`;
  const q = `[out:json][timeout:12];(nwr${A(800)}[highway=bus_stop];nwr${A(800)}[railway~"^(station|halt|tram_stop|subway_entrance)$"];);out count;` +
    `nwr${A(800)}[shop~"^(supermarket|convenience|greengrocer|bakery|butcher)$"];out count;` +
    `nwr${A(800)}[amenity~"^(school|kindergarten)$"];out count;` +
    `nwr${A(800)}[amenity~"^(pharmacy|doctors|clinic|hospital)$"];out count;` +
    `nwr${A(800)}[leisure~"^(park|playground)$"];out count;` +
    `nwr${A(2000)}[natural=beach];out count;` +
    `nwr${A(800)}[amenity~"^(cafe|restaurant|bar|pub|fast_food|ice_cream)$"];out count;`;
  for (const u of OVERPASS) {
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch(u, { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" }, signal: ctl.signal });
      clearTimeout(to);
      if (!r.ok) continue;
      const n = (await r.json()).elements.map((e) => +((e.tags || {}).total || 0));
      if (n.length < 6) continue;
      const v = { transit: n[0], shop: n[1], school: n[2], health: n[3], park: n[4], beach: n[5], food: n[6] != null ? n[6] : null };
      await chrome.storage.local.set({ [key]: { t: Date.now(), v } });
      return v;
    } catch { /* try the next mirror */ }
  }
  // Some networks and ad blockers stop OpenStreetMap: ask our server to look it up (only after consent).
  const st = await state();
  if (st.consent && st.token) {
    for (let i = 0; i < 10; i++) { // answered from cache, or queued and filled by the server within about a minute
      const v = await rpc("ext_nearby", { p: { token: st.token, lat, lng } });
      if (v && v.transit != null) { await chrome.storage.local.set({ [key]: { t: Date.now(), v } }); return v; }
      if (!v) break;
      await new Promise((r) => setTimeout(r, 9000));
    }
  }
  return null;
}

// ---------------------------------------------------------------- official average (Spain), bundled with the extension
let OFFICIAL = null;
const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
async function officialRef(f) {
  if (f.country !== "ES" || !f.currency || f.currency !== "EUR") return null;
  try { if (!OFFICIAL) OFFICIAL = await (await fetch(chrome.runtime.getURL("src/official-es.json"))).json(); } catch { return null; }
  for (const c of [f.city, f.area, f.province]) {
    const m = OFFICIAL.municipios[norm(c)];
    if (m) return { place: c, ppsqm: m[0], period: OFFICIAL.period };
  }
  for (const c of [f.province, f.city]) { const p = OFFICIAL.provincias[norm(c)]; if (p) return { place: c + " (province)", ppsqm: p, period: OFFICIAL.period }; }
  return null;
}

// ---------------------------------------------------------------- v0.14: market price reference (Spain, bundled)
// Median asking price per m² of every Spanish municipality (8,185) and district (2,640), from the Fotocasa price index.
// The same home always gets the same reference: it doesn't depend on what you browsed before, on the server or on luck.
let MKT = null, MKTI = null;
const nrm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]+/g, " ").trim();
async function mktLoad() {
  if (MKTI) return MKTI;
  try { MKT = await (await fetch(chrome.runtime.getURL("src/market-es.json"))).json(); } catch { return null; }
  const muni = new Map(), dist = new Map(), prov = new Map();
  MKT.prov.forEach((p, i) => { for (const a of String(p[0]).split(/\s*[\/-]\s*/)) prov.set(nrm(a), i); });
  MKT.muni.forEach((m, i) => {
    const names = new Set([m[0], m[0].replace(/\s+capital$/i, "")]);
    for (const x of [...names]) for (const a of x.split(/\s*\/\s*/)) names.add(a);
    for (const a of names) { const k = nrm(a); if (k.length < 3) continue; if (!muni.has(k)) muni.set(k, []); muni.get(k).push(i); }
  });
  MKT.dist.forEach((d, i) => { const al = new Set([d[1], ...String(d[1]).split(/\s*[\/]\s*|\s+-\s+/)]); for (const a of [...al]) al.add(a.replace(/^(barrio|distrito|zona|urbanizaci[oó]n)( de(l)?)?\s+/i, ""));
    for (const a of al) { const k = nrm(a); if (k.length < 5) continue; const key = d[0] + "|" + k; if (!dist.has(key)) dist.set(key, i); } });
  const byMuni = new Map(); MKT.dist.forEach((d, i) => { if (!byMuni.has(d[0])) byMuni.set(d[0], []); byMuni.get(d[0]).push(i); });
  MKTI = { muni, dist, prov, byMuni };
  return MKTI;
}
const GENERIC = new Set(["centro", "playa", "costa", "golf", "puerto", "casco antiguo", "zona", "norte", "sur", "este", "oeste", "las", "los", "san", "santa", "mar", "sol", "rio", "villa", "campo"]);
function grams(t, maxN = 6) { const w = t.split(" ").filter(Boolean), out = []; for (let n = Math.min(maxN, w.length); n >= 1; n--) for (let i = 0; i + n <= w.length; i++) out.push(w.slice(i, i + n).join(" ")); return out; }
async function marketRef(f) {
  if (!f || (f.currency && f.currency !== "EUR")) return null;
  if (f.country && f.country !== "ES") return null;
  const I = await mktLoad(); if (!I) return null;
  let path = ""; try { path = decodeURIComponent(new URL(f.url || "").pathname).replace(/[-_/]+/g, " "); } catch { /* none */ }
  // where the place can be written, most reliable first (never the description: it names nearby towns)
  const fields = [[f.city, 6], [f.area, 5], [f.addr, 4], [f.province, 2], [f.title, 3], [path, 1]].map(([t, w]) => [nrm(t), w]).filter(([t]) => t);
  if (!fields.length) return null;
  const provHit = new Set(); for (const [t] of fields) for (const g of grams(t, 4)) if (I.prov.has(g)) provHit.add(I.prov.get(g));
  const cand = new Map();
  for (const [t, w] of fields) for (const g of grams(t)) {
    const ids = I.muni.get(g); if (!ids || GENERIC.has(g) || (g.length < 4 && !g.includes(" "))) continue;
    for (const i of ids) {
      const m = MKT.muni[i];
      const sc = w * 10 + g.length + (provHit.has(m[1]) ? 8 : 0) + Math.min(6, Math.log10(1 + m[4]) * 2);
      if (!cand.has(i) || sc > cand.get(i)) cand.set(i, sc);
    }
  }
  if (!cand.size) return null;
  // a district of the town named elsewhere on the page settles it ("Salamanca" in Madrid is a district, not the city)
  const distOf = (i) => { for (const [t] of fields) for (const g of grams(t)) { const k = I.dist.get(i + "|" + g); if (k != null && !GENERIC.has(g)) return MKT.dist[k]; } return null; };
  let best = null;
  for (const [i, sc0] of cand) { const d = distOf(i); const sc = sc0 + (d && nrm(d[1]) !== nrm(MKT.muni[i][0]) ? 12 : 0); if (!best || sc > best.sc) best = { i, sc, d }; }
  const m = MKT.muni[best.i];
  const d = best.d;
  const n = m[4];
  return { ppsqm: d ? d[2] : m[2], rent: d ? d[3] || m[3] : m[3], place: d ? `${d[1]}, ${m[0].replace(/\s+Capital$/i, "")}` : m[0].replace(/\s+Capital$/i, ""), province: MKT.prov[m[1]][0],
    level: d ? "district" : "muni", n, conf: n >= 150 ? 1 : n >= 40 ? 0.85 : n >= 15 ? 0.7 : 0.5, src: "Fotocasa", period: MKT.period, country: "ES" };
}

// ---------------------------------------------------------------- AI reading of the description (after consent; cached 7 days)
async function analyze(hash, text, lang) {
  const key = `ai:${hash}:${lang}`;
  const c = (await chrome.storage.local.get(key))[key];
  if (c && Date.now() - c.t < 7 * 864e5) return c.v;
  const st = await state(); if (!st.consent || !st.token) return null;
  const r = await api({ action: "analyze", token: st.token, hash, text: String(text || "").slice(0, 6000), lang });
  if (r && r.v) { await chrome.storage.local.set({ [key]: { t: Date.now(), v: r.v } }); return r.v; }
  return null;
}

// v0.15: Alt+Shift+R is a real Chrome shortcut now (people can change it in chrome://extensions/shortcuts)
try {
  chrome.commands.onCommand.addListener(async (cmd, tab) => {
    if (cmd !== "toggle-card") return;
    try { const t = tab || (await chrome.tabs.query({ active: true, currentWindow: true }))[0]; if (t && t.id != null) await chrome.tabs.sendMessage(t.id, { t: "rhsToggle" }); } catch { /* no card on this page */ }
  });
} catch { /* old Chrome */ }
try { chrome.runtime.setUninstallURL("https://realhunt.co/extension?bye=1"); } catch { /* ignore */ }

chrome.runtime.onInstalled.addListener(async (d) => {
  try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); } catch {}
  if (d.reason === "install") chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") });
  // v0.12.1: older versions could store Zillow sizes in square feet as m² and homes without "sale or rent";
  // those made fair prices wrong on listing pages. Drop them once; a ranking rebuilds them in seconds.
  // v0.13.1: homes picked up on realhunt.co (curated bargains from many countries) must not be used as "similar homes" anywhere else
  try { const { poolFix131 } = await chrome.storage.local.get("poolFix131"); if (!poolFix131) { const pool = await poolGet(); await chrome.storage.local.set({ pool: pool.filter((x) => !/realhunt\.co$|lovable\.app$/.test(x.portal || "")), poolFix131: 1 }); await chrome.storage.session.clear(); } } catch { /* nothing stored yet */ }
  try { const { poolFix121 } = await chrome.storage.local.get("poolFix121"); if (!poolFix121) { const pool = await poolGet(); await chrome.storage.local.set({ pool: pool.filter((x) => x.deal && x.portal !== "zillow"), poolFix121: 1 }); const { lastRank } = await chrome.storage.local.get("lastRank"); if (lastRank && /zillow/.test(lastRank.host || "")) await chrome.storage.local.remove("lastRank"); } } catch { /* nothing stored yet */ }
});

chrome.runtime.onMessage.addListener((m, sender, reply) => {
  (async () => {
    const st = await state();
    switch (m.t) {
      case "state": return reply({ ...st, offline: !backendOk && Date.now() - backendAt < 10 * 60e3 });
      case "consent": {
        const r = await rpc("ext_consent", { p: { consent: true, token: st.token, device_id: await deviceId(), lang: chrome.i18n.getUILanguage().slice(0, 2), version: CONSENT_VERSION } });
        await S({ consent: true, consent_at: new Date().toISOString(), token: r && r.token ? r.token : st.token }); acctSave();
        track("install");
        return reply({ ok: true });
      }
      case "revoke": { await chrome.storage.local.clear(); try { await chrome.storage.sync.clear(); } catch {} restored = true; return reply({ ok: true }); }
      case "cards": {
        // search page: remember the page median (for listings opened from it) and add its homes to the local pool
        // v0.13.1: remember where the search page was (centre and currency) so its median is only used for homes in that same place
        if (!m.rank) { const g = (m.items || []).filter((x) => x.lat != null && x.lng != null); const cu = ((m.items || []).find((x) => x.cur) || {}).cur || null;
          await chrome.storage.session.set({ ["page:" + m.portal]: { bench: m.bench, n: m.n, t: Date.now(), area: m.area, cur: cu, lat: g.length ? g.reduce((a, x) => a + x.lat, 0) / g.length : null, lng: g.length ? g.reduce((a, x) => a + x.lng, 0) / g.length : null } }); }
        await poolAdd(m.items || []);
        if (st.consent && st.token && (m.items || []).length) {
          rpc("ext_cards_seen", { p: { token: st.token, city: m.city || m.area || null, items: m.items.slice(0, 60) } });
          // v0.10: how much this browser has added to RealHunt (shown in the side panel)
          const cb = (await L("contrib")) || { homes: 0, top: 0 }; const seenH = new Set((await L("contribH")) || []);
          for (const it of m.items) if (it.h && !seenH.has(it.h)) { seenH.add(it.h); cb.homes++; }
          cb.top += m.top || 0; await S({ contrib: cb, contribH: [...seenH].slice(-20000) });
        }
        return reply(true);
      }
      case "detail": {
        const f = m.f;
        let comps = await localComps(f, m.hash);
        const rows = await compRows(f, m.hash);
        if (comps && comps.room) return reply({ room: comps.room, official: null, mref: await marketRef({ ...f, url: m.url || f.url }), ...rows });
        if ((!comps || comps.n < 8) && st.consent && st.token) {
          const s2 = await rpc("ext_comps", { p: { token: st.token, hash: m.hash, portal: f.portal, currency: f.currency, area: f.area, lat: f.lat, lng: f.lng, sqm: f.sqm } });
          if (s2 && s2.bench && (!comps || s2.n > comps.n)) comps = s2;
        }
        if (!comps) {
          const pg = (await chrome.storage.session.get("page:" + f.portal))["page:" + f.portal];
          // v0.13.1: a search page's median only counts for a home in that same place and currency (it compared a flat in
          // Fuerteventura with cheap village houses from a page about another country and called it 250% too expensive)
          const samePlace = pg && (!pg.cur || pg.cur === f.currency) && ((f.lat != null && pg.lat != null && kmBetween(f.lat, f.lng, pg.lat, pg.lng) <= 25) || (f.area && pg.area && String(f.area).toLowerCase() === String(pg.area).toLowerCase()));
          if (pg && pg.bench && pg.n >= 5 && Date.now() - pg.t < 3 * 3600e3 && samePlace) comps = { bench: pg.bench, n: pg.n, source: "page" };
        }
        return reply({ ...(comps || {}), official: await officialRef(f), mref: await marketRef({ ...f, url: m.url || f.url }), ...rows });
      }
      // v0.13.1: on realhunt.co itself, show the score RealHunt already gives the home (same number as the site)
      // v0.14: market reference for one home or many (search pages, rankings)
      case "mref": return reply(m.list ? await Promise.all(m.list.map((x) => marketRef(x))) : await marketRef(m.f));
      // v0.14: a home's score inputs are frozen the first time they're complete, so opening it again gives the same number
      case "frozen": { const k = "fz:" + m.hash; if (m.save) { await chrome.storage.local.set({ [k]: { ...m.save, t: Date.now() } }); return reply(true); } const v = (await chrome.storage.local.get(k))[k]; return reply(v && Date.now() - v.t < 60 * 864e5 ? v : null); }
      case "siteScore": return reply((await rpc("ext_site_score", { p_slug: m.slug || null, p_dest: m.dest || null })) || null);
      case "nearby": return reply(await nearby(m.lat, m.lng));
      // v0.9: an address without a map point -> a point (OpenStreetMap, through our server so nothing new is needed here)
      case "geocode": {
        const q = String(m.q || "").trim().slice(0, 200); if (q.length < 4) return reply(null);
        const key = "geo:" + q.toLowerCase(); const c = (await chrome.storage.local.get(key))[key];
        if (c && Date.now() - c.t < 60 * 864e5) return reply(c.v);
        if (!st.consent || !st.token) return reply(null);
        const v = await rpc("ext_geocode", { p: { token: st.token, q } });
        const out = v && v.lat != null ? v : null; await chrome.storage.local.set({ [key]: { t: Date.now(), v: out } }); return reply(out);
      }
      case "notesAll": return reply((await L("notes")) || {});
      case "contrib": return reply((await L("contrib")) || { homes: 0, top: 0 });
      case "lastEmail": { let e = await L("last_email"); if (!e) { try { e = ((await chrome.storage.sync.get("acct")).acct || {}).email || null; } catch { e = null; } } return reply(e || null); }
      case "pref": { const o = {}; for (const k of ["min", "pos", "onb", "calc", "dim", "fabOff", "why", "myPlace", "rkHideNo", "rkOnlyDeep", "rkSort", "rkDock", "rkFollow", "muted"]) if (k in m) o[k] = m[k]; await S(o); return reply(true); }
      case "prefs": { const o = await chrome.storage.local.get(["pos", "onb", "calc", "dim", "fabOff", "why", "myPlace", "rkHideNo", "rkOnlyDeep", "rkSort", "rkDock", "rkFollow", "muted"]); return reply(o); }
      case "rankBadge": { // v0.12: how many top homes (85+) the ranking found, on the toolbar icon
        const tabId = sender.tab && sender.tab.id;
        if (tabId != null) { try { await chrome.action.setBadgeText({ tabId, text: m.n ? String(Math.min(m.n, 999)) : "" }); if (m.n) await chrome.action.setBadgeBackgroundColor({ tabId, color: "#E8590C" }); } catch { /* older Chrome */ } }
        return reply(true);
      }
      // v0.7: private notes and 👍/👎 per home, kept only in this browser
      case "note": {
        const notes = (await L("notes")) || {};
        if (m.set) {
          const cur = notes[m.hash] || {}; const nx = { ...cur, ...m.set, t: Date.now() }; if (!nx.text && !nx.like) delete notes[m.hash]; else notes[m.hash] = nx; await S({ notes });
          // v0.10: 👍/👎 (never the note text) build your taste profile on RealHunt, after consent
          if ("like" in m.set && st.consent && st.token) rpc("ext_taste_save", { p: { token: st.token, hash: m.hash, like: m.set.like || 0, url: nx.url, deal: nx.deal, price: nx.price, cur: nx.cur, sqm: nx.sqm, rooms: nx.rooms, ptype: nx.ptype, city: nx.city, country: nx.country, score: nx.score } });
        }
        return reply(notes[m.hash] || null);
      }
      // v0.7: homes opened recently (shown in the side panel and marked 👁 on search pages)
      case "seen": {
        let rec = (await L("recent")) || [];
        if (m.add) { rec = rec.filter((x) => x.url !== m.add.url); rec.unshift({ ...m.add, t: Date.now() }); rec = rec.slice(0, 40); await S({ recent: rec }); }
        return reply(rec);
      }
      // v0.7: the last whole-search ranking, so it can be reopened later without reading the pages again
      case "lastRank": {
        if (m.save) { await S({ lastRank: { ...m.save, t: Date.now() } }); return reply(true); }
        const lr = await L("lastRank"); return reply(lr && (!m.host || lr.host === m.host) ? lr : null);
      }
      case "insights": {
        // our server's view of this home: nearby comparables, the city, price history, duplicates, better options
        if (!st.consent || !st.token) return reply(null);
        const key = "ins:" + (m.p.hash || m.p.city || "");
        const c = (await chrome.storage.session.get(key))[key];
        if (c && Date.now() - c.t < 6 * 3600e3) return reply(c.v);
        const v = await rpc("ext_insights", { p: { token: st.token, ...m.p } });
        if (v && !v.error) await chrome.storage.session.set({ [key]: { t: Date.now(), v } });
        return reply(v && !v.error ? v : null);
      }
      case "compare": {
        // up to 4 homes side by side on realhunt.co
        let list = (await L("compare")) || [];
        if (m.op === "add" && m.item) { list = list.filter((x) => x.url !== m.item.url); list.push(m.item); list = list.slice(-4); await S({ compare: list }); }
        if (m.op === "remove") { list = list.filter((x) => x.url !== m.url); await S({ compare: list }); }
        if (m.op === "clear") { list = []; await S({ compare: list }); }
        if (m.op === "open") {
          if (!st.consent || !st.token || list.length < 2) return reply({ error: "few", list });
          const r = await rpc("ext_ranking_save", { p: { token: st.token, kind: "compare", title: m.title || null, items: list } });
          if (r && r.url) { chrome.tabs.create({ url: r.url + "?utm_source=extension&utm_medium=compare" }); track("compare_open", { meta: { n: list.length } }); }
          return reply(r || { error: "network" });
        }
        return reply({ list });
      }
      case "shareRanking": {
        if (!st.consent || !st.token) return reply({ error: "consent" });
        const r = await rpc("ext_ranking_save", { p: { token: st.token, kind: "ranking", title: m.title, cc: m.cc, city: m.city, src: m.src, items: (m.items || []).slice(0, 300) } });
        if (r && r.url) { chrome.tabs.create({ url: r.url + "?utm_source=extension&utm_medium=ranking" }); track("rank_share", { meta: { n: (m.items || []).length } }); }
        return reply(r || { error: "network" });
      }
      case "openUrl": { if (/^https:\/\/(www\.)?realhunt\.co\//.test(m.url || "")) { chrome.tabs.create({ url: m.url }); track("to_site", { meta: { where: m.where || "" } }); } return reply(true); }
      case "saved": { if (!st.consent || !st.token) return reply([]); return reply((await rpc("ext_saved_list", { p_token: st.token })) || []); }
      case "analyze": return reply(await analyze(m.hash, m.text, m.lang));
      case "verifyStart": {
        if (!st.consent || !st.token) return reply({ error: "consent" });
        return reply((await rpc("ext_verify_start", { p: { token: st.token, email: m.email, lang: m.lang } })) || { error: "network" });
      }
      case "verifyCheck": {
        if (!st.consent || !st.token) return reply({ error: "consent" });
        const r = await rpc("ext_verify_check", { p: { token: st.token, code: m.code, marketing: !!m.marketing, phone: m.phone || null } });
        if (r && r.ok) { await S({ email: r.email || m.email || null, last_email: r.email || null }); acctSave(); }
        return reply(r || { error: "network" });
      }
      case "report": {
        const tabId = sender.tab && sender.tab.id;
        if (tabId != null) await chrome.storage.session.set({ ["report:" + tabId]: m.report, lastReport: m.report });
        if (tabId != null) { // the score on the toolbar icon, for this tab only
          try {
            const sc = m.report.score; const col = sc >= 75 ? "#0F6B34" : sc >= 60 ? "#2E9E5B" : sc >= 45 ? "#D39B12" : "#C2412D";
            await chrome.action.setBadgeText({ tabId, text: String(sc) }); await chrome.action.setBadgeBackgroundColor({ tabId, color: col });
          } catch { /* older Chrome */ }
        }
        const R = m.report;
        if (st.consent && st.token) rpc("ext_listing_seen", { p: { token: st.token, deal: R.deal, fair: R.fair, pct: R.pct, title: R.title, baths: R.baths, hash: R.hash, portal: R.portal, url: R.url, country: R.country, area: R.area, lat: R.lat, lng: R.lng, price: R.price, currency: R.currency, sqm: R.sqm, ppsqm: R.ppsqm ? Math.round(R.ppsqm) : null, rooms: R.rooms, ptype: R.ptype, days: R.days, score: R.score, flags: R.flags, city: R.city } });
        if (st.consent && st.token && R.first) track("view", { hash: R.hash, meta: { portal: R.portal, area: R.area, score: R.score } });
        return reply(true);
      }
      case "useReport": {
        let q = (await L("quota")) || { day: today(), used: [] };
        if (q.day !== today()) q = { day: today(), used: [] };
        if (!q.used.includes(m.hash)) {
          if (!st.email && q.used.length >= FREE_REPORTS_PER_DAY) { track("quota_hit"); return reply({ allowed: false, quotaLeft: 0 }); }
          q.used.push(m.hash); await S({ quota: q });
        }
        track("report", { hash: m.hash });
        return reply({ allowed: true, quotaLeft: st.email ? 999 : Math.max(0, FREE_REPORTS_PER_DAY - q.used.length) });
      }
      case "alive": { if (sender.tab) await chrome.storage.session.set({ ["alive:" + sender.tab.id]: m.host }); return reply(true); }
      case "recipe": {
        // per-site fixes served from our database, so a portal that changes its layout is fixed without a store review
        const host = String(m.host || "").toLowerCase(); const all = (await L("recipes")) || { t: 0, list: {} };
        if (Date.now() - all.t > 12 * 3600e3) {
          try { const r = await fetch(BASE + "/rest/v1/ext_recipes?select=host,recipe&active=eq.true", { headers: { apikey: ANON, Authorization: "Bearer " + ANON }, signal: AbortSignal.timeout(10000) });
            if (r.ok) { const rows = await r.json(); all.list = Object.fromEntries(rows.map((x) => [x.host, x.recipe])); all.t = Date.now(); await S({ recipes: all }); } } catch { /* offline: keep the old ones */ }
        }
        const key = Object.keys(all.list).find((h) => host === h || host.endsWith("." + h));
        return reply(key ? all.list[key] : null);
      }
      case "openPanel": {
        try { await chrome.sidePanel.open({ tabId: sender.tab.id }); return reply(true); } catch { return reply(false); }
      }
      case "track": { await track(m.kind, { hash: m.hash, price: m.price, meta: m.meta }); return reply(true); }
      case "signup": {
        if (!st.consent || !st.token) return reply({ error: "consent" });
        const r = await rpc("ext_signup", { p: { token: st.token, email: m.email, phone: m.phone, marketing: !!m.marketing } });
        if (r && r.ok) await S({ email: m.email.trim().toLowerCase() });
        return reply(r || { error: "network" });
      }
      case "profile": {
        await S({ profile: m.profile });
        if (st.consent && st.token) await rpc("ext_profile_save", { p: { token: st.token, ...m.profile } });
        return reply({ ok: true });
      }
      case "recommend": {
        if (!st.consent || !st.token) return reply([]);
        return reply((await rpc("ext_recommend", { p_token: st.token })) || []);
      }
      case "deleteMe": {
        if (st.token) await rpc("ext_delete_me", { p_token: st.token });
        await chrome.storage.local.clear(); try { await chrome.storage.sync.clear(); } catch {} restored = true;  await chrome.storage.session.clear();
        return reply({ ok: true });
      }
      default: return reply(null);
    }
  })();
  return true;
});
