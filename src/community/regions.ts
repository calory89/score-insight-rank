// Region of a home, from its location_name ("Árchez, Málaga, Spain" -> "Málaga"). Shared by the build-time
// prerender (seo/prerender.ts) and the /homes/:country/:region page, so both list exactly the same homes.
export const slugify = (s: string) =>
  String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/ß/g, "ss").replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// 22-nov-2026: a few listings put the province and region in one bracket ("Semproniano (Grosseto, Tuscany)"). Split on
// every comma, those homes had "Tuscany)" as their region and a part "Semproniano (Grosseto". A bracket that holds a
// comma is read as more parts of the place: "Semproniano, Grosseto, Tuscany". Brackets without a comma stay as they are.
/** The parts of a home's place, most local first: "Pairola, San Bartolomeo al Mare (Imperia, Liguria)" -> Pairola,
 * San Bartolomeo al Mare, Imperia, Liguria. Empty parts are left out. */
export const locationParts = (loc: string | null | undefined): string[] =>
  String(loc || "").replace(/\s*\(([^()]*,[^()]*)\)/g, ", $1").split(",").map((p) => p.trim()).filter(Boolean);

export function regionOf(row: { location_name?: string | null; country?: string | null }): string {
  const country = String(row.country || "").toLowerCase();
  const parts = locationParts(row.location_name).filter((p) => p.toLowerCase() !== country);
  return parts.length ? parts[parts.length - 1] : "";
}

export const regionSlug = (row: { location_name?: string | null; country?: string | null }) => slugify(regionOf(row));
// Price-band slugs ("under-60000") are not regions.
export const isPriceCap = (cap: string) => /^under-\d+$/.test(cap);

// Home-type pages: /homes/<country>/by-the-sea, /village-houses, /in-town (category of each home). Shared with
// seo/prerender.ts, which builds them for every country with at least 3 homes of that type.
export const HOME_TYPES: Record<string, { cat: string; label: string; h1: (place: string) => string }> = {
  "by-the-sea": { cat: "beach", label: "By the sea", h1: (p) => `Homes by the sea in ${p}` },
  "village-houses": { cat: "village", label: "Village houses", h1: (p) => `Village houses for sale in ${p}` },
  "in-town": { cat: "city", label: "In town", h1: (p) => `Homes in town in ${p}` },
};
