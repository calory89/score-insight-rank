// Round n10 (21-nov-2026): buyer tools and admin screens. Pure functions only, unit-tested in src/test/n10-logic.test.ts.
// Nothing here invents a figure: every number comes from the snapshot row, the published change log
// (/research/removed-homes.json) or the buying-cost ranges in src/data/destinations.json.
import { allIn, type CheckRow } from "../checkLogic";
import { isGone, isUnconfirmed, listedDays, type StatusRow } from "../n9/status";

const n = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const ms = (iso?: string | null) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? t : null; };
const DAY = 86400000;

// ------------------------------------------------------------------------------------------ feed filters (30, 32)
export type CostsFilter = "known" | "nofee";
export type CostRow = { hoa_monthly?: number | string | null; hoa_unknown?: boolean | null; tax_annual?: number | string | null };
/** "known": the listing states a community fee or the yearly property tax. "nofee": no community fee in the listing
 * and the listing is not a flat whose fee is missing (hoa_unknown). */
export function matchCosts(r: CostRow, mode: string | null | undefined): boolean {
  if (mode === "known") return (n(r.hoa_monthly) || 0) > 0 || (n(r.tax_annual) || 0) > 0;
  if (mode === "nofee") return !((n(r.hoa_monthly) || 0) > 0) && !r.hoa_unknown;
  return true;
}
export const CONFIRMED_DAYS = 30;
/** The nightly check found the original advert online in the last 30 days, and nothing says it is gone. */
export function confirmedRecently(r: StatusRow, now: number = Date.now()): boolean {
  if (isGone(r)) return false;
  const ok = ms(r.src_ok_at);
  return ok != null && now - ok < CONFIRMED_DAYS * DAY && r.src_last !== "gone";
}

// ------------------------------------------------------------------------------------------ cost calculator (26)
export type CostPlan = {
  price: number; pct: [number, number] | null; costsLow: number | null; costsHigh: number | null;
  totalLow: number | null; totalHigh: number | null; monthly: number | null; yearly: number | null;
  firstYearLow: number | null; firstYearHigh: number | null;
};
/** Total cost for an offer price (the asking price when no offer is given): buying costs from the country's usual
 * range, then the yearly fee and property tax stated in the listing. null when there is no usable price. */
export function costPlan(d: CheckRow, offer?: number | null): CostPlan | null {
  const price = n(offer) && Number(offer) > 0 ? Math.round(Number(offer)) : n(d.price_eur) && Number(d.price_eur) > 0 ? Number(d.price_eur) : null;
  if (price == null) return null;
  const a = allIn({ ...d, price_eur: price });
  const yearly = a.monthly != null && a.monthly > 0 ? a.monthly * 12 : null;
  return {
    price, pct: a.pct, costsLow: a.costsLow, costsHigh: a.costsHigh, totalLow: a.totalLow, totalHigh: a.totalHigh,
    monthly: a.monthly != null && a.monthly > 0 ? a.monthly : null, yearly,
    firstYearLow: a.totalLow != null && yearly != null ? a.totalLow + yearly : null,
    firstYearHigh: a.totalHigh != null && yearly != null ? a.totalHigh + yearly : null,
  };
}
/** "85000", "85.000", "85,000 €", "85k" -> 85000; anything else -> null. */
export function parseAmount(s: string): number | null {
  const t = String(s || "").trim().toLowerCase().replace(/[€$£\s]/g, "");
  if (!t) return null;
  const k = /^(\d+(?:[.,]\d+)?)k$/.exec(t);
  if (k) return Math.round(Number(k[1].replace(",", ".")) * 1000);
  const digits = t.replace(/[.,](?=\d{3}(\D|$))/g, "");
  const v = Number(digits.replace(",", "."));
  return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
}

// ------------------------------------------------------------------------------------------ what we do not know (48)
export type UnknownId = "year" | "size" | "beds" | "fee" | "tax" | "energy";
const ENERGY = /\b(energy (class|rating|certificate|performance)|epc\b|classe energ|certificado energ|certificaci[oó]n energ|dpe\b|diagnostic de performance|energieausweis|energielabel|ape\b|attestato di prestazione)/i;
const YEAR = /\b(?:built|constructed|year built|construction year|construido|construida|costruit[oa]|construit[e]?|baujahr|gebaut|bygget|bouwjaar)\D{0,14}?((?:18|19|20)\d{2})\b/i;
export type UnknownRow = CheckRow & { sqm?: number | null; bedrooms?: number | null; year_built?: number | null };
/** Facts a buyer needs that the listing does not give, in the order a buyer would ask them. */
export function unknowns(d: UnknownRow): UnknownId[] {
  const text = `${d.title || ""}. ${d.why_great || ""}. ${d.costs_note || ""}`;
  const out: UnknownId[] = [];
  if (!(d.year_built && d.year_built > 1700) && !YEAR.test(text)) out.push("year");
  if (!(n(d.sqm) || 0)) out.push("size");
  if (d.bedrooms == null) out.push("beds");
  if (!((n(d.hoa_monthly) || 0) > 0) && (d.hoa_unknown || d.category === "city" || /\b(flat|apartment|condo|piso|apartamento|appartamento|appartement|wohnung)\b/i.test(text))) out.push("fee");
  if (!((n(d.tax_annual) || 0) > 0)) out.push("tax");
  if (!ENERGY.test(text)) out.push("energy");
  return out;
}

// ------------------------------------------------------------------------------------------ offer reminder (45)
export const OFFER_DAYS = 90;
/** Days on RealHunt when the home has been listed for 90 days or more and is not marked gone; otherwise null. */
export function offerHintDays(r: StatusRow, now: number = Date.now()): number | null {
  if (isGone(r)) return null;
  const d = listedDays(r, now);
  return d != null && d >= OFFER_DAYS ? d : null;
}

// ------------------------------------------------------------------------------------------ price history (33, 79)
export type LogEvent = { date: string; kind: string; slug: string; title?: string | null; country?: string | null; price_eur?: number | null; old_price_eur?: number | null; source_domain?: string | null };
/** This home's events from the published change log, oldest first. */
export function eventsFor(events: LogEvent[] | null | undefined, slug: string): LogEvent[] {
  return (events || []).filter((e) => e && e.slug === slug).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
}
/** Price changes only, oldest first, each with the difference. */
export function priceSteps(events: LogEvent[] | null | undefined, slug: string): { date: string; from: number; to: number; diff: number; pct: number }[] {
  return eventsFor(events, slug).filter((e) => e.kind === "price" && n(e.old_price_eur) && n(e.price_eur))
    .map((e) => { const from = Number(e.old_price_eur), to = Number(e.price_eur); return { date: e.date, from, to, diff: to - from, pct: Math.round(((to - from) / from) * 1000) / 10 }; });
}
/** Change log grouped by home for the admin screen, newest change first. */
export function logByHome(events: LogEvent[] | null | undefined, query = ""): { slug: string; title: string; last: string; events: LogEvent[] }[] {
  const q = query.trim().toLowerCase();
  const m = new Map<string, LogEvent[]>();
  for (const e of events || []) { if (!e?.slug) continue; if (!m.has(e.slug)) m.set(e.slug, []); m.get(e.slug)!.push(e); }
  return [...m].map(([slug, l]) => {
    const evs = l.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return { slug, title: evs.find((e) => e.title)?.title || slug, last: evs[0]?.date || "", events: evs };
  }).filter((h) => !q || h.slug.includes(q) || h.title.toLowerCase().includes(q))
    .sort((a, b) => b.last.localeCompare(a.last) || a.slug.localeCompare(b.slug));
}

// ------------------------------------------------------------------------------------------ similar homes (34)
export type SimMode = "cheaper" | "bigger" | "sea";
export type SimRow = { id?: string; slug: string; country?: string | null; price_eur?: number | null; sqm?: number | null; nota?: number | null; image_urls?: string[] | null; nearby?: { sea_km?: number | null } | null; sold_reports?: number | null; available_reports?: number | null; publish_at?: string | null };
const seaKm = (r: SimRow) => n(r.nearby?.sea_km);
/** Homes in the same country that are cheaper, bigger or nearer the sea than this one, best score first. */
export function similarBy(rows: SimRow[], d: SimRow, mode: SimMode, limit = 6, now: number = Date.now()): SimRow[] {
  const price = n(d.price_eur), sqm = n(d.sqm), sea = seaKm(d);
  const ok = (r: SimRow) => r.slug !== d.slug && r.country === d.country && !isGone(r as StatusRow) && (r.image_urls || []).length > 0 && n(r.price_eur) != null
    && !(ms(r.publish_at) != null && ms(r.publish_at)! > now);
  let pool = rows.filter(ok);
  if (mode === "cheaper") pool = price ? pool.filter((r) => Number(r.price_eur) < price) : [];
  if (mode === "bigger") pool = sqm ? pool.filter((r) => (n(r.sqm) || 0) > sqm) : [];
  if (mode === "sea") pool = pool.filter((r) => seaKm(r) != null && (sea == null ? seaKm(r)! <= 5 : seaKm(r)! < sea));
  const key = (r: SimRow) => mode === "sea" ? seaKm(r)! : -(n(r.nota) || 0);
  return pool.sort((a, b) => key(a) - key(b) || (n(b.nota) || 0) - (n(a.nota) || 0)).slice(0, limit);
}

// ------------------------------------------------------------------------------------------ airport by car (36)
/** A rough road estimate from the straight-line distance: roads are about 1.3 times longer, at about 70 km/h. */
export function byCar(straightKm: number | null | undefined): { km: number; min: number } | null {
  const k = n(straightKm);
  if (k == null || k <= 0) return null;
  const road = k * 1.3;
  return { km: Math.round(road), min: Math.max(5, Math.round((road / 70) * 60 / 5) * 5) };
}

// ------------------------------------------------------------------------------------------ currency (35, 49)
/** The currency the adverts of a country are written in, when it is not the euro. */
export const LISTING_CCY: Record<string, string> = {
  "United States": "USD", "United Kingdom": "GBP", Canada: "CAD", Mexico: "MXN", Japan: "JPY", Sweden: "SEK", Norway: "NOK", Denmark: "DKK",
  Poland: "PLN", "Czech Republic": "CZK", Czechia: "CZK", Hungary: "HUF", Romania: "RON", Turkey: "TRY", Switzerland: "CHF",
  Thailand: "THB", Indonesia: "IDR", Philippines: "PHP", Brazil: "BRL", Argentina: "ARS", Colombia: "COP", "South Africa": "ZAR", Georgia: "GEL",
  Australia: "AUD", "New Zealand": "NZD", Malaysia: "MYR", Vietnam: "VND", "Dominican Republic": "DOP", "Costa Rica": "CRC", Panama: "USD", Albania: "ALL", Serbia: "RSD",
};
export const listingCurrency = (country?: string | null): string | null => (country && LISTING_CCY[country]) || null;
export const PICK_CCY = ["EUR", "USD", "GBP"] as const;
export type PickCcy = (typeof PICK_CCY)[number];
/** The currency shown next to the price: the visitor's choice, else their own when it is one of the three, else none. */
export function shownCurrency(choice: string | null | undefined, visitor: string | null | undefined): PickCcy | null {
  if (choice && (PICK_CCY as readonly string[]).includes(choice)) return choice as PickCcy;
  if (visitor && (PICK_CCY as readonly string[]).includes(visitor) && visitor !== "EUR") return visitor as PickCcy;
  return null;
}

// ------------------------------------------------------------------------------------------ shared saved list (28)
const SLUG = /^[a-z0-9][a-z0-9_-]{0,119}$/i;
export const SHARE_MAX = 40;
/** "a,b,,a,<x>" -> ["a","b"]: clean, de-duplicated, at most 40. */
export function parseList(raw: string | null | undefined): string[] {
  const out: string[] = [];
  for (const part of String(raw || "").split(",")) {
    let s = part.trim();
    try { s = decodeURIComponent(s); } catch { /* keep */ }
    if (SLUG.test(s) && !out.includes(s)) out.push(s);
    if (out.length >= SHARE_MAX) break;
  }
  return out;
}
export const listHref = (slugs: string[]) => `/hunt/saved?homes=${slugs.slice(0, SHARE_MAX).map(encodeURIComponent).join(",")}`;

// ------------------------------------------------------------------------------------------ private notes (37)
export const NOTES_KEY = "rh.home.notes";
export type Notes = Record<string, { text: string; at: number }>;
export function cleanNotes(v: unknown): Notes {
  const out: Notes = {};
  if (!v || typeof v !== "object" || Array.isArray(v)) return out;
  for (const [k, x] of Object.entries(v as Record<string, any>)) if (SLUG.test(k) && x && typeof x.text === "string" && x.text.trim()) out[k] = { text: x.text.slice(0, 600), at: Number(x.at) || 0 };
  return out;
}
export function setNote(all: Notes, slug: string, text: string, now = Date.now()): Notes {
  const next = { ...all };
  const tt = String(text || "").slice(0, 600);
  if (tt.trim()) next[slug] = { text: tt, at: now }; else delete next[slug];
  return next;
}

// ------------------------------------------------------------------------------------------ group homes (53)
/** Homes and projects of RealHunt's own group (Equinox Investment Group, Eco Beach City). */
export function isGroupHome(d: { slug?: string | null; hunter_handle?: string | null; source_domain?: string | null; source_url?: string | null; developer?: any }): boolean {
  const dev = typeof d.developer === "object" && d.developer ? `${d.developer.slug || ""} ${d.developer.name || ""}` : String(d.developer || "");
  const s = `${d.hunter_handle || ""} ${d.source_domain || ""} ${d.source_url || ""} ${dev}`.toLowerCase();
  return /\b(ecobeachcity|eco beach city|equinoxinvestmentgroup|equinox investment)\b/.test(s) || /^ebc$|^ecobeachcity/.test(String(d.slug || ""));
}

// ------------------------------------------------------------------------------------------ admin (76, 80)
export type AdminRow = StatusRow & { id?: string; title?: string | null; source_url?: string | null; hunter_handle?: string | null };
/** Homes whose advert is not confirmed online, the longest unconfirmed first. `days` counts from the last time the
 * advert was found online, or from publication when it never was. */
export function unconfirmedQueue(rows: AdminRow[], now: number = Date.now()): (AdminRow & { days: number | null; never: boolean })[] {
  return rows.filter((r) => isUnconfirmed(r, now)).map((r) => {
    const ok = ms(r.src_ok_at), pub = ms(r.publish_at) ?? ms(r.approved_at);
    const from = ok ?? pub;
    return { ...r, days: from != null ? Math.floor((now - from) / DAY) : null, never: ok == null };
  }).sort((a, b) => (b.days ?? -1) - (a.days ?? -1) || String(a.slug).localeCompare(String(b.slug)));
}
export type PortalStat = { domain: string; homes: number; price: number; photos: number; ok: number; blocked: number; gone: number; error: number; none: number; lastOk: string | null; warn: string[] };
const domainOf = (r: AdminRow) => {
  if (r.source_domain) return String(r.source_domain).replace(/^www\./, "");
  try { return r.source_url ? new URL(r.source_url).hostname.replace(/^www\./, "") : "(no portal)"; } catch { return "(no portal)"; }
};
/** Per portal: how many homes, how many have a price and photos, and what the nightly check last read. A warning
 * when most homes of a portal (3 or more) have no price or no photo, or when the check could not read most of them. */
export function portalStats(rows: AdminRow[]): PortalStat[] {
  const m = new Map<string, PortalStat>();
  for (const r of rows) {
    const k = domainOf(r);
    const s = m.get(k) || { domain: k, homes: 0, price: 0, photos: 0, ok: 0, blocked: 0, gone: 0, error: 0, none: 0, lastOk: null, warn: [] };
    s.homes++;
    if ((n(r.price_eur) || 0) > 0) s.price++;
    if ((r.image_urls || []).filter(Boolean).length > 0) s.photos++;
    const v = String(r.src_last || "");
    if (v === "ok" || v === "blocked" || v === "gone" || v === "error") s[v]++; else s.none++;
    if (r.src_ok_at && (!s.lastOk || r.src_ok_at > s.lastOk)) s.lastOk = r.src_ok_at;
    m.set(k, s);
  }
  for (const s of m.values()) {
    if (s.homes >= 3 && s.price < s.homes / 2) s.warn.push("price");
    if (s.homes >= 3 && s.photos < s.homes / 2) s.warn.push("photos");
    const read = s.ok + s.blocked + s.gone + s.error;
    if (s.homes >= 3 && read > 0 && s.blocked + s.error > s.ok + s.gone) s.warn.push("check");
  }
  return [...m.values()].sort((a, b) => b.warn.length - a.warn.length || b.homes - a.homes || a.domain.localeCompare(b.domain));
}
/** Fields a person must look at before approving an imported home. */
export function importIssues(d: { price_eur?: number | null; sqm?: number | null; bedrooms?: number | null; location_name?: string | null; country?: string | null; image_urls?: string[] | null; source_url?: string | null; title?: string | null }): string[] {
  const out: string[] = [];
  if (!((n(d.price_eur) || 0) > 0)) out.push("No price");
  if (!((n(d.sqm) || 0) > 0)) out.push("No size (m²)");
  if (d.bedrooms == null) out.push("No bedrooms");
  if (!String(d.location_name || "").trim()) out.push("No town");
  if (!String(d.country || "").trim()) out.push("No country");
  const photos = (d.image_urls || []).filter(Boolean).length;
  if (photos === 0) out.push("No photos"); else if (photos < 4) out.push(`Only ${photos} photo${photos === 1 ? "" : "s"}`);
  if (!/^https?:\/\//i.test(String(d.source_url || ""))) out.push("No advert link");
  else if (/instagram\.com|facebook\.com|tiktok\.com/i.test(String(d.source_url))) out.push("Advert link is a social post");
  const p = n(d.price_eur), s = n(d.sqm);
  if (p && s && p / s < 150) out.push("Price per m² under €150: check it is not land or a plot size");
  return out;
}

export type ProbeStat = { domain: string; probes: number; ok: number; ok_price: number; blocked: number; gone: number; error: number; prev_ok: number; prev_ok_price: number; prev_blocked: number; last_ok: string | null; last_price: string | null };
/** From community_admin_portal_health: a portal that used to give the price in most "online" readings and now gives
 * it in few, or that used to let the check in and now blocks most readings. Needs at least 5 readings each side. */
export function probeAlarms(p: ProbeStat): ("price_stopped" | "now_blocked")[] {
  const out: ("price_stopped" | "now_blocked")[] = [];
  if (p.prev_ok >= 5 && p.ok >= 5 && p.prev_ok_price / p.prev_ok >= 0.5 && p.ok_price / p.ok < 0.2) out.push("price_stopped");
  const prevAll = p.prev_ok + p.prev_blocked, all = p.ok + p.blocked;
  if (prevAll >= 5 && all >= 5 && p.prev_blocked / prevAll < 0.3 && p.blocked / all > 0.7) out.push("now_blocked");
  return out;
}
