// Short texts for the live search page (8-nov-2026, minimal pass). Carlos: "too heavy". One status line while it
// runs ("Checking listing 12 of 20"), one summary line when it ends, and the outside-the-centre list the search
// function may send (live search v4: results carry distance_to_centre_km, the job carries outside_centre).
import type { LiveResult, LiveStatus } from "./livelogic";

/** One short status for the progress line. Every text is a key in public/i18n/es-extra.json. */
export function shortStage(st: LiveStatus["stage"]): string {
  const nOf = (w: string) => (st?.n != null && st?.of ? `${w} ${st.n} of ${st.of}` : w);
  switch (st?.k) {
    case "start": case "parsed": return "Reading your search";
    case "ours": case "ours_some": return "Looking at our homes";
    case "searching": case "searching_cb": return "Searching agents and portals";
    case "found": return st?.n != null ? `Found ${st.n} listings` : "Searching agents and portals";
    case "checking": case "reading": return nOf("Reading listing");
    case "reviewing": return nOf("Checking listing");
    case "publishing": return nOf("Publishing listing");
    case "done": return "Done";
    default: return "Starting";
  }
}

/** "3 homes passed the AI check", with how many were left out. */
export function doneLine(passed: number, hidden?: number | null): string {
  const a = passed === 1 ? "1 home passed the AI check" : `${passed} homes passed the AI check`;
  return hidden ? `${a} · ${hidden} left out` : a;
}

/** km from the centre of a result, when the search function sent it. */
export function centreKm(r: unknown): number | null {
  const v = Number((r as any)?.distance_to_centre_km);
  return Number.isFinite(v) && v >= 0 && (r as any)?.distance_to_centre_km != null ? v : null;
}

/** The job's separate "outside the centre" list, without homes already shown above. */
export function outsideCentre(st: LiveStatus | null, shown: LiveResult[]): LiveResult[] {
  const list = (st as any)?.outside_centre;
  if (!Array.isArray(list)) return [];
  const ids = new Set(shown.map((r) => r.id));
  const slugs = new Set(shown.map((r) => r.deal_slug).filter(Boolean));
  return list.filter((r: any) => r && r.id && !ids.has(r.id) && !(r.deal_slug && slugs.has(r.deal_slug)));
}
