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

const write = (root: string, rel: string, text: string) => { const f = path.join(root, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };
const num = (v: unknown) => { const n = Number(v); return v != null && v !== "" && Number.isFinite(n) ? n : null; };

/** Where a home stands, in one word: the same rules as the notices on its page. */
export function homeState(r: Row, now: number): "advert_offline" | "unconfirmed" | "listed" {
  return isGone(r as any) ? "advert_offline" : isUnconfirmed(r as any, now) ? "unconfirmed" : "listed";
}

/** One line per home. The first line is a header object that says what the file is ("_about"). */
export function homesJsonl(rows: Row[], today: string, now = Date.parse(today + "T12:00:00Z")): string {
  const head = { _about: "RealHunt homes, one JSON object per line after this one", updated: today, license: LICENSE, attribution: "RealHunt (realhunt.co)", docs: `${SITE}/research/open-data`,
    note: "Asking prices in euros from the original listing. The score is RealHunt's own grade from 70 to 98, not a valuation. state: listed, unconfirmed (our nightly check could not confirm the advert for 30 days) or advert_offline (the advert was found removed or the home was reported sold)." };
  const lines = rows.filter((r) => r?.slug && r.price_eur > 0).slice().sort((a, b) => (Number(b.nota) || 0) - (Number(a.nota) || 0) || a.slug.localeCompare(b.slug)).map((r) => {
    const sqm = num(r.sqm);
    return JSON.stringify({
      url: `${SITE}/deal/${r.slug}`, slug: r.slug, title: String(r.title || "").replace(/\s+/g, " ").trim(), title_es: r.title_es ? String(r.title_es).replace(/\s+/g, " ").trim() : null,
      country: r.country || null, region: regionOf(r as any) || null, place: r.location_name || null, lat: num(r.lat), lng: num(r.lng),
      price_eur: Math.round(r.price_eur), size_sqm: sqm, eur_per_sqm: sqm ? Math.round(r.price_eur / sqm) : null, bedrooms: num(r.bedrooms),
      score: num(r.nota), score_summary: scoreLine(r as any) || null, added: String(listedAt(r as any) || "").slice(0, 10) || null,
      state: homeState(r, now), listed_on: r.source_domain || null,
    });
  });
  return [JSON.stringify(head), ...lines].join("\n") + "\n";
}

export function writeHomesJsonl(root: string, rows: Row[], today: string): number {
  const txt = homesJsonl(rows, today);
  write(root, "data/homes.jsonl", txt);
  return txt.split("\n").length - 2;
}

export function writeRemovedFiles(root: string, events: RemovedEvent[], today: string): void {
  write(root, "research/removed-homes.json", JSON.stringify({ v: 1, updated: today, license: LICENSE, attribution: "RealHunt (realhunt.co)", source: `${SITE}/research/removed-homes`,
    kinds: { gone: "the home was marked as no longer for sale: our nightly check found the advert removed on two different days, or a visitor reported it sold", removed: "the home was taken off RealHunt", back: "the home came back after being taken off or marked as no longer for sale", price: "the asking price on RealHunt changed: the nightly check read a new price in the advert, or a person corrected it (old_price_eur is the price before)" },
    events }) + "\n");
  write(root, "research/removed-homes.csv", "﻿" + toCsv(["date", "kind", "url", "title", "country", "place", "price_eur", "old_price_eur", "size_sqm", "listed_on"],
    events.slice().reverse().map((e) => [e.date, e.kind, `${SITE}/deal/${e.slug}`, e.title || "", e.country || "", e.location_name || "", e.price_eur ?? "", e.old_price_eur ?? "", e.sqm ?? "", e.source_domain || ""])));
}
