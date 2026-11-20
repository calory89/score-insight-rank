// The public log of homes that left RealHunt or whose advert went offline, and of price changes (20-nov-2026,
// ideas 49, 95 and 100).
// Three sources, merged by the build:
//   seo/reach/removed-seed.json   the history rebuilt from git by scripts/removed_seed.py (from 24-oct-2026);
//   the published log             ${SITE}/research/removed-homes.json, the copy every build leaves behind;
//   today's difference            the live snapshot (yesterday's homes) against public/data/rh-static.json.
// Without the network (RH_SEO_STATE=off, a local build) the log is the seed plus what the published copy had, and
// nothing new is claimed. The kinds of event and what each one means are the rules of src/community/n9/status.ts.
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { isGone } from "../../src/community/n9/status";

export const SITE = "https://realhunt.co";
export type RemovedKind = "gone" | "removed" | "back" | "price";
export type RemovedEvent = {
  date: string; kind: RemovedKind; slug: string; title?: string | null; title_es?: string | null; country?: string | null;
  location_name?: string | null; price_eur?: number | null; sqm?: number | null; source_domain?: string | null; was_gone?: boolean; old_price_eur?: number | null;
};
type Snap = { slug: string; sold_reports?: number | null; available_reports?: number | null; [k: string]: any };

const brief = (r: Snap) => ({ slug: r.slug, title: r.title ?? null, title_es: r.title_es ?? null, country: r.country ?? null, location_name: r.location_name ?? null, price_eur: r.price_eur ?? null, sqm: r.sqm ?? null, source_domain: r.source_domain ?? null });

/** What happened between two snapshots: homes no longer in it, homes newly marked gone, homes back. */
export function diffSnapshots(day: string, prev: Snap[], cur: Snap[], seen: Set<string> = new Set()): RemovedEvent[] {
  const p = new Map(prev.filter((r) => r?.slug).map((r) => [r.slug, r])), c = new Map(cur.filter((r) => r?.slug).map((r) => [r.slug, r]));
  const out: RemovedEvent[] = [];
  for (const [s, r] of p) {
    const now = c.get(s);
    if (!now) out.push({ date: day, kind: "removed", was_gone: isGone(r), ...brief(r) });
    else if (isGone(now) && !isGone(r)) out.push({ date: day, kind: "gone", ...brief(now) });
    else if (isGone(r) && !isGone(now)) out.push({ date: day, kind: "back", ...brief(now) });
    const a = Math.round(Number(r.price_eur) || 0), b = Math.round(Number(now?.price_eur) || 0);
    if (now && a > 0 && b > 0 && a !== b) out.push({ date: day, kind: "price", old_price_eur: a, ...brief(now) });
  }
  for (const [s, r] of c) if (!p.has(s) && seen.has(s)) out.push({ date: day, kind: "back", ...brief(r) });
  return out;
}

const valid = (e: any): e is RemovedEvent => e && typeof e === "object" && /^\d{4}-\d{2}-\d{2}$/.test(String(e.date)) && ["gone", "removed", "back", "price"].includes(e.kind) && typeof e.slug === "string" && /^[A-Za-z0-9_-]+$/.test(e.slug);
/** One event per day, kind and home, oldest first. */
export function mergeEvents(...lists: unknown[]): RemovedEvent[] {
  const by = new Map<string, RemovedEvent>();
  for (const l of lists) if (Array.isArray(l)) for (const e of l) if (valid(e)) by.set(`${e.date}|${e.kind}|${e.slug}`, e);
  return [...by.values()].sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug));
}

const curl = (u: string): any => { try { return JSON.parse(spawnSync("curl", ["-fsS", "--max-time", "12", u], { encoding: "utf8", timeout: 15000, maxBuffer: 64 << 20 }).stdout || "null"); } catch { return null; } };

/** The log for this build. `fetcher` is for tests. */
export function buildRemovedLog(rows: Snap[], today: string, fetcher: (u: string) => any = curl): RemovedEvent[] {
  let seed: unknown = [];
  try { seed = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "seo/reach/removed-seed.json"), "utf8")).events; } catch { seed = []; }
  const online = process.env.RH_SEO_STATE !== "off";
  const published = online ? fetcher(`${SITE}/research/removed-homes.json`) : null;
  let events = mergeEvents(seed, published?.events);
  if (online) {
    const live = fetcher(`${SITE}/data/rh-static.json`);
    const liveRows: Snap[] = Array.isArray(live?.rows) ? live.rows : [];
    const liveDay = String(live?.generated || "").slice(0, 10);
    // only a snapshot from an earlier day is "yesterday"; the same day's copy (a second build) adds nothing
    if (liveRows.length && liveDay && liveDay < today) {
      const seen = new Set(events.map((e) => e.slug));
      events = mergeEvents(events, diffSnapshots(today, liveRows, rows, seen));
    }
  }
  return events;
}

/** A removal is "taken off" unless the same home came back later. */
export function currentState(events: RemovedEvent[]): Map<string, RemovedEvent> {
  const m = new Map<string, RemovedEvent>();
  for (const e of events) { if (e.kind === "back") m.delete(e.slug); else if (e.kind !== "price") m.set(e.slug, e); }
  return m;
}

let memo: { key: string; events: RemovedEvent[] } | null = null;
/** buildRemovedLog once per build: the trust pages and the data log read the same events. */
export function removedLog(rows: Snap[], today: string): RemovedEvent[] {
  const key = `${today}|${rows.length}`;
  if (!memo || memo.key !== key) memo = { key, events: buildRemovedLog(rows, today) };
  return memo.events;
}
