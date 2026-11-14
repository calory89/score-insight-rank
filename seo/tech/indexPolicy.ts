// Which pages of two big families stay in the index (ideas 127 and 128 of the organic-traffic list). Both are a
// decision for the owner, taken with Search Console open: today every comparison (/countries/a-vs-b) and every
// nationality page (/can-i-buy/<nationality>-in-<country>) is indexable.
//
// To act on it, fill one of the two lists below and build. A family with an empty list is left alone. A page that
// is not on its list gets "noindex, follow", loses its hreflang and leaves the sitemaps (seo/polish.ts does all
// three), and its Spanish twin follows it.
//
//   KEEP_COMPARISONS = ["spain-vs-portugal", "italy-vs-spain"]      the 40 pairs with real searches
//   KEEP_NATIONALITIES = ["american", "british", "german", "dutch", "russian"]
export const KEEP_COMPARISONS: string[] = [];
export const KEEP_NATIONALITIES: string[] = [];

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function extraNoindex(pairs: string[] = KEEP_COMPARISONS, nationalities: string[] = KEEP_NATIONALITIES): [RegExp, number, string][] {
  const out: [RegExp, number, string][] = [];
  if (pairs.length) out.push([new RegExp(`^/countries/(?!(?:${pairs.map(escRe).join("|")})$)[^/]+$`), Infinity, "comparison without searches yet"]);
  if (nationalities.length) out.push([new RegExp(`^/can-i-buy/(?!(?:${nationalities.map(escRe).join("|")})-in-)[^/]+$`), Infinity, "nationality page without searches yet"]);
  return out;
}
/** Rules added to NOINDEX_RULES of seo/polish.ts: [address, minimum words to stay indexed, reason]. */
export const EXTRA_NOINDEX = extraNoindex();
