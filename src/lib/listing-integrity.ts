import type { IG } from "./rh";
// Promotional text must not contradict the structured price. Keep the original record unchanged.
export function listingHook(home: IG): string {
  const text = home.hook || "";
  if (!home.price_eur) return text;
  const amounts = [...text.matchAll(/€\s*([\d.,]+)\s*([kK])?/g)].map(([, raw, k]) => k ? Number(raw.replace(",", ".")) * 1000 : Number(raw.replace(/[.,](?=\d{3}(?:\D|$))/g, "").replace(",", ".")));
  return amounts.some(value => Number.isFinite(value) && Math.abs(value - home.price_eur!) > 1) ? "" : text;
}
export function reviewAge(checkedAt?: string | null): string {
  if (!checkedAt || !Number.isFinite(Date.parse(checkedAt))) return "Availability has not been checked recently. Confirm with the advertiser.";
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(checkedAt)) / 86400000));
  return `Listing reviewed ${new Date(checkedAt).toLocaleDateString("en-GB")}${days > 30 ? " · More than 30 days ago; reconfirm availability." : ". Availability can change."}`;
}
