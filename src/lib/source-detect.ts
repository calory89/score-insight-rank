/**
 * Detect listing source from a URL. Returns null if unknown.
 */
export type ListingSource = {
  platform: string;
  country: string;
  countryCode: string;
  flag: string;
};

const HOST_MAP: Array<[RegExp, ListingSource]> = [
  [/(^|\.)idealista\.com$/i, { platform: "Idealista", country: "Spain", countryCode: "ES", flag: "🇪🇸" }],
  [/(^|\.)idealista\.it$/i, { platform: "Idealista", country: "Italy", countryCode: "IT", flag: "🇮🇹" }],
  [/(^|\.)idealista\.pt$/i, { platform: "Idealista", country: "Portugal", countryCode: "PT", flag: "🇵🇹" }],
  [/(^|\.)zillow\.com$/i, { platform: "Zillow", country: "United States", countryCode: "US", flag: "🇺🇸" }],
  [/(^|\.)redfin\.com$/i, { platform: "Redfin", country: "United States", countryCode: "US", flag: "🇺🇸" }],
  [/(^|\.)rightmove\.co\.uk$/i, { platform: "Rightmove", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧" }],
  [/(^|\.)zoopla\.co\.uk$/i, { platform: "Zoopla", country: "United Kingdom", countryCode: "GB", flag: "🇬🇧" }],
  [/(^|\.)propertyfinder\.ae$/i, { platform: "Property Finder", country: "UAE", countryCode: "AE", flag: "🇦🇪" }],
  [/(^|\.)bayut\.com$/i, { platform: "Bayut", country: "UAE", countryCode: "AE", flag: "🇦🇪" }],
  [/(^|\.)airbnb\.[a-z.]+$/i, { platform: "Airbnb", country: "Short-term rental", countryCode: "STR", flag: "🏠" }],
  [/(^|\.)booking\.com$/i, { platform: "Booking", country: "Short-term rental", countryCode: "STR", flag: "🏠" }],
];

export function detectListingSource(url: string): ListingSource | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    for (const [re, src] of HOST_MAP) {
      if (re.test(host)) return src;
    }
    return null;
  } catch {
    return null;
  }
}

export function isLikelyListingUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
