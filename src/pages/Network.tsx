import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import { Check } from "lucide-react";

const Network = () => {
  const [f, setF] = useState({ email: "", company: "", message: "" });
  const [sent, setSent] = useState(false);
  useEffect(() => { document.title = "RealHunt Network · Get paid for the buyers you could not sell to"; }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!/.+@.+\..+/.test(f.email)) return; setSent(true);
    try { await (supabase as any).from("contact_requests").insert({ email: f.email, company: f.company, message: f.message, source: "network" }); } catch {}
  };

  const H = ({ children }: { children: React.ReactNode }) => <h2 className="font-display text-[clamp(24px,3.4vw,34px)] leading-tight tracking-tight text-balance">{children}</h2>;
  const Step = ({ n, t, d }: { n: string; t: string; d: string }) => (
    <div className="flex gap-4"><span className="font-display text-[22px] text-ink-muted w-8 shrink-0">{n}</span><div><p className="font-display text-[17px] tracking-tight">{t}</p><p className="text-[15px] text-ink-muted mt-1 leading-relaxed">{d}</p></div></div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      <section className="max-w-[1140px] mx-auto px-6 pt-14 pb-12">
        <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-4">RealHunt Network · for developers and agencies</p>
        <h1 className="font-display text-[clamp(34px,6vw,62px)] leading-[1.0] tracking-tight max-w-[20ch] text-balance">
          Every month you bin buyers who would have bought. Somewhere else.
        </h1>
        <p className="mt-6 text-[18px] text-ink-muted max-w-[58ch] leading-relaxed">
          Nine out of ten people who enquire never fit your project. They are not bad buyers. They are buyers of someone else's project. We place them inside the network and <b className="text-ink">you get paid when they buy, even if they buy from another developer.</b>
        </p>
        <div className="mt-8 flex flex-wrap gap-3 items-center">
          <a href="#apply" className="rh-btn-primary">Request access</a>
          <span className="text-[13px] text-ink-muted">No setup fee. No lock-in. Money only moves when a sale happens.</span>
        </div>
      </section>

      <section className="max-w-[1140px] mx-auto px-6 pb-16">
        <div className="border border-hairline rounded-2xl bg-white p-8 md:p-10 grid md:grid-cols-[1fr_auto] gap-8 items-center">
          <div className="text-[16px] leading-relaxed text-ink-muted">
            <p>You spent €100,000 on ads. You got 5,000 contacts. You sold 20.</p>
            <p className="mt-2 text-ink font-medium">The other 4,980 are dead in your CRM right now.</p>
            <p className="mt-4">If just 1% of them buy inside the network, on a €200,000 average ticket and a 5% commission:</p>
          </div>
          <div className="text-center md:text-right">
            <p className="font-display text-[clamp(40px,6vw,64px)] leading-none tracking-tight tabular-nums">€100,000</p>
            <p className="text-[13px] text-ink-muted mt-2">recovered, without selling one more unit of your own</p>
          </div>
        </div>
      </section>

      <section className="max-w-[1140px] mx-auto px-6 pb-16 grid md:grid-cols-2 gap-12">
        <div className="flex flex-col gap-6">
          <H>How it works</H>
          <Step n="1" t="We revive them, not you." d="We contact your dormant buyers, get their explicit permission and re-qualify budget and timing. Only people who say yes and are still looking enter the network." />
          <Step n="2" t="We match on what matters." d="Deposit available, country, handover date and payment plan. We never send lists. We send matches." />
          <Step n="3" t="Another developer closes." d="They receive the contact with a unique introduction ID. Nobody can ever download your database." />
          <Step n="4" t="It settles itself." d="The commission is deducted from the reservation deposit before anyone is paid. 65% to whoever closes, 20% to whoever brought the buyer, 15% to RealHunt." />
        </div>
        <div className="border border-hairline rounded-2xl bg-white p-8 flex flex-col gap-4 self-start">
          <p className="font-display text-[22px] tracking-tight leading-snug">"I am not handing my database to a competitor."</p>
          <p className="text-[15px] text-ink-muted">Good. We will not ask you to.</p>
          <ul className="flex flex-col gap-3 text-[15px] leading-relaxed">
            <li><b>You upload fingerprints, not contacts.</b> Your CRM becomes a list of unreadable strings. No names, no emails, no phones. It cannot be reversed.</li>
            <li><b>It exists to protect you.</b> We compare fingerprints before introducing anyone. If a buyer was already yours, we do not introduce them and you pay nothing.</li>
            <li><b>We can only check overlap with people already in the network.</b> We cannot extract a single contact of yours that we do not already hold.</li>
            <li><b>Uploading fingerprints is not sharing leads.</b> Two separate decisions. The second one you make contact by contact.</li>
          </ul>
        </div>
      </section>

      <section className="max-w-[1140px] mx-auto px-6 pb-16">
        <H>The rule, said plainly</H>
        <div className="mt-6 grid md:grid-cols-2 gap-5">
          <div className="border border-hairline rounded-xl p-6 bg-white"><p className="font-display text-[18px] tracking-tight">What you declare protects you and pays you.</p><p className="text-[15px] text-ink-muted mt-2">If a contact of yours ends up buying another project in the network, you receive 20%.</p></div>
          <div className="border border-hairline rounded-xl p-6 bg-white"><p className="font-display text-[18px] tracking-tight">What you do not declare does not protect you.</p><p className="text-[15px] text-ink-muted mt-2">If we send you someone you already had but never declared, that sale's commission goes entirely to RealHunt.</p></div>
        </div>
        <p className="mt-4 text-[14px] text-ink-muted">Declaring is free, shares nothing and only benefits you. There is no reason not to.</p>
      </section>

      <section className="max-w-[1140px] mx-auto px-6 pb-16">
        <H>What you can count on</H>
        <ul className="mt-6 grid sm:grid-cols-2 gap-x-10 gap-y-3 text-[15px] leading-relaxed">
          {["One developer per segment and city for the first 90 days.", "Commission agreed in writing before any contact is revealed.", "Deducted from the deposit, so nobody has to trust anyone's word.", "Every introduction logged with date, time and project.", "Every project in the network is scored on RealHunt. You know who you are sending your buyer to.", "Never a full database export. Not for you, not for anyone."].map((t) => (
            <li key={t} className="flex gap-3"><Check size={18} className="shrink-0 mt-1 text-ink-muted" />{t}</li>
          ))}
        </ul>
      </section>

      <section id="apply" className="max-w-[1140px] mx-auto px-6 pb-24">
        <div className="border border-hairline rounded-2xl bg-white p-8 md:p-10 max-w-[720px]">
          <H>You already paid for those buyers. Collect.</H>
          <p className="mt-3 text-[15px] text-ink-muted">Opening market by market. Right now: Bali, Dubai, Albania and Costa del Sol.</p>
          {sent ? <p className="mt-6 inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Received. We reply within two working days.</p> : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
              <input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Work email" aria-label="Work email" className="border border-hairline rounded-lg px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" />
              <input value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} placeholder="Company and market (e.g. Sumba Villas, Bali)" aria-label="Company" className="border border-hairline rounded-lg px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink" />
              <textarea value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Roughly how many unconverted contacts do you have, and what do you sell?" aria-label="Message" rows={3} className="border border-hairline rounded-lg px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink resize-none" />
              <button type="submit" className="rh-btn-primary self-start">Request access to the network</button>
            </form>
          )}
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="max-w-[1140px] mx-auto px-6 py-10 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted">
          <Link to="/" className="hover:text-ink">Deals</Link><Link to="/score" className="hover:text-ink">Score a listing</Link><Link to="/method" className="hover:text-ink">Method</Link><Link to="/legal/terms" className="hover:text-ink">Terms</Link>
          <span className="ml-auto">Referral payouts subject to local licensing rules in each market.</span>
        </div>
      </footer>
    </div>
  );
};

export default Network;
