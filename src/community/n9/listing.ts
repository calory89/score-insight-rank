// Listing pages (/homes/..., /cheap-houses/...) are prerendered HTML shown as it is (listingRoute.tsx). These
// helpers read that HTML so the app can add what a static page cannot: the order of the homes for "previous / next"
// on a home's page, the way back to the listing, sharing, and a table that sorts on a tap. Pure functions, tested.

/** The homes of a listing in page order, without repeats: slugs from its links to /deal/<slug> (or /es/deal/<slug>). */
export function listingSlugs(hrefs: string[]): string[] {
  const out: string[] = [];
  for (const h of hrefs) {
    const m = /^(?:\/es)?\/deal\/([A-Za-z0-9_-]+)(?:[?#].*)?$/.exec(h || "");
    if (m && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

/** Sort value of a table cell: "€12,000" -> 12000, "48 m²" -> 48, "12.000 €" -> 12000, "·" -> null (always last). */
export function cellValue(text: string, datetime?: string | null): number | string | null {
  if (datetime) { const t = Date.parse(datetime); if (Number.isFinite(t)) return t; }
  const s = (text || "").replace(/ /g, " ").trim();
  if (!s || s === "·" || s === "–" || s === "-") return null;
  const m = /-?\d[\d.,]*/.exec(s);
  if (m && /^[^A-Za-zÀ-ÿ]*-?\d/.test(s)) {
    let n = m[0];
    // thousands separators: "12,000" / "12.000"; a single separator followed by 1-2 digits is a decimal
    if (/[.,]\d{3}(?:[.,]|$)/.test(n)) n = n.replace(/[.,](?=\d{3}(?:[.,]|$))/g, ""); 
    n = n.replace(",", ".");
    const v = Number(n);
    if (Number.isFinite(v)) return v;
  }
  return s.toLowerCase();
}

/** Order of rows for one column; empty cells stay at the end in both directions. */
export function sortOrder(values: (number | string | null)[], dir: 1 | -1): number[] {
  const idx = values.map((_, i) => i);
  return idx.sort((a, b) => {
    const x = values[a], y = values[b];
    if (x == null && y == null) return a - b;
    if (x == null) return 1;
    if (y == null) return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir || a - b;
    return String(x).localeCompare(String(y)) * dir || a - b;
  });
}

/** Share links for a page. WhatsApp's and the mail client's own link formats; nothing is sent by RealHunt. */
export function shareLinks(title: string, url: string): { whatsapp: string; email: string } {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    email: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`${title}\n${url}`)}`,
  };
}

/** 21-nov-2026 (list2 29, 44): the alert link the page itself carries ("/alerts?country=Italy&max=60000", also under
 * /es/), read into its country and budget. null when the page has none. */
export function alertOf(hrefs: string[]): { href: string; country: string | null; max: number | null } | null {
  for (const h of hrefs) {
    const m = /^(\/es)?\/alerts\?([^#]*)$/.exec(h || "");
    if (!m) continue;
    const q = new URLSearchParams(m[2]);
    const max = Number(q.get("max")) || null;
    return { href: h, country: q.get("country"), max };
  }
  return null;
}
