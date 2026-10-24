// Region of a home, from its location_name ("Árchez, Málaga, Spain" -> "Málaga"). Shared by the build-time
// prerender (seo/prerender.ts) and the /homes/:country/:region page, so both list exactly the same homes.
export const slugify = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/ß/g, "ss").replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function regionOf(row: { location_name?: string | null; country?: string | null }): string {
  const country = String(row.country || "").toLowerCase();
  const parts = String(row.location_name || "").split(",").map((p) => p.trim()).filter((p) => p && p.toLowerCase() !== country);
  return parts.length ? parts[parts.length - 1] : "";
}

export const regionSlug = (row: { location_name?: string | null; country?: string | null }) => slugify(regionOf(row));
// Price-band slugs ("under-60000") are not regions.
export const isPriceCap = (cap: string) => /^under-\d+$/.test(cap);
