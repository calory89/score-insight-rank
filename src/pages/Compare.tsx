import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur, FLAG, norm, IG, track, srcSet, totalCost, COSTS } from "@/lib/rh";

const Compare = () => {
  const [sp] = useSearchParams();
  const ids = (sp.get("ids") || "").split(",").filter(Boolean).slice(0, 3);
  const [items, setItems] = useState<IG[]>([]);
  useEffect(() => { document.title = "Compare homes · RealHunt"; track("compare_view"); if (!ids.length) return; db.from("ig_finds").select("*").in("shortcode", ids).then(({ data }: any) => setItems(ids.map((s) => (data || []).find((f: IG) => f.shortcode === s)).filter(Boolean))); }, [sp]);
  const rows: [string, (f: IG) => any][] = [
    ["Price", (f) => f.price_eur ? eur(f.price_eur) : "?"],
    ["Real cost to buy", (f) => f.price_eur && COSTS[norm(f.country_guess)] ? "~" + eur(totalCost(f.price_eur, norm(f.country_guess))!) : "?"],
    ["Size", (f) => f.sqm ? `${f.sqm} m²` : "?"],
    ["€/m²", (f) => f.sqm && f.price_eur ? eur(Math.round(f.price_eur / f.sqm)) : "?"],
    ["Bedrooms", (f) => f.bedrooms || "?"],
    ["Beach", (f) => f.is_beach ? "Yes" : "No"],
    ["Where", (f) => f.location_name || norm(f.country_guess)],
    ["Posted", (f) => f.posted_at ? new Date(f.posted_at).toLocaleDateString("en-GB") : ""],
  ];
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <div className="max-w-[1140px] mx-auto px-4 md:px-6 py-8">
        <h1 className="font-display text-[30px] tracking-tight mb-4">Compare</h1>
        {items.length < 2 && <p className="text-ink-muted">Pick 2 or 3 homes from <Link to="/account/saved" className="underline text-ink">your saved list</Link> to compare them here.</p>}
        {items.length >= 2 && (
          <div className="overflow-x-auto"><table className="w-full border-collapse text-[14px]"><thead><tr><th className="w-36" />{items.map((f) => { const c = norm(f.country_guess); return <th key={f.id} className="p-2 align-top text-left"><Link to={`/find/${f.shortcode}`}><img src={f.image_urls![0]} srcSet={srcSet(f.image_urls![0])} sizes="300px" alt="" className="w-full aspect-[4/3] object-cover rounded-xl" /><p className="mt-2 font-medium">{FLAG[c]} {f.hook || f.location_name}</p></Link></th>; })}</tr></thead>
            <tbody>{rows.map(([l, fn]) => <tr key={l} className="border-t border-hairline"><td className="py-3 pr-3 text-ink-muted">{l}</td>{items.map((f) => <td key={f.id} className="py-3 px-2 font-medium tabular-nums">{fn(f)}</td>)}</tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
};
export default Compare;
