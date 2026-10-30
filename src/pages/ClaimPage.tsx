// /claim/:code — the page a developer lands on from the outreach email: their listing, ready, one button.
// ?optout=1 records that they do not want to hear from us again.
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import { db, eur, FLAG, track } from "@/lib/rh";
import { Check, ChevronRight, Loader2, ShieldCheck, Users, Coins, ImageOff } from "lucide-react";
import Reel from "@/components/realhunt/Reel";

export default function ClaimPage() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const optout = params.get("optout") === "1";
  const [p, setP] = useState<any>(undefined);
  const [i, setI] = useState(0);
  useEffect(() => {
    document.title = "Your listing is ready · RealHunt";
    db.rpc("dev_claim_view", { p_code: code, p_optout: optout }).then(({ data }: any) => setP(data || null), () => setP(null));
    try { (window as any).clarity?.("event", optout ? "claim_optout" : "claim_open"); } catch { /* ignore */ }
    track(optout ? "claim_optout" : "claim_open");
  }, [code]);
  const claim = () => {
    const images: string[] = (p.images || []).filter((x: string) => /^https:\/\//.test(x));
    const draft = { url: p.project_url || p.website || "", title: p.title || p.project_name || "", price: p.price_eur ? String(p.price_eur) : "", country: p.country || "",
      location: p.area || "", category: "beach", description: (p.description || "").slice(0, 600), images, cover: i < images.length ? i : 0, site_name: p.site_name || p.company || "",
      email: "", phone: "", company: p.company || "", mode: "both" };
    try { localStorage.setItem("rh_dev_draft", JSON.stringify(draft)); localStorage.setItem("rh_dev_claim", code); } catch { /* ignore */ }
    try { (window as any).clarity?.("event", "claim_start"); } catch { /* ignore */ }
    nav("/network/start?claim=" + encodeURIComponent(code));
  };
  if (p === undefined) return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[900px] mx-auto p-10"><Loader2 className="animate-spin" /></div></div>;
  if (!p) return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[900px] mx-auto p-10"><h1 className="font-display text-3xl">This link has expired</h1><p className="mt-2 text-ink-muted">You can still list your project in a minute.</p><Link to="/network/start" className="rh-btn-primary inline-flex mt-5">List my project</Link></div></div>;
  if (p.optout) return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[700px] mx-auto p-10"><h1 className="font-display text-3xl">Done. We will not write again.</h1><p className="mt-2 text-ink-muted">Sorry for the interruption. If you ever want buyers for {p.company}, the door is open at realhunt.co/network.</p></div></div>;
  if (p.status === "claimed") return <div className="min-h-screen bg-paper"><RHNav /><div className="max-w-[700px] mx-auto p-10"><h1 className="font-display text-3xl">This listing has been claimed</h1><p className="mt-2 text-ink-muted">If that was you, everything is in your panel.</p><Link to="/network/app/projects" className="rh-btn-primary inline-flex mt-5">Open my panel</Link></div></div>;
  const imgs: string[] = p.images || [];
  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[1080px] mx-auto px-4 md:px-6 pt-8 pb-24 grid lg:grid-cols-[1fr_400px] gap-10 items-start">
        <div className="order-2 lg:order-1">
          <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/20 text-amber-900 text-[13px] font-semibold">Prepared for {p.company} · not public yet</p>
          <h1 className="mt-3 font-display text-[clamp(30px,4.6vw,48px)] leading-[1.03] tracking-tight">Your listing is ready. Claim it and start receiving buyers.</h1>
          <p className="mt-4 text-[17px] text-ink-muted max-w-[56ch]">We built it from your website. Nothing is published until you say so. Check the details, change anything, and go live in about a minute.</p>
          <ul className="mt-6 flex flex-col gap-3 text-[15px]">
            <li className="flex gap-3"><Users size={19} className="shrink-0 mt-0.5" /><span><b>Buyers come to you.</b> People who ask about your project arrive in your panel with their name, email and phone.</span></li>
            <li className="flex gap-3"><ShieldCheck size={19} className="shrink-0 mt-0.5" /><span><b>5% only if one of them buys.</b> No sale, €0. No fees, no subscription.</span></li>
            <li className="flex gap-3"><Coins size={19} className="shrink-0 mt-0.5" /><span><b>Optional:</b> earn 3% when leads you could not sell to buy somewhere else in the network.</span></li>
          </ul>
          <button onClick={claim} className="rh-btn-primary inline-flex items-center gap-2 mt-8 !text-[17px] !px-7 !py-4">Claim my listing, free <ChevronRight size={18} /></button>
          <p className="text-[13px] text-ink-muted mt-3 inline-flex items-center gap-1.5"><Check size={14} /> Takes a minute · you can change or remove it any time</p>
          <p className="text-[14px] mt-6">Want to see a finished one first? <Link to="/network/example" className="underline font-medium">See an example listing</Link></p>
          <p className="text-[12px] text-ink-muted mt-8">Not interested? <Link to={`/claim/${code}?optout=1`} className="underline">Tell us and we will not write again</Link>.</p>
        </div>
        <aside className="order-1 lg:order-2">
          <div className="rounded-3xl bg-white border border-hairline overflow-hidden shadow-sm">
            <div className="relative aspect-[4/3] bg-[#DFE0E2] grid place-items-center">
              {imgs[i] ? <img src={imgs[i]} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setI((x) => (x + 1 < imgs.length ? x + 1 : x))} /> : <ImageOff className="text-ink-muted" />}
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-[12px] font-semibold">New build</span>
              {p.price_eur ? <span className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-white text-[17px] font-display">{eur(p.price_eur)}</span> : null}
            </div>
            {imgs.length > 1 && <div className="flex gap-1.5 p-2 overflow-x-auto">{imgs.slice(0, 8).map((src, k) => <button key={src + k} onClick={() => setI(k)} className={`shrink-0 rounded-lg overflow-hidden border-2 ${k === i ? "border-ink" : "border-transparent"}`}><img src={src} alt="" className="w-16 h-12 object-cover" loading="lazy" /></button>)}</div>}
            <div className="p-4">
              <p className="font-semibold text-[17px] leading-snug">{p.title}</p>
              <p className="text-[13px] text-ink-muted mt-1">{FLAG[p.country] || "🌍"} {[p.area, p.country].filter(Boolean).join(", ")}</p>
              {p.price_text && <p className="text-[13px] text-ink-muted mt-1">Published price: {p.price_text}</p>}
              <p className="text-[13px] text-ink-muted mt-2">by <b className="text-ink">{p.company}</b></p>
            </div>
          </div>
          {imgs.length > 0 && <div className="mt-4"><Reel images={imgs} title={p.title || p.project_name || p.company} price={p.price_eur} place={[p.area, p.country].filter(Boolean).join(", ")} company={p.company} /></div>}
        </aside>
      </main>
    </div>
  );
}
