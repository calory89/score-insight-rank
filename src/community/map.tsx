// Map of every ranked home (/map). Same filters as the feed, plus ?focus=<slug> to open one home.
// Loaded on demand so Leaflet never weighs on the home page.
import { lazy, Suspense, useState } from "react";
import { useEffect } from "react";
import { Filters, type FeedParams } from "./extras";
import { t } from "./i18n";
import { SlidersHorizontal } from "lucide-react";
import "./risks.css";
const HomesMap = lazy(() => import("./homesmap"));

export default function MapView() {
  const p0 = new URLSearchParams(location.search);
  const [f, setF] = useState<FeedParams>(() => ({ scope: "all", country: p0.get("country") || "", category: p0.get("type") || "", max_price: Number(p0.get("price")) || null, min_sqm: Number(p0.get("sqm")) || null, q: p0.get("q") || undefined } as FeedParams));
  const [focus] = useState<string | null>(p0.get("focus"));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [n, setN] = useState<number | null>(null);
  // 8-nov-2026: hide homes with a high noise or flood risk (kept in the address as ?quiet=1, so back keeps it).
  const [quiet, setQuiet] = useState(p0.get("quiet") === "1");
  const toggleQuiet = (on: boolean) => {
    setQuiet(on);
    try { const u = new URL(location.href); if (on) u.searchParams.set("quiet", "1"); else u.searchParams.delete("quiet"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } catch { /* ignore */ }
  };
  useEffect(() => { document.title = "Map of the best homes · RealHunt"; }, []);
  // 7-nov-2026 (Carlos: "cuando abro el mapa se ve muy mal"): on a phone the filters filled the whole screen and the
  // map started below the fold. Now they fold behind one button, so the map is the first thing you see.
  const active = [f.country, f.category, f.max_price, (f as any).min_price, f.min_sqm, (f as any).min_beds, (f as any).price_drop, (f as any).min_score, ((f as any).need || []).length].filter(Boolean).length;
  const [showF, setShowF] = useState(() => typeof window === "undefined" || window.innerWidth > 700 || active > 0);
  // Country counts for the chips come from the feed itself.
  useEffect(() => { import("./extras").then(({ feed }) => feed({ scope: "all", limit: 1 }).then((d: any) => setCounts(d.countries_count || {})).catch(() => {})); }, []);
  return (
    <div className="hunt-wrap hunt-mappage">
      <div className="hunt-maphead">
        <h1>{t("Map")}</h1>
        <button type="button" className={"hunt-mapfilters" + (showF ? " is-on" : "")} aria-expanded={showF} onClick={() => setShowF(!showF)}>
          <SlidersHorizontal size={15} /> {showF ? t("Hide filters") : t("Filters")}{active ? <b>{active}</b> : null}
        </button>
      </div>
      {showF && <Filters countries={counts} value={f} onChange={(v) => setF({ ...v, scope: "all" })} />}
      <label className="hm-risk-toggle">
        <input type="checkbox" checked={quiet} onChange={(e) => toggleQuiet(e.target.checked)} />
        <span className="hm-risk-sw" aria-hidden="true" />
        <span>{t("Hide noisy or flood-risk homes")}</span>
      </label>
      <p className="hunt-fine hunt-mapcount">{n === null ? t("Loading…") : <><span>{`${n} homes`}</span> · <span>{t("Pins show the village, not the exact house.")}</span></>}</p>
      <Suspense fallback={<><div className="hm-regions" /><div className="hm hm-page"><div className="hm-map" /></div></>}>
        <HomesMap params={f} focus={focus} className="hm-page" onCount={setN} hideRisky={quiet} />
      </Suspense>
    </div>
  );
}
