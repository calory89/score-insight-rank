import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Terms = () => {
  useDocumentMeta({
    title: "Terms of Service — RealHunt",
    description: "The terms that govern your use of RealHunt. Informational only — not investment advice.",
    canonicalUrl: "https://realhunt.co/legal/terms",
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[760px] mx-auto px-6 py-16 md:py-24">
        <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Legal</div>
        <h1 className="font-display text-[40px] md:text-[52px] leading-[1.05] mt-2 tracking-[-0.02em]">
          Terms of Service
        </h1>
        <p className="text-[13px] text-ink-soft mt-3">Last updated: June 3, 2026</p>

        <div className="prose-rh mt-10 space-y-7 text-[15.5px] leading-[1.7] text-ink-muted">
          <p>
            These Terms govern your use of RealHunt ("the Service"), provided by RealHunt.
            By creating an account or using the Service you agree to them. If you don't agree,
            don't use the Service.
          </p>

          <Section title="What RealHunt does">
            RealHunt analyzes publicly listed real-estate properties (from sources like Idealista,
            Rightmove, Zillow, Redfin, PropertyFinder and Airbnb) and produces a forensic score
            and report. We are a software tool that helps you do better due diligence — we are
            not a real-estate broker, agent, or financial advisor.
          </Section>

          <Section title="Not investment advice">
            Every score, verdict, and number in a RealHunt report is <strong>informational only</strong>.
            It is not legal, tax, financial, or investment advice. You are solely responsible for
            your own buying, selling, or investment decisions and should consult licensed
            professionals (lawyer, tax advisor, qualified agent) before transacting.
          </Section>

          <Section title="Acceptable use">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Don't try to break, scrape, or reverse-engineer the Service.</li>
              <li>Don't submit unlawful content or use the Service to harm others.</li>
              <li>Don't share your account with people outside your plan's seat count.</li>
              <li>Don't republish RealHunt reports as if they were written by a human analyst.</li>
            </ul>
          </Section>

          <Section title="Subscriptions, billing & cancellation">
            Paid plans are billed monthly via Stripe. You can cancel from your account at any
            time, in two clicks; the cancellation takes effect at the end of the current billing
            period. We do not pro-rate refunds for partial months, with one exception: if a
            specific report is materially inaccurate, email us within 7 days and we will refund
            in full. VAT is added where applicable.
          </Section>

          <Section title="Free tier">
            We provide 5 free analyses per month. We may rate-limit or change the free tier with
            reasonable notice.
          </Section>

          <Section title="Account & content">
            You own the property URLs and notes you submit. You grant us a limited license to
            process them in order to deliver the Service. We may use anonymous, aggregated data
            (e.g. "average RH Score in Marbella was 6.8") for product analytics and benchmarks.
          </Section>

          <Section title="Disclaimer of warranties">
            The Service is provided "as is" without warranties of any kind. We do our best to be
            accurate, but listings change, public data sources can be wrong, and AI can be wrong.
            We do not warrant that the Service will be uninterrupted or error-free.
          </Section>

          <Section title="Limitation of liability">
            To the maximum extent permitted by law, RealHunt's total liability to you for any
            claim arising out of or relating to the Service is limited to the amount you paid us
            in the 12 months preceding the claim, or €100, whichever is greater.
          </Section>

          <Section title="Termination">
            You can delete your account at any time by emailing hello@realhunt.co. We can suspend
            or terminate accounts that violate these Terms.
          </Section>

          <Section title="Changes">
            We may update these Terms. If the changes are material, we'll let you know by email
            or in-app at least 30 days in advance.
          </Section>

          <Section title="Governing law">
            These Terms are governed by the laws of Spain. Disputes are subject to the exclusive
            jurisdiction of the courts of Madrid, without prejudice to mandatory consumer rights
            in your country of residence.
          </Section>

          <Section title="Contact">
            Questions about these Terms? Email <a className="rh-btn-tertiary" href="mailto:hello@realhunt.co">hello@realhunt.co</a>.
          </Section>
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section>
    <h2 className="font-display text-[22px] md:text-[26px] text-ink mb-3 tracking-[-0.01em]">{title}</h2>
    <div>{children}</div>
  </section>
);

export default Terms;
