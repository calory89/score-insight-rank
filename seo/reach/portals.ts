// The public directory of property portals by country (15-nov-2026, idea 691 of the organic list).
// Source: supabase/functions/realhunt-live-search/portals.ts, the list the live search uses. Only the name, the
// country and the web address are published. The results of our own reading tests (`read`) and the test pages
// (`probe`) are internal and stay out: this page describes the portals, it does not judge them.
import { PORTALS } from "../../supabase/functions/realhunt-live-search/portals";
import { esPlace } from "../../src/lib/lang";
import { englishLeft } from "../es";
import { cKey } from "../assetsStats";

/** The day the list in portals.ts was last compiled by hand. Change it when that file changes. */
export const PORTALS_DATE = "2026-11-09";

export type PortalRow = { name: string; domain: string; url: string };
export type PortalCountry = { cc: string; key: string; country: string; portals: PortalRow[] };

// Country names that src/lib/lang.ts does not translate yet (they are not countries with homes on the site).
const ES_COUNTRY: Record<string, string> = { Peru: "Perú", "Dominican Republic": "República Dominicana", "United Arab Emirates": "Emiratos Árabes Unidos", "South Africa": "Sudáfrica", "New Zealand": "Nueva Zelanda", Iceland: "Islandia" };
export const countryEs = (name: string) => ES_COUNTRY[name] || esPlace(name);

// The front page of the portal: the host of the address we already use to reach it (never the search page itself).
const origin = (probe: string | undefined, domain: string) => { try { const u = new URL(String(probe)); if (u.protocol === "https:" && clean(u.hostname).endsWith(domain)) return `https://${u.hostname}/`; } catch { /* no usable address */ } return `https://${domain}/`; };
const clean = (d: string) => d.toLowerCase().replace(/^www\./, "").replace(/\/.*$/, "");

/** The directory: one entry per country, in the order of the source file; inside a country, the order we check them. */
export function portalDirectory(): PortalCountry[] {
  return PORTALS.filter((c) => c?.country && Array.isArray(c.portals) && c.portals.length).map((c) => ({
    cc: c.cc, key: cKey(c.country === "Czechia" ? "Czech Republic" : c.country), country: c.country,
    portals: c.portals.filter((p) => p?.d && p?.name && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(clean(p.d))).map((p) => ({ name: p.name, domain: clean(p.d), url: origin(p.probe, clean(p.d)) })),
  })).filter((c) => c.portals.length);
}

export const portalCount = (dir: PortalCountry[]) => new Set(dir.flatMap((c) => c.portals.map((p) => p.domain))).size;

/** A portal's name as shown on the Spanish page: the name, or its web address when the name is made of English words. */
export const portalNameEs = (p: PortalRow) => (englishLeft(p.name).english ? p.domain : p.name);
