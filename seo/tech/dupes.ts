// Homes that look like the same home twice (21-nov-2026, list 2 idea 73). Run at every build by seo/tech/plugin.ts on
// the snapshot the site publishes. Three signs, each listed in dist/seo-audit.json (tech.dupes) and in the build log:
//   - the same first photo URL
//   - the same original advert (source URL without scheme, www, #hash, trailing slash or case)
//   - the same price, the same size rounded to 5 m² and the same place
// Only an exact duplicate source URL stops the build: that is certainly one advert published twice. The other two are
// for a person to look at (two flats in one building can share a price, size and town).
type Row = Record<string, any>;
export type DupeGroup = { why: "photo" | "source" | "price_size_place"; key: string; slugs: string[] };

export const sourceKey = (u: unknown) => String(u || "").trim().replace(/^https?:\/\/(www\.)?/i, "").split("#")[0].replace(/\/+$/, "").toLowerCase();

export function findDupes(rows: Row[]): { groups: DupeGroup[]; failures: string[] } {
  const by = (why: DupeGroup["why"], key: (r: Row) => string | null) => {
    const m = new Map<string, string[]>();
    for (const r of rows) { const k = key(r); if (k) (m.get(k) || m.set(k, []).get(k)!).push(String(r.slug)); }
    return [...m].filter(([, s]) => s.length > 1).map(([k, slugs]) => ({ why, key: k, slugs }));
  };
  const groups = [
    ...by("source", (r) => (r.source_url ? sourceKey(r.source_url) || null : null)),
    ...by("photo", (r) => { const u = Array.isArray(r.image_urls) ? r.image_urls[0] : null; return u ? String(u) : null; }),
    ...by("price_size_place", (r) => {
      const p = Number(r.price_eur), s = Number(r.sqm), place = String(r.location_name || "").trim().toLowerCase();
      return p > 0 && s > 0 && place ? `${Math.round(p)}|${Math.round(s / 5) * 5}|${place}|${String(r.country || "").toLowerCase()}` : null;
    }),
  ];
  const failures = groups.filter((g) => g.why === "source").map((g) => `the same advert is published twice (${g.key}): ${g.slugs.join(", ")}`);
  return { groups, failures };
}
