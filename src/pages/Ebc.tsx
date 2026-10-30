import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PhotoGallery from "@/components/realhunt/PhotoGallery";
import DecisionSummary from "@/components/realhunt/DecisionSummary";
import { readSession } from "@/lib/catalog";
import { safeReturnPath } from "@/lib/auth-return";
import RHNav from "@/components/realhunt/RHNav";
import { ArrowLeft, ExternalLink, MapPin, Waves, Plane, Check, Share2, CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { CALENDLY, track, EBC } from "@/lib/rh";
const FACILITIES = ["Beach club", "Beach restaurant", "Coworking", "Padel courts", "Beach volley", "Gym", "Yoga deck", "Pools", "Surf school", "Kids club", "Wellness and spa", "Organic farm", "Plaza and shops", "Medical point", "Coliving", "Nature reserve", "Horse trails", "Sunset bar", "Water sports", "Event lawn"];
// 30-oct-2026 (Carlos): one price, €36,500, for the cabin, the plot and the furniture.
const PRICES: [string, string, string][] = [
  ["Cabin", "Included", "Built off-site and placed on your plot."],
  ["Your plot", "Included", "80-year structure that extends at the end."],
  ["Furniture", "Included", "The cabin is handed over furnished."],
];

const Ebc = () => {
  const route = useLocation();
  const backTo = safeReturnPath(route.state?.catalogUrl || readSession("rh_catalog_url", "/"));
  const [copied, setCopied] = useState(false);
  const [months, setMonths] = useState(24);
  useEffect(() => { track("ebc_view", { find: "ecobeachcity" }); }, []);
  useEffect(() => { document.title = "€36,500 furnished cabin and plot · Sumba, Indonesia · RealHunt"; window.scrollTo(0, 0); }, []);
  const share = () => { const url = location.href; if (navigator.share) { navigator.share({ title: "€36,500 furnished cabin and plot in Sumba", url }).catch(() => {}); return; } navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); };

  return (
    <div className="min-h-screen bg-paper text-ink pb-24 md:pb-0">
      <RHNav />
      <div className="max-w-[1140px] mx-auto md:px-6 md:pt-6">
        <Link to={backTo} className="inline-flex items-center gap-2 text-[13px] text-ink-muted hover:text-ink mb-4"><ArrowLeft size={14} /> Back to results</Link>

        <PhotoGallery images={EBC.image_urls || []} title="Mamboro, Sumba" rememberKey="ecobeachcity" eager />

        <div className="px-4 md:px-0 grid md:grid-cols-[1.4fr_1fr] gap-10 mt-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Eco Beach City · new eco village</p>
            <h1 className="font-display text-[clamp(38px,7vw,64px)] leading-none tracking-tight mt-3 tabular-nums">€36,500</h1>
            <p className="text-[15px] text-ink-muted mt-1">Your cabin, your plot and the furniture, all included. Payable in instalments.</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> Mamboro, Sumba, Indonesia</span>
              <span className="inline-flex items-center gap-1.5"><Waves size={14} /> Beachfront, 2 km of beach</span>
              <span className="inline-flex items-center gap-1.5"><Plane size={14} /> 1 hour flight from Bali</span>
            </div>

            <a href="https://ecobeachcity.com" target="_blank" rel="noreferrer" onClick={() => track("ebc_site")} className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-ink bg-white px-4 py-3 text-[15px] font-medium hover:bg-ink hover:text-paper transition-colors">
              <span>Visit the Eco Beach City website<span className="block text-[12px] font-normal opacity-70">ecobeachcity.com · the village, the map and every price</span></span>
              <ExternalLink size={18} className="shrink-0" />
            </a>

            <DecisionSummary home={EBC} />
            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">What it is</h2>
              <p className="text-[16px] leading-relaxed">A prefab cabin on your own plot, inside a 300-hectare eco village on the north coast of Sumba, with 2 km of beach on the Savu Sea. The village is planned with 100 facilities, from a beach club and coworking to padel courts and an organic farm. Sumba is the quiet island next to Bali: same flight time from Europe, one short hop more, a fraction of the price.</p>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">What is included</h2>
              <div className="border border-hairline rounded-2xl bg-white divide-y divide-hairline">
                {PRICES.map(([t, p, d]) => <div key={t} className="p-4 flex items-start justify-between gap-4"><div><p className="font-medium text-[15px]">{t}</p><p className="text-[13px] text-ink-muted">{d}</p></div><p className="font-display text-[20px] tabular-nums shrink-0">{p}</p></div>)}
              </div>
              <p className="text-[13px] text-ink-muted mt-2">One price, €36,500, for the cabin, the plot and the furniture. It can be paid in instalments.</p>
            </div>

            <div className="mt-8 border border-hairline rounded-2xl bg-white p-5">
              <p className="font-display text-[18px] tracking-tight">What it costs per month</p>
              <p className="text-[13px] text-ink-muted">Cabin, plot and furniture, €36,500, spread over {months} months.</p>
              <input type="range" min={6} max={36} step={6} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full mt-3 accent-sky-500" />
              <div className="flex items-baseline justify-between mt-2"><span className="text-[13px] text-ink-muted">{months} months</span><span className="font-display text-[30px] tabular-nums">€{Math.round(36500 / months).toLocaleString("en-GB")}<span className="text-[14px] text-ink-muted"> / month</span></span></div>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">100 facilities planned. Some of them:</h2>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px]">{FACILITIES.map((f) => <li key={f} className="flex gap-2"><Check size={15} className="shrink-0 mt-0.5 text-ink-muted" />{f}</li>)}</ul>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">What you will not like</h2>
              <ul className="text-[15px] leading-relaxed text-ink-muted list-disc pl-5 flex flex-col gap-1">
                <li>It is a project under construction, not a finished resort. Facilities arrive in phases through 2029.</li>
                <li>Land is a long lease, not freehold. 80 years, extended at the end, which is how foreigners hold land in Indonesia.</li>
                <li>Sumba is quiet. If you want Bali nightlife, this is not it.</li>
              </ul>
            </div>

          </div>

          <aside className="hidden md:block">
            <div className="sticky top-24 border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
              <p className="font-display text-[18px] tracking-tight">15-minute call with the founder</p>
              <a href={CALENDLY} target="_blank" rel="noreferrer" onClick={() => track("ebc_call")} className="rh-btn-primary inline-flex items-center justify-center gap-2"><CalendarCheck size={15} /> Book a call, free</a>
              <a href="https://ecobeachcity.com" target="_blank" rel="noreferrer" onClick={() => track("ebc_site")} className="h-11 rounded-xl border border-hairline hover:border-ink inline-flex items-center justify-center gap-2 text-[14px]">See the village <ExternalLink size={15} /></a>
              <button onClick={share} className="h-11 rounded-xl border border-hairline hover:border-ink inline-flex items-center justify-center gap-2 text-[14px]">{copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? "Copied" : "Share"}</button>
              <Link to="/fit?d=2300&m=500&t=24" className="text-[13px] underline text-ink-muted text-center">Can I afford it?</Link>
              <p className="text-[12px] text-ink-muted leading-relaxed">Eco Beach City is developed by the team behind RealHunt. We say so here so you know where the commission goes.</p>
            </div>
          </aside>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-hairline px-4 py-3 flex items-center gap-3">
        <button onClick={share} aria-label="Share" className="h-11 w-11 rounded-full border border-hairline inline-flex items-center justify-center">{copied ? <Check size={16} /> : <Share2 size={16} />}</button>
        <a href="https://ecobeachcity.com" target="_blank" rel="noreferrer" onClick={() => track("ebc_site")} className="h-11 px-3 rounded-full border border-ink inline-flex items-center justify-center gap-1.5 text-[13px] font-medium shrink-0">Website <ExternalLink size={14} /></a>
        <a href={CALENDLY} target="_blank" rel="noreferrer" onClick={() => track("ebc_call")} className="rh-btn-primary flex-1 !py-3 inline-flex items-center justify-center gap-2"><CalendarCheck size={15} /> Book a free call</a>
      </div>
    </div>
  );
};
export default Ebc;

