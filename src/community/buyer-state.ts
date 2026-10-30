import { useEffect, useState } from "react";

export const storage = {
  get<T>(key: string, fallback: T): T { try { return JSON.parse(sessionStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } },
  set(key: string, value: unknown) { try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* private browsing */ } },
};
export function backToCatalog() {
  const path = storage.get<string>("rh.catalog.return", "/");
  return /^\/(?:\?[^#]*)?$/.test(path) ? path : "/";
}
export function rememberCatalog() { storage.set("rh.catalog.return", location.pathname + location.search); }
export function usePreference<T>(key: string, fallback: T) {
  const read = () => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } };
  const [value, setValue] = useState<T>(read);
  useEffect(() => { const h = () => setValue(read()); window.addEventListener(key, h); window.addEventListener("storage", h); return () => { window.removeEventListener(key, h); window.removeEventListener("storage", h); }; }, [key]);
  const update = (next: T) => { try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* storage disabled */ } setValue(next); window.dispatchEvent(new Event(key)); };
  return [value, update] as const;
}
export const userRent = () => { try { if(localStorage.getItem("rh_rent_explicit")!=="1")return null; const n = Number(localStorage.getItem("rh_rent")); return Number.isFinite(n) && n > 0 ? n : null; } catch { return null; } };
export function safeFacts(deal: {title?: string; why_great?: string}) {
  // Negations, nearby amenities and future works must not become property features.
  return `${deal.title || ""}. ${deal.why_great || ""}`.split(/[.!?;\n]/).filter(s => !/\b(no|not|without|unfurnished|nearby|near |shared|communal|could|potential|planned|needs?|requires?)\b/i.test(s)).join(". ");
}
export function tenure(deal: {title?: string; why_great?: string}) {
  const s = `${deal.title || ""} ${deal.why_great || ""}`;
  if (/leasehold|lease\b|leased|arrendamiento/i.test(s)) return "Leasehold stated in listing, confirm remaining term and renewal conditions";
  if (/freehold|full ownership|plena propiedad/i.test(s)) return "Freehold stated in listing, confirm title with the seller";
  if (/bare ownership|nuda prop|life interest/i.test(s)) return "Restricted ownership, confirm possession and existing rights";
  return "Ownership type not confirmed";
}
