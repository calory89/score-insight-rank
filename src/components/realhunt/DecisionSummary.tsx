import { CheckCircle2, Info, HelpCircle } from "lucide-react";
import { eur, IG } from "@/lib/rh";
import { availability } from "@/lib/catalog";

export function decisionFacts(home: IG) {
  const highlights: string[] = [];
  if (home.price_eur != null) highlights.push(`Advertised price: ${eur(home.price_eur)}.`);
  if (home.sqm != null && home.sqm > 0) highlights.push(`${home.sqm} m² listed${home.bedrooms != null ? ` · ${home.bedrooms === 0 ? "studio" : `${home.bedrooms} ${home.bedrooms === 1 ? "bedroom" : "bedrooms"}`}` : ""}.`);
  else if (home.bedrooms != null) highlights.push(home.bedrooms === 0 ? "Listed as a studio." : `${home.bedrooms} ${home.bedrooms === 1 ? "bedroom" : "bedrooms"} listed.`);
  if (home.is_beach === true) highlights.push("Tagged as a beach home in this listing.");
  const considerations = ["The advertised price does not confirm the final purchase cost."];
  const status = availability(home);
  if (status !== "Not confirmed") considerations.unshift(`Marked as ${status.toLowerCase()} in RealHunt.`);
  else considerations.push("Current availability needs confirmation with the seller.");
  if (home.price_raw && home.price_raw !== "seen in image") considerations.push(`Source price: ${home.price_raw}. The euro amount may be a conversion.`);
  const missing = [];
  if (home.sqm == null || home.sqm <= 0) missing.push("Floor area");
  if (home.bedrooms == null) missing.push("Number of bedrooms");
  missing.push("Property condition and any work needed", "Ownership terms and additional costs");
  return { highlights: highlights.length ? highlights : ["Check the source listing for property details."], considerations, missing };
}
export default function DecisionSummary({ home }: { home: IG }) {
  const facts = decisionFacts(home);
  return <section aria-label="At a glance" className="mt-7 grid gap-3 sm:grid-cols-3">
    {[
      { title: "Why it stands out", items: facts.highlights, icon: CheckCircle2, color: "text-emerald-700", bg: "bg-emerald-50/60" },
      { title: "Keep in mind", items: facts.considerations, icon: Info, color: "text-amber-800", bg: "bg-amber-50/60" },
      { title: "Still to confirm", items: facts.missing, icon: HelpCircle, color: "text-slate-600", bg: "bg-slate-50" },
    ].map(({ title, items, icon: Icon, color, bg }) => <div key={title} className={`rounded-2xl border border-hairline p-4 ${bg}`}>
      <h2 className={`flex items-center gap-2 font-medium text-[14px] ${color}`}><Icon size={17} className="shrink-0" />{title}</h2>
      <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-ink-muted">{items.map(text => <li key={text}>{text}</li>)}</ul>
    </div>)}
    <p className="sm:col-span-3 text-[11px] text-ink-muted">Based on the information available in this listing. No assumptions about condition or ownership.</p>
  </section>;
}
