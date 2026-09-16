import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { ArrowLeft, ExternalLink, MapPin, Waves, Plane, Check, Share2, CalendarCheck } from "lucide-react";
import { CALENDLY, track } from "@/lib/rh";
const BUILD: [string, string][] = [["/images/ebc/ebc-build-1.jpg", "The beach and first plots, drone, on site"], ["/images/ebc/ebc-build-2.jpg", "Studio under construction, on site"], ["/images/ebc/ebc-build-3.jpg", "Glamping interior, delivered unit"]];

const IMGS = [
  ["/images/ebc/ebc-hero.jpg", "The cabin, steps from the beach"],
  ["/images/ebc/ebc-card.jpg", "Beachfront cabins on the north coast of Sumba"],
  ["/images/ebc/ebc-cabin.jpg", "The €11,500 cabin, 100% off-site built"],
  ["/images/ebc/ebc-interior.jpg", "Studio interior, kitchen and living"],
  ["/images/ebc/ebc-bedroom.jpg", "Bedroom, sunset over the Savu Sea"],
  ["/images/ebc/ebc-founder.jpg", "First line, straight onto the sand"],
  ["/images/ebc/ebc-deck.jpg", "Beach deck"],
  ["/images/ebc/ebc-beach.jpg", "The beach, 2 km of it"],
  ["/images/ebc/ebc-cowork.jpg", "Coworking with ocean view"],
  ["/images/ebc/ebc-restaurant.jpg", "Beach restaurant"],
  ["/images/ebc/ebc-masterplan.jpg", "300 ha masterplan, 100 facilities"],
  ["/images/ebc/ebc-cove.jpg", "Coves nearby"],
  ["/images/ebc/ebc-coast.jpg", "Sumba's coast"],
];
const FACILITIES = ["Beach club", "Beach restaurant", "Coworking", "Padel courts", "Beach volley", "Gym", "Yoga deck", "Pools", "Surf school", "Kids club", "Wellness and spa", "Organic farm", "Plaza and shops", "Medical point", "Coliving", "Nature reserve", "Horse trails", "Sunset bar", "Water sports", "Event lawn"];
const PRICES: [string, string, string][] = [
  ["Cabin", "€11,500", "Two payments after the land. Built off-site, placed on your plot."],
  ["Land, second line", "€6,500", "80-year structure that extends at the end. One payment."],
  ["Land, first line on the beach", "€9,950", "Same structure, on the sand."],
  ["Connections", "€6,500", "Water, septic tank, electricity. Paid before handover."],
  ["Furniture", "Optional", "Contract it with us or bring your own."],
];

const Ebc = () => {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const [months, setMonths] = useState(24);
  useEffect(() => { track("ebc_view", { find: "ecobeachcity" }); }, []);
  useEffect(() => { document.title = "€11,500 beachfront cabin · Sumba, Indonesia · RealHunt"; window.scrollTo(0, 0); }, []);
  const share = () => { const url = location.href; if (navigator.share) { navigator.share({ title: "€11,500 beachfront cabin in Sumba", url }).catch(() => {}); return; } navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); }); };

  return (
    <div className="min-h-screen bg-paper text-ink pb-24 md:pb-0">
      <RHNav />
      <div className="max-w-[1140px] mx-auto md:px-6 md:pt-6">
        <Link to="/" className="hidden md:inline-flex items-center gap-2 text-[13px] text-ink-muted hover:text-ink mb-4"><ArrowLeft size={14} /> All deals</Link>

        <div className="md:rounded-2xl md:overflow-hidden bg-hairline/30">
          <div className="flex md:hidden overflow-x-auto snap-x snap-mandatory scrollbar-none" onScroll={(e) => { const el = e.currentTarget; setI(Math.round(el.scrollLeft / el.clientWidth)); }}>
            {IMGS.map(([u, a], k) => <img key={k} src={u} alt={a} className="w-full aspect-[4/5] object-cover snap-start shrink-0" loading={k ? "lazy" : "eager"} />)}
          </div>
          <div className="md:hidden flex justify-center gap-1.5 py-2">{IMGS.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? "w-4 bg-ink" : "w-1.5 bg-ink/30"}`} />)}</div>
          <div className="hidden md:grid gap-2 grid-cols-[2fr_1fr] max-h-[560px]">
            <img src={IMGS[0][0]} alt={IMGS[0][1]} className="w-full h-full object-cover max-h-[560px]" />
            <div className="grid gap-2 grid-rows-2"><img src={IMGS[1][0]} alt={IMGS[1][1]} className="w-full h-full object-cover" /><img src={IMGS[3][0]} alt={IMGS[3][1]} className="w-full h-full object-cover" /></div>
          </div>
        </div>

        <div className="px-4 md:px-0 grid md:grid-cols-[1.4fr_1fr] gap-10 mt-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Eco Beach City · new eco village</p>
            <h1 className="font-display text-[clamp(38px,7vw,64px)] leading-none tracking-tight mt-3 tabular-nums">€11,500</h1>
            <p className="text-[15px] text-ink-muted mt-1">for the cabin. Land from €6,500 on top. Payable in instalments.</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[14px] text-ink-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin size={14} /> Mamboro, Sumba, Indonesia</span>
              <span className="inline-flex items-center gap-1.5"><Waves size={14} /> Beachfront, 2 km of beach</span>
              <span className="inline-flex items-center gap-1.5"><Plane size={14} /> 1 hour flight from Bali</span>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">What it is</h2>
              <p className="text-[16px] leading-relaxed">A prefab cabin on your own plot, inside a 300-hectare eco village on the north coast of Sumba, with 2 km of beach on the Savu Sea. The village is planned with 100 facilities, from a beach club and coworking to padel courts and an organic farm. Sumba is the quiet island next to Bali: same flight time from Europe, one short hop more, a fraction of the price.</p>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">What you pay, in order</h2>
              <div className="border border-hairline rounded-2xl bg-white divide-y divide-hairline">
                {PRICES.map(([t, p, d]) => <div key={t} className="p-4 flex items-start justify-between gap-4"><div><p className="font-medium text-[15px]">{t}</p><p className="text-[13px] text-ink-muted">{d}</p></div><p className="font-display text-[20px] tabular-nums shrink-0">{p}</p></div>)}
              </div>
              <p className="text-[13px] text-ink-muted mt-2">Cabin, connections and furniture together come to about €28,000, and that part can be paid in instalments. Land is paid separately, first.</p>
            </div>

            <div className="mt-8 border border-hairline rounded-2xl bg-white p-5">
              <p className="font-display text-[18px] tracking-tight">What it costs per month</p>
              <p className="text-[13px] text-ink-muted">Cabin + connections, €18,000, spread over {months} months. Land paid first, separately.</p>
              <input type="range" min={6} max={36} step={6} value={months} onChange={(e) => setMonths(Number(e.target.value))} className="w-full mt-3 accent-sky-500" />
              <div className="flex items-baseline justify-between mt-2"><span className="text-[13px] text-ink-muted">{months} months</span><span className="font-display text-[30px] tabular-nums">€{Math.round(18000 / months).toLocaleString("en-GB")}<span className="text-[14px] text-ink-muted"> / month</span></span></div>
            </div>

            <div className="mt-8">
              <h2 className="font-display text-[20px] tracking-tight mb-3">Built, not rendered</h2>
              <div className="grid grid-cols-3 gap-2">{BUILD.map(([u, a]) => <figure key={u}><img src={u} alt={a} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-xl" /><figcaption className="text-[11px] text-ink-muted mt-1">{a}</figcaption></figure>)}</div>
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

            <div className="mt-8 hidden md:grid grid-cols-3 gap-2">{IMGS.slice(4).map(([u, a]) => <img key={u} src={u} alt={a} loading="lazy" className="w-full aspect-[4/3] object-cover rounded-xl" />)}</div>
          </div>

          <aside className="hidden md:block">
            <div className="sticky top-24 border border-hairline rounded-2xl bg-white p-6 flex flex-col gap-3">
              <p className="font-display text-[18px] tracking-tight">15-minute call with the founder</p>
              <a href={CALENDLY} target="_blank" rel="noreferrer" onClick={() => track("ebc_call")} className="rh-btn-primary inline-flex items-center justify-center gap-2"><CalendarCheck size={15} /> Book a call, free</a>
              <a href="https://ecobeachcity.com" target="_blank" rel="noreferrer" className="h-11 rounded-xl border border-hairline hover:border-ink inline-flex items-center justify-center gap-2 text-[14px]">See the village <ExternalLink size={15} /></a>
              <button onClick={share} className="h-11 rounded-xl border border-hairline hover:border-ink inline-flex items-center justify-center gap-2 text-[14px]">{copied ? <Check size={15} /> : <Share2 size={15} />} {copied ? "Copied" : "Share"}</button>
              <Link to="/fit?d=2300&m=500&t=24" className="text-[13px] underline text-ink-muted text-center">Can I afford it?</Link>
              <p className="text-[12px] text-ink-muted leading-relaxed">Eco Beach City is developed by the team behind RealHunt. We say so here so you know where the commission goes.</p>
            </div>
          </aside>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-hairline px-4 py-3 flex items-center gap-3">
        <button onClick={share} aria-label="Share" className="h-11 w-11 rounded-full border border-hairline inline-flex items-center justify-center">{copied ? <Check size={16} /> : <Share2 size={16} />}</button>
        <a href={CALENDLY} target="_blank" rel="noreferrer" onClick={() => track("ebc_call")} className="rh-btn-primary flex-1 !py-3 inline-flex items-center justify-center gap-2"><CalendarCheck size={15} /> Book a free call</a>
      </div>
    </div>
  );
};
export default Ebc;
