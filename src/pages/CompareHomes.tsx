import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ArrowLeft, X } from "lucide-react";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur, IG, track, srcSet } from "@/lib/rh";
import { availability, comparisonCodes, homePath, readSession, specialHome, writeSession } from "@/lib/catalog";
import { safeReturnPath } from "@/lib/auth-return";

export default function CompareHomes() {
  const [sp, setSp] = useSearchParams();
  const route = useLocation();
  const ids = comparisonCodes((sp.get("ids") || "").split(","));
  const key = ids.join(",");
  const [items, setItems] = useState<IG[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const backTo = safeReturnPath(route.state?.catalogUrl || readSession("rh_catalog_url", "/"));
  useEffect(() => {
    let active = true;
    document.title = "Compare homes · RealHunt"; track("compare_view");
    setLoading(true); setError(false);
    const load = async () => {
      const real = ids.filter(code => !specialHome(code));
      try {
        const result = real.length ? await db.from("ig_finds").select("id,shortcode,image_urls,price_eur,sqm,bedrooms,location_name,country_guess,status,hook").in("shortcode", real).neq("status", "hidden") : { data: [], error: null };
        if (result.error) throw result.error;
        if (active) setItems(ids.map(code => specialHome(code) || result.data?.find((f: IG) => f.shortcode === code)).filter(Boolean));
      } catch { if (active) { setError(true); setItems([]); } } finally { if (active) setLoading(false); }
    };
    load(); return () => { active = false; };
  }, [key, attempt]);
  const remove = (code: string) => {
    const next = ids.filter(id => id !== code); writeSession("rh_compare", next); setSp(next.length ? { ids: next.join(",") } : {});
  };
  const rows: [string, (f: IG) => string][] = [
    ["Advertised price", f => f.price_eur != null ? eur(f.price_eur) : "Not available"],
    ["Floor area", f => f.sqm != null && f.sqm > 0 ? `${f.sqm} m²` : "Not available"],
    ["Bedrooms", f => f.bedrooms == null ? "Not available" : f.bedrooms === 0 ? "Studio" : String(f.bedrooms)],
    ["Condition", () => "Not available"],
    ["Availability", availability],
    ["Location", f => f.location_name || f.country_guess || "Not available"],
  ];
  return <div className="min-h-screen bg-paper text-ink"><RHNav /><div className="max-w-[1140px] mx-auto px-4 md:px-6 py-6 pb-24">
    <Link to={backTo} className="inline-flex items-center gap-2 text-sm text-ink-muted"><ArrowLeft size={16} /> Back to results</Link>
    <div className="mt-5 mb-6"><h1 className="font-display text-[32px] tracking-tight">Your homes, side by side.</h1><p className="mt-2 text-sm text-ink-muted">Compare up to three homes. Missing information is shown explicitly.</p></div>
    {loading ? <p role="status" className="py-10">Loading your comparison…</p> : error ? <div role="alert"><p>We could not load these homes. Your selection is saved.</p><button onClick={() => setAttempt(n => n + 1)} className="rh-btn-primary mt-4">Try again</button></div> : <>
      {items.length < ids.length && <p role="status" className="rounded-xl bg-amber-50 p-4 mb-4 text-sm">Some selected homes are no longer available in the catalogue.</p>}
      {items.length === 0 ? <p>Select up to three homes from <Link to={backTo} className="underline">the catalogue</Link> to compare them here.</p> : <>
        <div role="region" aria-label="Home comparison table. Scroll horizontally on small screens." tabIndex={0} className="overflow-x-auto rounded-2xl border border-hairline bg-white"><table className="w-full border-collapse text-sm min-w-[620px]"><caption className="sr-only">Property comparison based on available listing details</caption><thead><tr><th scope="col" className="w-32 p-3 text-left align-bottom bg-paper">Details</th>{items.map(f => <th scope="col" key={f.shortcode} className="p-3 align-top text-left min-w-[190px]"><div className="flex justify-end mb-2"><button aria-label={`Remove ${f.location_name || f.shortcode}`} onClick={() => remove(f.shortcode)} className="min-h-11 flex items-center gap-1 text-xs text-ink-muted"><X size={14} /> Remove</button></div><Link to={homePath(f)} state={{ catalogUrl: backTo }}>{f.image_urls?.[0] && <img src={f.image_urls[0]} srcSet={srcSet(f.image_urls[0])} sizes="300px" alt={f.location_name || "Home"} className="w-full aspect-[4/3] object-cover rounded-xl" />}<p className="mt-3 font-medium">{f.location_name || f.country_guess || "Home"}</p><span className="inline-block mt-2 underline text-xs font-normal">View full details</span></Link></th>)}</tr></thead><tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-hairline"><th scope="row" className="p-3 text-left text-ink-muted font-normal bg-paper">{label}</th>{items.map(f => <td key={f.shortcode} className={`p-3 tabular-nums ${label === "Advertised price" ? "font-semibold text-xl" : ""}`}>{value(f)}</td>)}</tr>)}</tbody></table></div>
        <p className="text-xs text-ink-muted mt-3">Swipe horizontally to compare on mobile. Advertised prices may change; confirm condition, ownership and final costs with the seller.</p>
        {items.length < 3 && <Link to={backTo} className="inline-flex mt-5 underline text-sm">Add another home from the catalogue →</Link>}
      </>}
    </>}
  </div></div>;
}
