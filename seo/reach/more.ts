// More files for machines (20-nov-2026, ideas 42, 46 and 100 of the list of 100):
//   /data/homes.jsonl                     every home on the site, one JSON object per line (CC BY 4.0)
//   /research/removed-homes.json, .csv    the log of homes taken off the site or whose advert went offline
// Public fields only, computed from public/data/rh-static.json at build time.
import fs from "fs";
import path from "path";
import { regionOf } from "../../src/community/regions";
import { isGone, isUnconfirmed, listedAt } from "../../src/community/n9/status";
import { LICENSE, SITE } from "../assetsKit";
import { toCsv } from "../assetsStats";
import { scoreLine } from "../dealNotes";
import type { RemovedEvent } from "./removed";
import type { Row } from "./data";
import { round3 } from "./ai";

const write = (root: string, rel: string, text: string) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const num = (v: unknown) => { const n = Number(v); return v != null && v !== "" && Number.isFinite(n) ? n : null; };

/** Where a home stands, in one word: the same rules as the notices on its page. */
export function homeState(r: Row, now: number): "advert_offline" | "unconfirmed" | "listed" {
  return isGone(r as any) ? "advert_offline" : isUnconfirmed(r as any, now) ? "unconfirmed" : "listed";
}

/** Costs, risks and the nightly check of a home (26-nov-2026, list of 1,000, idea 604): what the listing states,
 * nothing estimated. Fee and tax are in costs_currency (the listing's currency, euros when it gives none). */
export function extras(r: Row) {
  const x = r as any, rk = x.risks || {};
  const lvl = (v: unknown) => (["low", "medium", "high"].includes(String(v)) ? String(v) : null);
  const fee = num(x.hoa_monthly), tax = num(x.tax_annual);
  return {
    monthly_fee: fee && fee > 0 ? fee : null, yearly_tax: tax && tax > 0 ? tax : null, costs_currency: fee || tax ? String(x.hoa_currency || "EUR") : null, fee_unknown: x.hoa_unknown === true,
    flood_indicator: lvl(rk.flood?.level), noise_indicator: lvl(rk.noise?.level), airport_km: num(x.airport_km),
    last_confirmed: /^\d{4}-\d{2}-\d{2}/.test(String(x.src_ok_at || "")) ? String(x.src_ok_at).slice(0, 10) : null,
  };
}

/** One line per home. The first line is a header object that says what the file is ("_about"). */
export function homesJsonl(rows: Row[], today: string, now = Date.parse(today + "T12:00:00Z")): string {
  const head = { _about: "RealHunt homes, one JSON object per line after this one", updated: today, license: LICENSE, attribution: "RealHunt (realhunt.co)", docs: `${SITE}/research/open-data`,
    note: "Asking prices in euros from the original listing. The score is RealHunt's own grade from 70 to 98, not a valuation. Coordinates are rounded to 3 decimals (about 100 m). monthly_fee and yearly_tax are as the listing states them, in costs_currency. last_confirmed: the last day our nightly check read the advert as for sale. state: listed, unconfirmed (our nightly check could not confirm the advert for 30 days) or advert_offline (the advert was found removed or the home was reported sold)." };
  const lines = rows.filter((r) => r?.slug && r.price_eur > 0).slice().sort((a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0) || a.slug.localeCompare(b.slug)).map((r) => {
    const sqm = num(r.sqm);
    return JSON.stringify({
      url: `${SITE}/deal/${r.slug}`, slug: r.slug, title: String(r.title || "").replace(/\s+/g, " ").trim(), title_es: r.title_es ? String(r.title_es).replace(/\s+/g, " ").trim() : null,
      country: r.country || null, region: regionOf(r as any) || null, place: r.location_name || null, lat: round3(r.lat), lng: round3(r.lng),
      price_eur: Math.round(r.price_eur), size_sqm: sqm, eur_per_sqm: sqm ? Math.round(r.price_eur / sqm) : null, bedrooms: num(r.bedrooms),
      score: num(r.nota), score_summary: scoreLine(r as any) || null, added: String(listedAt(r as any) || "").slice(0, 10) || null,
      state: homeState(r, now), listed_on: r.source_domain || null, ...extras(r),
    });
  });
  return [JSON.stringify(head), ...lines].join("\n") + "\n";
}

export function writeHomesJsonl(root: string, rows: Row[], today: string): number {
  const txt = homesJsonl(rows, today);
  write(root, "data/homes.jsonl", txt);
  return txt.split("\n").length - 2;
}

/** Idea 623: homes that left the site, came back or changed price, counted month by month. */
export function removedByMonth(events: RemovedEvent[]): { month: string; gone: number; removed: number; back: number; price_down: number; price_up: number }[] {
  const by = new Map<string, any>();
  for (const e of events) {
    const m = e.date.slice(0, 7); const o = by.get(m) || { month: m, gone: 0, removed: 0, back: 0, price_down: 0, price_up: 0 };
    if (e.kind === "price") { if ((e.price_eur ?? 0) < (e.old_price_eur ?? 0)) o.price_down++; else o.price_up++; } else o[e.kind]++;
    by.set(m, o);
  }
  return [...by.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Idea 607: price drops and homes taken off the site as JSON Feed 1.1, newest first. */
export function eventFeed(kind: "drops" | "removed", events: RemovedEvent[], onSite: Set<string>): string {
  const eur = (n: number) => "€" + Math.round(n).toLocaleString("en");
  const sel = events.filter((e) => (kind === "drops" ? e.kind === "price" && (e.price_eur ?? 0) > 0 && (e.price_eur ?? 0) < (e.old_price_eur ?? 0) && onSite.has(e.slug) : e.kind === "removed" || e.kind === "gone")).slice().reverse().slice(0, 100);
  const name = (e: RemovedEvent) => String(e.title || e.location_name || e.slug).replace(/\s+/g, " ").trim();
  const items = sel.map((e) => ({
    id: `${SITE}/deal/${e.slug}#${e.kind}-${e.date}`, url: onSite.has(e.slug) ? `${SITE}/deal/${e.slug}` : `${SITE}/research/removed-homes`,
    title: kind === "drops" ? `${eur(e.old_price_eur!)} to ${eur(e.price_eur!)} · ${name(e)}` : `${e.kind === "gone" ? "No longer for sale" : "Taken off RealHunt"} · ${name(e)}`,
    content_text: kind === "drops" ? `The asking price went down by ${eur(e.old_price_eur! - e.price_eur!)} (${Math.round((1 - e.price_eur! / e.old_price_eur!) * 100)}%). ${e.location_name || e.country || ""}`.trim()
      : `${e.location_name || e.country || ""}${e.price_eur ? `, last asking price ${eur(e.price_eur)}` : ""}.`,
    date_published: e.date + "T07:00:00Z", tags: e.country ? [e.country] : [], _realhunt: { kind: e.kind, price_eur: e.price_eur ?? null, old_price_eur: e.old_price_eur ?? null, country: e.country ?? null },
  }));
  return JSON.stringify({ version: "https://jsonfeed.org/version/1.1", title: kind === "drops" ? "RealHunt: price drops" : "RealHunt: homes taken off the site", home_page_url: `${SITE}/research/removed-homes`, feed_url: `${SITE}/feeds/${kind === "drops" ? "price-drops" : "removed"}.json`,
    description: kind === "drops" ? "Homes on RealHunt whose asking price went down, newest first. Text and figures: CC BY 4.0." : "Homes that left RealHunt or whose advert went offline, newest first. Text and figures: CC BY 4.0.", language: "en", authors: [{ name: "RealHunt", url: `${SITE}/about` }], items }) + "\n";
}

export function writeRemovedFiles(root: string, events: RemovedEvent[], today: string, onSite: Set<string> = new Set()): void {
  if (!onSite.size) try { for (const r of JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "public/data/rh-static.json"), "utf8")).rows || []) if (r?.slug) onSite.add(r.slug); } catch { /* no snapshot */ }
  const months = removedByMonth(events);
  write(root, "research/removed-by-month.json", JSON.stringify({ updated: today, license: LICENSE, attribution: "RealHunt (realhunt.co)", source: `${SITE}/research/removed-homes`, note: "Counts of the events of /research/removed-homes.json by month. The log starts on 24-oct-2026.", months }) + "\n");
  write(root, "research/removed-by-month.csv", "﻿" + toCsv(["month", "gone", "removed", "back", "price_down", "price_up"], months.map((m) => [m.month, m.gone, m.removed, m.back, m.price_down, m.price_up])));
  write(root, "feeds/price-drops.json", eventFeed("drops", events, onSite));
  write(root, "feeds/removed.json", eventFeed("removed", events, onSite));
  write(root, "research/removed-homes.json", JSON.stringify({ v: 1, updated: today, license: LICENSE, attribution: "RealHunt (realhunt.co)", source: `${SITE}/research/removed-homes`,
    kinds: { gone: "the home was marked as no longer for sale: our nightly check found the advert removed on two different days, or a visitor reported it sold", removed: "the home was taken off RealHunt", back: "the home came back after being taken off or marked as no longer for sale", price: "the asking price on RealHunt changed: the nightly check read a new price in the advert, or a person corrected it (old_price_eur is the price before)" },
    events }) + "\n");
  write(root, "research/removed-homes.csv", "﻿" + toCsv(["date", "kind", "url", "title", "country", "place", "price_eur", "old_price_eur", "size_sqm", "listed_on"],
    events.slice().reverse().map((e) => [e.date, e.kind, `${SITE}/deal/${e.slug}`, e.title || "", e.country || "", e.location_name || "", e.price_eur ?? "", e.old_price_eur ?? "", e.sqm ?? "", e.source_domain || ""])));
}
