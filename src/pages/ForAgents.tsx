import { Link } from "react-router-dom";
import { Check, ArrowRight, Shield, FileText, Share2 } from "lucide-react";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const ForAgents = () => {
  useDocumentMeta({
    title: "For Agents — The report that convinces your client in 10 seconds | RealHunt",
    description: "Send a branded, independent forensic report on any listing. WhatsApp-friendly PDF, Verified by RealHunt badge, and a short link that previews beautifully.",
    canonicalUrl: "https://realhunt.co/for-agents",
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[1140px] mx-auto px-6 py-12 md:py-20">
        <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">For working agents</div>
        <h1 className="font-display text-[40px] md:text-[60px] leading-[1.02] mt-2 max-w-[900px]">
          The report that convinces your client in 10 seconds<span className="text-accent-gold">.</span>
        </h1>
        <p className="reading text-ink-muted mt-4 max-w-[640px] text-[16px]">
          Drop any listing URL. Get back a branded one-page dossier — score, verdict, 5 forensic dimensions, comparable €/m² — ready to send on WhatsApp. Independent. No paid placement.
        </p>

        <div className="flex flex-wrap gap-3 mt-7">
          <Link to="/pricing" className="rh-btn-primary !px-6 !py-3 inline-flex items-center gap-1">
            Get Agent Pro — €39/mo <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 rounded-full border border-hairline px-6 py-3 text-[14px] text-ink hover:bg-[#FBF8F1]">
            Try a free score first
          </Link>
        </div>

        {/* Mock preview */}
        <h2 className="mt-14 font-display text-[28px] md:text-[34px] text-ink">What your client receives</h2>
        <div className="mt-6 grid md:grid-cols-2 gap-8 items-start">
          <div className="rounded-2xl border border-hairline bg-surface p-6 md:p-8 shadow-[0_4px_40px_-20px_rgba(15,17,21,0.25)]">
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-[20px]">Carla Mendes</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">Mendes & Co.</div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-full border-2 border-accent-gold flex items-center justify-center font-display text-[28px] text-ink">87</div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-ink-soft">Verdict</div>
                <div className="font-display text-[22px] text-good">Strong buy</div>
                <div className="text-[12px] text-ink-muted mt-1">€3,400/m² — 18% below district median</div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-5 gap-2 text-center">
              {["Developer", "Delivery", "Legal", "Location", "Economics"].map((d, i) => (
                <div key={d}>
                  <div className="text-[10px] text-ink-soft">{d}</div>
                  <div className="font-mono text-[14px] text-ink">{[9, 8, 9, 8, 7][i]}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-hairline flex items-center justify-between text-[11px] text-ink-soft">
              <span>realhunt.co/r/…</span>
              <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3 text-accent-gold" /> Verified by RealHunt</span>
            </div>
          </div>

          <div className="space-y-6">
            <Feature icon={FileText} title="Branded send-to-client PDF" body="Your name, logo, and accent color on every dossier. The data is RealHunt's; the framing is yours." />
            <Feature icon={Shield} title="Verified by RealHunt badge" body="Embed the badge on your listings so clients see the report exists before they ask." />
            <Feature icon={Share2} title="WhatsApp short link" body="A 7-char link that previews with the property photo, score, and grade in every chat app." />
          </div>
        </div>

        {/* Pricing teaser */}
        <h2 className="mt-16 font-display text-[28px] md:text-[34px] text-ink">Plans for agents</h2>
        <div className="mt-6 rounded-2xl border border-hairline bg-[#FBF8F1] p-8 md:p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="font-display text-[26px] text-ink">Agent Pro — €39/month</div>
              <ul className="mt-3 space-y-1.5 text-[13px] text-ink-muted">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent-gold" /> Unlimited scores</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent-gold" /> Branded PDF dossiers</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent-gold" /> Verified badge</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent-gold" /> Cancel anytime</li>
              </ul>
            </div>
            <Link to="/pricing" className="rh-btn-primary !px-6 !py-3 inline-flex items-center gap-1 self-start md:self-auto">
              Start with Agent Pro <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

const Feature = ({ icon: Icon, title, body }: any) => (
  <div className="flex items-start gap-4">
    <div className="h-10 w-10 rounded-full bg-accent-gold/10 flex items-center justify-center flex-shrink-0">
      <Icon className="h-5 w-5 text-accent-gold" />
    </div>
    <div>
      <div className="font-display text-[18px] text-ink">{title}</div>
      <p className="text-[13px] text-ink-muted mt-1">{body}</p>
    </div>
  </div>
);

export default ForAgents;
