import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import { Check, Search, Users, Coins, Lock, Phone, Mail, FileSignature } from "lucide-react";
import { track } from "@/lib/rh";
import { COMMISSION_PCT, SOURCE_SHARE_PCT, PAYMENT_DAYS } from "@/lib/agreement";

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

  const start = (e: React.FormEvent) => { e.preventDefault(); let u = url.trim(); if (!u) return; if (!/^https?:\/\//i.test(u)) u = "https://" + u.replace(/^\/+/, ""); setUrl(u); track("network_analyze", { meta: { url: u } }); setStage("loading"); };
  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault(); if (!/.+@.+\..+/.test(email)) return; setStage("share");
    try { await db.from("contact_requests").insert({ email, company: url, message: `receive${phone ? " | phone: " + phone : ""}`, source: "network_analyze" }); } catch {}
  };
  const answerShare = async (yes: boolean) => {
    setShare(yes); setStage("done");
    if (yes) { try { await db.from("contact_requests").insert({ email, company: url, message: `share${phone ? " | phone: " + phone : ""}`, source: "network_share" }); } catch {} }
  };

  const H = ({ children }: { children: React.ReactNode }) => <h2 className="font-display text-[clamp(26px,3.6vw,38px)] leading-tight tracking-tight text-balance">{children}</h2>;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      {/* Hero with photos */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pt-8 md:pt-14 pb-10 grid md:grid-cols-[1.1fr_1fr] gap-8 items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-4">RealHunt Network · developers and agencies</p>
          <h1 className="font-display text-[clamp(34px,5.6vw,60px)] leading-[1.0] tracking-tight text-balance">Free buyers for your project. You pay {COMMISSION_PCT}% only when one buys.</h1>
          <p className="mt-5 text-[17px] text-ink-muted max-w-[52ch] leading-relaxed">Two things you can do here, separately or together: <b className="text-ink">receive buyers</b> for your project (you pay {COMMISSION_PCT}% only when one buys), and <b className="text-ink">earn {SOURCE_SHARE_PCT}%</b> every time a lead you could not sell to buys another project in the network.</p>

          <div id="analyze" className="mt-7 border border-hairline rounded-2xl bg-white p-5 md:p-6 shadow-sm">
            {stage === "idle" && (
              <form onSubmit={start} className="flex flex-col sm:flex-row gap-2">
                <input required type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="your-project.com" aria-label="Project URL" className="flex-1 border border-hairline rounded-full px-5 py-3.5 text-[15px] bg-paper outline-none focus:border-ink" />
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
                <p className="text-[12px] text-ink-muted">Zero cost to receive. {COMMISSION_PCT}% only if one of them buys, signed in writing first.</p>
              </form>
            )}
            {stage === "share" && (
              <div className="flex flex-col gap-3">
                <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Done. Your buyers and RH Score land in {email} within 24 hours.</p>
                <div className="border-t border-hairline pt-4">
                  <p className="font-display text-[20px] tracking-tight">One more thing. Do you have leads you could not sell to?</p>
                  <p className="text-[15px] text-ink-muted mt-1">Share them with the network and you earn <b className="text-ink">{SOURCE_SHARE_PCT}% of the sale</b> every time one of them buys someone else's project. Leads you already paid for and wrote off.</p>
                  <div className="flex gap-2 mt-4"><button onClick={() => answerShare(true)} className="rh-btn-primary inline-flex items-center gap-2"><Coins size={16} /> Yes, I want to earn from my leads</button><button onClick={() => answerShare(false)} className="px-5 py-2.5 rounded-full border border-hairline text-[14px] hover:border-ink">Not now</button></div>
                </div>
              </div>
            )}
            {stage === "done" && (
              <div className="flex flex-col gap-2">
                <p className="inline-flex items-center gap-2 text-[15px]"><Check size={18} /> {share ? "Great. Open your panel: upload your leads as fingerprints, never as contacts." : "Noted. Your buyers are on the way."}</p>
                <Link to="/network/app" onClick={() => { try { sessionStorage.setItem("rh_dev_prefill", JSON.stringify({ email, phone, project_url: url })); } catch {} }} className="rh-btn-primary self-start inline-flex items-center gap-2 mt-1"><Lock size={16} /> Open your developer panel →</Link>
                <p className="text-[13px] text-ink-muted">Free. Your contacts are hashed in your browser before anything is sent.</p>
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

      {/* Two ways to earn. Pick one, or both. */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14">
        <H>Two ways to make money here. Pick one, or both.</H>
        <p className="mt-2 text-[15px] text-ink-muted max-w-[62ch]">Nothing to pay to join. Every option below is a separate switch inside your panel, and you can flip it on or off whenever you want.</p>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="border border-hairline rounded-2xl bg-white p-6 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Option A</p>
            <p className="font-display text-[24px] tracking-tight mt-1">Receive buyers</p>
            <p className="text-[15px] text-ink-muted mt-2 leading-relaxed">We send you people who already told us they want to buy where you build. You sell to them as you would to anyone else.</p>
            <div className="mt-4 rounded-xl bg-paper border border-hairline p-4 text-[14px]"><p><b>You pay:</b> {COMMISSION_PCT}% of the sale, only if one of them buys.</p><p className="mt-1"><b>You pay if nobody buys:</b> €0.</p></div>
            <p className="text-[13px] text-ink-muted mt-3">Example: a buyer we sent you pays €200,000. You pay us €10,000 once the deal is done. That is all.</p>
          </div>
          <div className="border border-hairline rounded-2xl bg-white p-6 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Option B</p>
            <p className="font-display text-[24px] tracking-tight mt-1">Earn from leads you could not sell to</p>
            <p className="text-[15px] text-ink-muted mt-2 leading-relaxed">You already paid for thousands of contacts who never bought from you. Mark them as shared. If one of them buys a different project in the network, you get paid.</p>
            <div className="mt-4 rounded-xl bg-paper border border-hairline p-4 text-[14px]"><p><b>You earn:</b> {SOURCE_SHARE_PCT}% of that sale.</p><p className="mt-1"><b>You pay:</b> nothing. The other developer pays the {COMMISSION_PCT}%, and {SOURCE_SHARE_PCT}% of it comes to you.</p></div>
            <p className="text-[13px] text-ink-muted mt-3">Example: one of your old leads buys a €200,000 villa somewhere else. You receive €6,000 for a contact you had written off.</p>
          </div>
          <div className="border-2 border-ink rounded-2xl bg-white p-6 flex flex-col relative">
            <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-ink text-paper text-[11px] font-medium">Most developers choose this</span>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted">Option A + B</p>
            <p className="font-display text-[24px] tracking-tight mt-1">Both</p>
            <p className="text-[15px] text-ink-muted mt-2 leading-relaxed">Receive buyers for your project and put your dead leads to work at the same time. One panel, two switches.</p>
            <div className="mt-4 rounded-xl bg-paper border border-hairline p-4 text-[14px]"><p><b>You pay:</b> {COMMISSION_PCT}% only on buyers we bring you who buy.</p><p className="mt-1"><b>You earn:</b> {SOURCE_SHARE_PCT}% every time one of your shared leads buys elsewhere.</p></div>
            <p className="text-[13px] text-ink-muted mt-3">Most developers end up earning more from B than they pay in A, because a dead list is usually much bigger than the list of buyers we send.</p>
          </div>
        </div>
      </section>

      {/* Where the 5% goes */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14">
        <div className="border border-hairline rounded-2xl bg-white p-6 md:p-10">
          <H>Where the {COMMISSION_PCT}% goes</H>
          <p className="mt-2 text-[15px] text-ink-muted max-w-[62ch]">There is only one payment in the whole system: the developer who sells pays {COMMISSION_PCT}% of the sale. Nobody pays anything else, ever. That {COMMISSION_PCT}% is then split like this.</p>
          <div className="mt-6 grid md:grid-cols-[1fr_1fr] gap-6">
            <div>
              <p className="text-[13px] font-medium mb-2">When the buyer came from another developer's shared leads</p>
              <div className="flex rounded-xl overflow-hidden border border-hairline text-[13px] font-medium">
                <div className="bg-ink text-paper px-3 py-3 text-center" style={{ width: "60%" }}>{SOURCE_SHARE_PCT}% to the developer who brought the lead</div>
                <div className="bg-hairline text-ink px-3 py-3 text-center" style={{ width: "40%" }}>{COMMISSION_PCT - SOURCE_SHARE_PCT}% RealHunt</div>
              </div>
              <p className="text-[13px] text-ink-muted mt-2">€200,000 sale → seller pays €10,000 → €6,000 to the lead owner, €4,000 to RealHunt.</p>
            </div>
            <div>
              <p className="text-[13px] font-medium mb-2">When the buyer came from RealHunt directly</p>
              <div className="flex rounded-xl overflow-hidden border border-hairline text-[13px] font-medium">
                <div className="bg-hairline text-ink px-3 py-3 text-center w-full">{COMMISSION_PCT}% RealHunt</div>
              </div>
              <p className="text-[13px] text-ink-muted mt-2">€200,000 sale → seller pays €10,000 → all to RealHunt, because nobody else brought the lead.</p>
            </div>
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-4 text-[14px]">
            <div className="rounded-xl bg-paper border border-hairline p-4"><p className="font-display text-[26px] tracking-tight">{COMMISSION_PCT}%</p><p className="text-ink-muted mt-1">is the most anyone ever pays, and only after a sale.</p></div>
            <div className="rounded-xl bg-paper border border-hairline p-4"><p className="font-display text-[26px] tracking-tight">{SOURCE_SHARE_PCT}%</p><p className="text-ink-muted mt-1">of the sale goes to whoever brought the lead. Paid within {PAYMENT_DAYS} days.</p></div>
            <div className="rounded-xl bg-paper border border-hairline p-4"><p className="font-display text-[26px] tracking-tight">0%</p><p className="text-ink-muted mt-1">on buyers you already had and uploaded before we introduced them.</p></div>
          </div>
        </div>
      </section>

      {/* How it works, visual */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14">
        <H>How it works, step by step</H>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[[Search, "1. Paste your project", "We score it and tell you what buyers will see. Takes a minute."], [FileSignature, "2. Sign one page, upload your contacts", "The agreement is signed inside your panel by typing your name. Then you upload your contacts: they are turned into fingerprints in your browser, we never see a name or an email. Whatever is in your list before we introduce it stays yours at 0%."], [Users, "3. Choose your switches, receive buyers", "Turn on receiving, sharing, or both. Each buyer arrives with an introduction ID and a card in your pipeline. Accept, call, visit, reserve, sell."], [Coins, "4. Report the sale, we settle it", `Enter the price in your panel. We invoice ${COMMISSION_PCT}%, you pay in ${PAYMENT_DAYS} days. If the buyer came from another developer's shared list, we pay them their ${SOURCE_SHARE_PCT}%. You never deal with anyone but us.`]].map(([I, t, d]: any) => (
            <div key={t} className="border border-hairline rounded-2xl bg-white p-6"><I size={22} className="text-ink-muted" /><p className="font-display text-[19px] tracking-tight mt-4">{t}</p><p className="text-[14px] text-ink-muted mt-2 leading-relaxed">{d}</p></div>
          ))}
        </div>
      </section>

      {/* Math */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14">
        <div className="rounded-2xl bg-ink text-paper p-8 md:p-12 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="text-[17px] leading-relaxed"><p className="opacity-80">Say you spent €100,000 on ads. 5,000 contacts. You sold 20.</p><p className="mt-2 font-medium">The other 4,980 are sitting dead in your CRM right now.</p><p className="mt-4 opacity-80">Share them. If just 1 in 100 buys another project in the network at €200,000, your {SOURCE_SHARE_PCT}% on each of those ~50 sales adds up to:</p></div>
          <div className="text-center md:text-right"><p className="font-display text-[clamp(44px,7vw,80px)] leading-none tracking-tight tabular-nums">€300,000</p><p className="text-[13px] opacity-70 mt-2">without selling one more unit of your own, and without paying a cent</p></div>
        </div>
      </section>

      {/* Safety */}
      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-14 grid md:grid-cols-2 gap-6">
        <div className="border border-hairline rounded-2xl bg-white p-8">
          <p className="font-display text-[24px] tracking-tight leading-snug">"I am not handing my database to a competitor."</p>
          <p className="text-[15px] text-ink-muted mt-2">Good. We will not ask you to.</p>
          <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed">
            {["You upload fingerprints, not contacts. No names, emails or phones. It cannot be reversed, not even by us.", "If a buyer was already in your list before we introduced them, the sale is exempt automatically and you pay nothing.", "Uploading is not sharing. Uploading protects you. Sharing is a second, separate decision, contact by contact, and only shared contacts can earn you the 3%."].map((t) => <li key={t} className="flex gap-3"><Lock size={16} className="shrink-0 mt-1 text-ink-muted" />{t}</li>)}
          </ul>
        </div>
        <div className="border border-hairline rounded-2xl bg-white p-8">
          <p className="font-display text-[24px] tracking-tight leading-snug">The three rules, said plainly</p>
          <ul className="mt-5 flex flex-col gap-3 text-[15px] leading-relaxed">
            <li className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-ink-muted" /><span><b>What you upload protects you.</b> A buyer in your list before the introduction is yours. 0%.</span></li>
            <li className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-ink-muted" /><span><b>What you do not upload does not protect you.</b> We send you someone you had but never uploaded, and they buy: that is our {COMMISSION_PCT}%. So upload first, it takes five minutes.</span></li>
            <li className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-ink-muted" /><span><b>What you share pays you.</b> Your contact buys another project in the network, you get {SOURCE_SHARE_PCT}% of that sale, and you paid nothing.</span></li>
            <li className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-ink-muted" /><span>One page, signed before any contact is revealed. Every introduction logged. <Link to="/network/agreement" className="underline">Read the agreement</Link>.</span></li>
          </ul>
        </div>
      </section>

      <section className="max-w-[1240px] mx-auto px-4 md:px-6 pb-24 text-center">
        <H>You already paid for those buyers. Collect.</H>
        <p className="mt-3 text-[15px] text-ink-muted">Opening market by market. Right now: Bali, Dubai, Albania and Costa del Sol.</p>
        <a href="#analyze" className="rh-btn-primary inline-flex mt-6">Find me buyers, free</a>
      </section>

      <footer className="border-t border-hairline"><div className="max-w-[1240px] mx-auto px-4 md:px-6 py-8 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted"><Link to="/" className="hover:text-ink">Deals</Link><Link to="/score" className="hover:text-ink">Score a listing</Link><Link to="/network/agreement" className="hover:text-ink">Network agreement</Link><Link to="/legal/terms" className="hover:text-ink">Terms</Link><span className="ml-auto">Referral payouts subject to local licensing rules in each market.</span></div></footer>
    </div>
  );
};
export default Network;
