import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import { Check, Search, Users, Handshake, Coins, Lock, Phone, Mail } from "lucide-react";

const db = supabase as any;
const STEPS = ["Reading your project page", "Scoring price, location and payment plan", "Looking for buyers in the network who fit", "Preparing your matches"];

const Network = () => {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<"idle" | "loading" | "email" | "share" | "done">("idle");
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [share, setShare] = useState<null | boolean>(null);
  useEffect(() => { document.title = "RealHunt Network · Free buyers for your project"; }, []);
  useEffect(() => {
    if (stage !== "loading") return;
    setStep(0);
    const t = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), 900 * (i + 1)));
    const end = setTimeout(() => { setStage("email"); document.getElementById("gate")?.scrollIntoView({ behavior: "smooth", block: "center" }); }, 900 * STEPS.length + 400);
    return () => { t.forEach(clearTimeout); clearTimeout(end); };
  }, [stage]);

  const start = (e: React.FormEvent) => { e.preventDefault(); if (!url) return; setStage("loading"); };
  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault(); if (!/.+@.+\..+/.test(email)) return; setStage("share");
    try { await db.from("contact_requests").insert({ email, company: url, message: `receive${phone ? " | phone: " + phone : ""}`, source: "network_analyze" }); } catch {}
  };
  const answerShare = async (yes: boolean) => {
    setShare(yes); setStage("done");
    if (yes) { try { await db.from("contact_requests").insert({ email, company: url, message: `share${phone ? " | phone: " + phone : ""}`, source: "network_share" }); } catch {} }
  };

  const H = ({ children }: { children: React.ReactNode }) => <h2 className="font-display text-[clamp(26px,3.6vw,38px)] leading-tight tracking-tight text-balance">{children}</h2>;
  const Big = ({ n, t }: { n: string; t: string }) => <div><p className="font-display text-[clamp(34px,5vw,56px)] leading-none tracking-tight tabular-nums">{n}</p><p className="text-[13px] text-ink-muted mt-1">{t}</p></div>;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      {/* Hero with photos */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pt-8 md:pt-14 pb-10 grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-4">RealHunt Network · developers and agencies</p>
          <h1 className="font-display text-[clamp(34px,5.6vw,60px)] leading-[1.0] tracking-tight text-balance">Free buyers for your project. You pay only when one buys.</h1>
          <p className="mt-5 text-[17px] text-ink-muted max-w-[52ch] leading-relaxed">Paste your project. We score it and look for buyers already in the network who fit your price, country and payment plan.</p>

          <div id="analyze" className="mt-7 border border-hairline rounded-2xl bg-white p-5 md:p-6 shadow-sm">
            {stage === "idle" && (
              <form onSubmit={start} className="flex flex-col sm:flex-row gap-2">
                <input required type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-project.com" aria-label="Project URL" className="flex-1 border border-hairline rounded-full px-5 py-3.5 text-[15px] bg-paper outline-none focus:border-ink" />
                <button type="submit" className="rh-btn-primary !px-6 inline-flex items-center justify-center gap-2"><Search size={16} /> Find me buyers, free</button>
              </form>
            )}
            {stage === "loading" && (
              <div className="flex flex-col gap-3">
                <p className="text-[13px] text-ink-muted truncate">{url}</p>
                {STEPS.map((s, i) => <p key={s} className={`inline-flex items-center gap-3 text-[15px] transition-opacity ${i < step ? "opacity-100" : i === step ? "opacity-100" : "opacity-30"}`}><span className={`h-5 w-5 rounded-full border inline-flex items-center justify-center shrink-0 ${i < step ? "bg-ink border-ink text-paper" : i === step ? "border-ink animate-pulse" : "border-hairline"}`}>{i < step && <Check size={12} />}</span>{s}</p>)}
              </div>
            )}
            {stage === "email" && (
              <form id="gate" onSubmit={sendEmail} className="flex flex-col gap-3">
                <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><Check size={18} /> Analysis ready</p>
                <div className="relative rounded-xl overflow-hidden border border-hairline">
                  {[["Couple, 40s", "€25k deposit", "Wants beach, 2027"], ["Single buyer", "€60k cash", "Payment plan ok"], ["Family", "€18k deposit", "Europe or Asia"]].map(([a, b, c]) => <div key={a} className="grid grid-cols-3 text-[13px] px-4 py-2.5 border-b border-hairline last:border-b-0 blur-[5px] select-none"><span>{a}</span><span>{b}</span><span>{c}</span></div>)}
                  <div className="absolute inset-0 flex items-center justify-center"><span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 text-[13px] shadow"><Lock size={13} /> Matches are sent by email</span></div>
                </div>
                <label className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Work email, to receive your buyers" aria-label="Email" className="w-full border border-hairline rounded-full pl-11 pr-4 py-3.5 text-[15px] bg-paper outline-none focus:border-ink" /></label>
                <label className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" /><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone, optional. Recommended: we call before sending a buyer" aria-label="Phone" className="w-full border border-hairline rounded-full pl-11 pr-4 py-3.5 text-[15px] bg-paper outline-none focus:border-ink" /></label>
                <button type="submit" className="rh-btn-primary inline-flex items-center justify-center gap-2"><Users size={16} /> Send me the buyers, €0</button>
                <p className="text-[12px] text-ink-muted">Zero cost to receive. Commission only if one of them buys, agreed in writing first.</p>
              </form>
            )}
            {stage === "share" && (
              <div className="flex flex-col gap-3">
                <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Done. Your buyers and RH Score land in {email} within 24 hours.</p>
                <div className="border-t border-hairline pt-4">
                  <p className="font-display text-[20px] tracking-tight">One more thing. Do you have leads you could not sell to?</p>
                  <p className="text-[15px] text-ink-muted mt-1">Share them with the network and you earn on average <b className="text-ink">€15 per lead</b>, because a share of them end up buying someone else's project. Only leads who say yes to being contacted.</p>
                  <div className="flex gap-2 mt-4"><button onClick={() => answerShare(true)} className="rh-btn-primary inline-flex items-center gap-2"><Coins size={16} /> Yes, I want to earn from my leads</button><button onClick={() => answerShare(false)} className="px-5 py-2.5 rounded-full border border-hairline text-[14px] hover:border-ink">Not now</button></div>
                </div>
              </div>
            )}
            {stage === "done" && (
              <div className="flex flex-col gap-2">
                <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> {share ? "Great. We reply with the one-page agreement and the upload link." : "Noted. Your buyers are on the way."}</p>
                <p className="text-[13px] text-ink-muted">Questions? Reply to the email you receive.</p>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <img src="/images/ebc/ebc-founder.jpg" alt="Beachfront project" className="rounded-2xl object-cover w-full aspect-[4/5] col-span-1 row-span-2 h-full" loading="eager" />
          <img src="/images/ebc/ebc-deck.jpg" alt="" className="rounded-2xl object-cover w-full aspect-[4/3]" />
          <img src="/images/ebc/ebc-coast.jpg" alt="" className="rounded-2xl object-cover w-full aspect-[4/3]" />
        </div>
      </section>

      {/* Numbers */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14">
        <div className="border border-hairline rounded-2xl bg-white p-6 md:p-10 grid sm:grid-cols-4 gap-6">
          <Big n="9 of 10" t="enquiries never fit your project" />
          <Big n="€0" t="to receive buyers from the network" />
          <Big n="€15" t="average you earn per lead you share" />
          <Big n="20%" t="of the commission if your lead buys elsewhere" />
        </div>
      </section>

      {/* How it works, visual */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14">
        <H>How it works</H>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[[Search, "1. Paste your project", "We score it and tell you what buyers will see."], [Users, "2. We find buyers who fit", "Deposit, country, handover date, payment plan. Matches, never lists."], [Handshake, "3. You close", "Each contact comes with an introduction ID. Nobody downloads anyone's database."], [Coins, "4. It settles itself", "Commission comes out of the reservation deposit. 65% to who closes, 20% to who brought the buyer, 15% to RealHunt."]].map(([I, t, d]: any) => (
            <div key={t} className="border border-hairline rounded-2xl bg-white p-6"><I size={22} className="text-ink-muted" /><p className="font-display text-[19px] tracking-tight mt-4">{t}</p><p className="text-[14px] text-ink-muted mt-2 leading-relaxed">{d}</p></div>
          ))}
        </div>
      </section>

      {/* Math */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14">
        <div className="rounded-2xl bg-ink text-paper p-8 md:p-12 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="text-[17px] leading-relaxed"><p className="opacity-80">You spent €100,000 on ads. 5,000 contacts. You sold 20.</p><p className="mt-2 font-medium">The other 4,980 are dead in your CRM right now.</p><p className="mt-4 opacity-80">If 1% of them buy inside the network, at a €200,000 ticket and 5% commission, your 20% is:</p></div>
          <div className="text-center md:text-right"><p className="font-display text-[clamp(44px,7vw,80px)] leading-none tracking-tight tabular-nums">€100,000</p><p className="text-[13px] opacity-70 mt-2">without selling one more unit of your own</p></div>
        </div>
      </section>

      {/* Safety */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14 grid md:grid-cols-2 gap-6">
        <div className="border border-hairline rounded-2xl bg-white p-8">
          <p className="font-display text-[24px] tracking-tight leading-snug">"I am not handing my database to a competitor."</p>
          <p className="text-[15px] text-ink-muted mt-2">Good. We will not ask you to.</p>
          <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed">
            {["You upload fingerprints, not contacts. No names, emails or phones. It cannot be reversed.", "If a buyer was already yours, we do not introduce them and you pay nothing.", "Uploading fingerprints is not sharing leads. Sharing is a second decision, contact by contact."].map((t) => <li key={t} className="flex gap-3"><Lock size={16} className="shrink-0 mt-1 text-ink-muted" />{t}</li>)}
          </ul>
        </div>
        <div className="border border-hairline rounded-2xl bg-white p-8">
          <p className="font-display text-[24px] tracking-tight leading-snug">The rule, said plainly</p>
          <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed">
            <li className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-ink-muted" /><span><b>What you declare pays you.</b> Your contact buys another project in the network, you get 20%.</span></li>
            <li className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-ink-muted" /><span><b>What you do not declare does not protect you.</b> We send you someone you had but never declared, that commission goes to RealHunt.</span></li>
            <li className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-ink-muted" /><span>One developer per segment and city for the first 90 days. Commission agreed in writing before any contact is revealed. Every introduction logged.</span></li>
          </ul>
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-24 text-center">
        <H>You already paid for those buyers. Collect.</H>
        <p className="mt-3 text-[15px] text-ink-muted">Opening market by market. Right now: Bali, Dubai, Albania and Costa del Sol.</p>
        <a href="#analyze" className="rh-btn-primary inline-flex mt-6">Find me buyers, free</a>
      </section>

      <footer className="border-t border-hairline"><div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted"><Link to="/" className="hover:text-ink">Deals</Link><Link to="/score" className="hover:text-ink">Score a listing</Link><Link to="/legal/terms" className="hover:text-ink">Terms</Link><span className="ml-auto">Referral payouts subject to local licensing rules in each market.</span></div></footer>
    </div>
  );
};
export default Network;
