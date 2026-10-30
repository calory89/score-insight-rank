// /network/example — what a finished developer listing looks like on RealHunt, and what the developer receives.
// A clearly labelled SAMPLE (invented project, stock photos), so we never show a real company's project without its OK.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import Reel from "@/components/realhunt/Reel";
import { BadgeCheck, Building2, CalendarClock, Heart, Bookmark, Eye, Mail, MessageCircle, ShieldCheck, Trophy, Video, ChevronRight } from "lucide-react";

const PHOTOS = ["/images/network/modern1.webp", "/images/network/pool6.webp", "/images/network/poolhouse.webp", "/images/network/infinity1.webp", "/images/network/stonevilla.webp"];
const UNITS = [["Studio", 32, 58000, 4], ["1 bedroom", 48, 79000, 7], ["2 bedrooms", 71, 98000, 2]] as const;
const eur = (n: number) => "€" + n.toLocaleString("en-GB");

export default function NetworkExample() {
  const [i, setI] = useState(0);
  useEffect(() => { document.title = "Example listing · RealHunt Network"; try { (window as any).clarity?.("event", "example_view"); } catch { /* ignore */ } }, []);
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <div className="bg-amber-100 text-amber-950 text-[13px] text-center px-4 py-2 font-medium">Sample listing. The project and company are invented to show you the format; the photos are stock.</div>
      <main className="max-w-[1080px] mx-auto px-4 md:px-6 pt-8 pb-24">
        <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted">For developers · what you get</p>
        <h1 className="font-display text-[clamp(30px,4.6vw,46px)] leading-[1.05] tracking-tight mt-1">This is how your project looks on RealHunt</h1>
        <p className="mt-3 text-[17px] text-ink-muted max-w-[62ch]">Buyers see your photos, price, payment plan and units, and ask you directly. You see who they are, their budget and when they want to buy.</p>

        <div className="mt-8 grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          <section className="rounded-3xl bg-white border border-hairline overflow-hidden">
            <div className="relative aspect-[16/10] bg-[#DFE0E2]"><img src={PHOTOS[i]} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-[12px] font-semibold">New build</span>
              <span className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-white text-[18px] font-display">from {eur(58000)}</span></div>
            <div className="flex gap-1.5 p-2 overflow-x-auto">{PHOTOS.map((p, k) => <button key={p} onClick={() => setI(k)} className={`shrink-0 rounded-lg overflow-hidden border-2 ${k === i ? "border-ink" : "border-transparent"}`}><img src={p.replace(".webp", "-s.webp")} alt="" className="w-20 h-14 object-cover" /></button>)}</div>
            <div className="p-5 md:p-6">
              <p className="text-[13px] text-ink-muted">🇦🇱 Golem, Durrës, Albania · 400 m to the beach</p>
              <h2 className="font-display text-[28px] tracking-tight mt-1">Sample Bay Residence</h2>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-hairline p-3">
                <span className="w-10 h-10 rounded-xl bg-ink text-paper grid place-items-center"><Building2 size={18} /></span>
                <div><p className="text-[12px] text-ink-muted">New build by</p><p className="font-semibold inline-flex items-center gap-1.5">Sample Developments <BadgeCheck size={15} className="text-sky-600" /></p></div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-semibold"><span className="px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700">Verified developer</span><span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700">Replies in under 2 h</span><span className="px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-900">★ 4.8 (12)</span></div>
              <div className="mt-4 rounded-2xl bg-[#F0F1F2] p-4">
                <p className="font-semibold inline-flex items-center gap-2"><CalendarClock size={16} /> Payment plan</p>
                <p className="text-[14px] mt-1">30% to reserve · the rest over 24 months, 0% interest · ready Q4 2027</p>
                <p className="text-[15px] mt-2">From <b>{eur(17400)}</b> to reserve, then about <b>{eur(1692)}</b>/month</p>
              </div>
              <table className="w-full mt-4 text-[14px]"><thead><tr className="text-left text-[12px] text-ink-muted"><th className="py-1">Type</th><th>Size</th><th>From</th></tr></thead>
                <tbody>{UNITS.map(([t, m, p, l]) => <tr key={t} className="border-t border-hairline"><td className="py-2">{t} <small className="text-ink-muted">· {l} left</small></td><td>{m} m²</td><td>{eur(p)}</td></tr>)}</tbody></table>
              <p className="mt-4 text-[14px] leading-relaxed">A small block of 36 apartments on a quiet street in Golem, a five-minute walk to the sand. Every unit has a balcony, the top floor has a shared pool, and the building is sold with a 10-year structural warranty.</p>
              <div className="mt-5 flex flex-wrap gap-2"><span className="rh-btn-primary inline-flex items-center gap-2 opacity-90"><Mail size={16} /> Ask Sample Developments</span><span className="px-4 py-2.5 rounded-full border border-hairline inline-flex items-center gap-2 text-[14px]"><Video size={16} /> Video tour</span></div>
              <div className="mt-4 flex gap-5 text-[13px] text-ink-muted"><span className="inline-flex items-center gap-1"><Heart size={14} /> 214 votes</span><span className="inline-flex items-center gap-1"><Bookmark size={14} /> 61 saves</span><span className="inline-flex items-center gap-1"><Eye size={14} /> 3,900 views</span></div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl bg-ink text-paper p-5">
              <p className="text-[12px] uppercase tracking-[0.14em] opacity-70">What lands in your panel</p>
              <p className="font-display text-[22px] mt-1">A buyer, ready to talk</p>
              <div className="mt-3 rounded-xl bg-white/10 p-3 text-[14px] leading-relaxed">
                <p className="font-semibold inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-300" /> Serious buyer: proof of funds checked</p>
                <p className="mt-1 opacity-90">Anna K. · Germany · asked about the 1-bedroom</p>
                <p className="opacity-90">Budget up to €85,000 · buying in the next 3 months · paying cash · wants a video tour (weekday evenings)</p>
                <p className="opacity-90">Saved 9 homes on RealHunt (Albania, Montenegro)</p>
              </div>
              <div className="mt-3 rounded-xl bg-white/10 p-3 text-[14px]">
                <p className="inline-flex items-center gap-1.5 font-semibold"><MessageCircle size={15} /> Chat</p>
                <p className="mt-1 opacity-90"><b>Anna:</b> Is the sea-view 1-bed on floor 4 still free?</p>
                <p className="opacity-90"><b>You:</b> Yes. Video tour on Thursday at 18:00?</p>
              </div>
            </div>
            <div className="rounded-2xl bg-white border border-hairline p-5">
              <p className="font-semibold inline-flex items-center gap-2"><Trophy size={16} /> Your rank</p>
              <p className="text-[14px] mt-1">#3 of 41 homes in Albania this month. 12 more votes to reach #2.</p>
            </div>
            <Reel images={PHOTOS} title="Sample Bay Residence" price={58000} place="Golem, Albania" company="Sample Developments" cta="Every developer gets this video for their own listing." />
          </aside>
        </div>

        <div className="mt-12 rounded-2xl bg-white border border-hairline p-6 md:p-8 grid md:grid-cols-3 gap-6">
          <div><p className="font-display text-[34px]">€0</p><p className="text-[14px] text-ink-muted">to list. No fees, no subscription.</p></div>
          <div><p className="font-display text-[34px]">5%</p><p className="text-[14px] text-ink-muted">only if a buyer we send you buys.</p></div>
          <div><p className="font-display text-[34px]">1 min</p><p className="text-[14px] text-ink-muted">paste your project link and we build the listing.</p></div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/network/start" className="rh-btn-primary inline-flex items-center gap-2 !text-[16px] !px-6 !py-3.5">List my project free <ChevronRight size={17} /></Link>
          <Link to="/network/reservation-contract" className="px-5 py-3 rounded-full border border-hairline bg-white text-[15px]">Free reservation contract template</Link>
        </div>
      </main>
    </div>
  );
}
