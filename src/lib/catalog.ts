import { EBC, HOME_MAX_PRICE, IG, norm } from "@/lib/rh";

export type CatalogFilters = { country: string; beach: boolean; maxP: number; q: string };
export const EMPTY_FILTERS: CatalogFilters = { country: "All", beach: false, maxP: 0, q: "" };
export const COMO: IG = { id: "como-1", source_account: "", shortcode: "como-1", caption: null, image_urls: ["/finds/como-1.webp"], posted_at: null, location_name: "Lake Como, Italy", country_guess: "Italy", price_eur: 46000, price_raw: null, likes: null, is_beach: false };
export const homePath = (home: IG) => home.shortcode === "ecobeachcity" ? "/ecobeachcity" : home.shortcode === "como-1" ? "/lake-como" : `/find/${encodeURIComponent(home.shortcode)}`;
export const specialHome = (code: string) => code === "ecobeachcity" ? EBC : code === "como-1" ? COMO : undefined;
export function matchesHome(home: IG, filters: CatalogFilters, account?: string) {
  const query = filters.q.trim().toLocaleLowerCase();
  return home.price_eur != null && home.price_eur <= HOME_MAX_PRICE &&
    (!filters.maxP || home.price_eur <= filters.maxP) &&
    (filters.country === "All" || norm(home.country_guess) === filters.country) &&
    (!filters.beach || home.is_beach === true) && (!account || home.source_account === account) &&
    (!query || `${home.hook || ""} ${home.location_name || ""} ${home.country_guess || ""} ${home.shortcode === "ecobeachcity" ? "beach cabin ecobeachcity" : ""}`.toLocaleLowerCase().includes(query));
}
export function filterSearch(filters: CatalogFilters, sort: string, original = "") {
  const params = new URLSearchParams(original);
  ["country", "beach", "max", "q", "sort"].forEach(key => params.delete(key));
  if (filters.country !== "All") params.set("country", filters.country);
  if (filters.beach) params.set("beach", "1");
  if (filters.maxP) params.set("max", String(filters.maxP));
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (sort !== "best") params.set("sort", sort);
  const query = params.toString();
  return query ? `?${query}` : "";
}
export function filtersFromUrl(search: string, routeCountry?: string): CatalogFilters {
  const p = new URLSearchParams(search);
  const max = Number(p.get("max"));
  return { country: p.get("country") || routeCountry || "All", q: (p.get("q") || "").slice(0, 200), beach: p.get("beach") === "1", maxP: Number.isFinite(max) && max > 0 ? Math.min(max, HOME_MAX_PRICE) : 0 };
}
export function readSession<T>(key: string, fallback: T): T {
  try { return JSON.parse(sessionStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}
export function writeSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing still works without storage. */ }
}
export function comparisonCodes(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((s): s is string => typeof s === "string" && /^[\w-]{1,100}$/.test(s)))].slice(0, 3) : [];
}
export const availability = (home: IG) => {
  const status = (home as IG & { status?: string }).status;
  return status === "sold" ? "Sold" : status === "reserved" ? "Reserved" : "Not confirmed";
};
