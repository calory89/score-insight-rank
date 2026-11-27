// The plain-words search for the live search card (moved out of ./livelogic on 27-nov-2026, ronda 25), so the front
// page does not load the live-search parser and its place list just to build this sentence.
import type { FILTER_KEYS } from "./smartsearch";

export function liveQueryFromParams(sp: URLSearchParams): string {
  const get = (k: (typeof FILTER_KEYS)[number]) => (sp.get(k) || "").trim();
  const parts: string[] = [];
  const beds = Number(get("beds")) || 0;
  parts.push(beds ? `${beds} bedroom homes` : "homes");
  const where = [get("q"), get("country").split(",")[0]].filter(Boolean).join(", ");
  if (where) parts.push("in " + where);
  const max = Number(get("price")) || 0, min = Number(get("min")) || 0;
  if (max) parts.push(`under €${max.toLocaleString("en")}`);
  if (min) parts.push(`over €${min.toLocaleString("en")}`);
  return where ? parts.join(" ") : "";
}
