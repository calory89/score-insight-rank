// What RealHunt knows about the state of a home, from the fields of the daily snapshot (15-nov-2026).
// Pure functions: the app (HomeStatus.tsx, the cards) and the prerendered page (seo/prerender.ts) use the same rules.
//
// "Gone": the nightly check of the original advert (supabase/functions/realhunt-listing-check, applied by
// realhunt.rh_listing_check_apply) files a "sold" report when the advert was missing on two different days, and
// removes it when the advert comes back. Visitors can file the same report from the home's page. The snapshot
// carries both as counts (sold_reports / available_reports), so a home is treated as gone when there is at least
// one such report and more of them than "still available" reports. We never say "sold" as a fact: we say the
// advert is no longer online, which is what was observed.

export type StatusRow = {
  slug?: string; price_eur?: number | null; country?: string | null; location_name?: string | null;
  publish_at?: string | null; approved_at?: string | null; verified_at?: string | null; verified_note?: string | null;
  ai_checked?: boolean | null; ai_checked_at?: string | null; sold_reports?: number | null; available_reports?: number | null;
  source_domain?: string | null; lat?: number | null; lng?: number | null; image_urls?: string[] | null; price_drop?: number | null;
};

export const isGone = (r: StatusRow | null | undefined): boolean => {
  const sold = Number(r?.sold_reports) || 0;
  return sold >= 1 && sold > (Number(r?.available_reports) || 0);
};

const ms = (iso?: string | null) => { const n = iso ? Date.parse(iso) : NaN; return Number.isFinite(n) ? n : null; };

/** The last dated check of this home: by a person (verified_at) or by the AI check (ai_checked_at), whichever is later. */
export function lastCheck(r: StatusRow): { iso: string; by: "person" | "ai" } | null {
  const p = ms(r.verified_at), a = ms(r.ai_checked_at);
  if (p == null && a == null) return null;
  return (p ?? -1) >= (a ?? -1) ? { iso: r.verified_at!, by: "person" } : { iso: r.ai_checked_at!, by: "ai" };
}

/** When the home was published on RealHunt. */
export const listedAt = (r: StatusRow): string | null => (ms(r.publish_at) != null ? r.publish_at! : ms(r.approved_at) != null ? r.approved_at! : null);

/** Whole days the home has been on RealHunt (0 on the first day); null when the date is unknown or in the future. */
export function listedDays(r: StatusRow, now: number = Date.now()): number | null {
  const t = ms(listedAt(r));
  if (t == null || t > now) return null;
  return Math.floor((now - t) / 86400000);
}

export const ALERT_CAPS = [20000, 30000, 40000, 60000, 80000, 100000];
/** /alerts opened with this home's country and the first budget step that covers its price. */
export function alertHref(r: StatusRow): string {
  const q = new URLSearchParams();
  if (r.country) q.set("country", r.country);
  const cap = ALERT_CAPS.find((c) => c >= (Number(r.price_eur) || 0));
  if (cap && r.price_eur) q.set("max", String(cap));
  const s = q.toString();
  return "/alerts" + (s ? "?" + s : "");
}

/** Google Maps' documented link to the Street View panorama nearest to a point (Maps URLs, map_action=pano). */
export function streetViewHref(r: StatusRow): string | null {
  const la = Number(r.lat), ln = Number(r.lng);
  if (r.lat == null || r.lng == null || !Number.isFinite(la) || !Number.isFinite(ln) || Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${la.toFixed(5)},${ln.toFixed(5)}`;
}

/** "14 Nov 2026" / "14 nov 2026": the same day everywhere (UTC), so the page and the HTML never disagree. */
export function dayLabel(iso: string | null | undefined, lang: "en" | "es" = "en"): string {
  const t = ms(iso);
  if (t == null) return "";
  const d = new Date(t);
  const en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const es = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
  return `${d.getUTCDate()} ${(lang === "es" ? es : en)[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
