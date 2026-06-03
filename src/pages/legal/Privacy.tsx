import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Privacy = () => {
  useDocumentMeta({
    title: "Privacy Policy — RealHunt",
    description: "How RealHunt collects, uses, and protects your data. GDPR-friendly. We never sell your data.",
    canonicalUrl: "https://realhunt.co/legal/privacy",
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[760px] mx-auto px-6 py-16 md:py-24">
        <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Legal</div>
        <h1 className="font-display text-[40px] md:text-[52px] leading-[1.05] mt-2 tracking-[-0.02em]">
          Privacy Policy
        </h1>
        <p className="text-[13px] text-ink-soft mt-3">Last updated: June 3, 2026</p>

        <div className="prose-rh mt-10 space-y-7 text-[15.5px] leading-[1.7] text-ink-muted">
          <p>
            RealHunt ("we", "us") provides an AI-powered real-estate deal analysis service.
            We respect your privacy. This page explains what we collect, why, and the rights
            you have under the EU General Data Protection Regulation (GDPR) and equivalent laws.
          </p>

          <Section title="The short version">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>We never sell your data. Ever.</li>
              <li>We only collect what we need to run the product.</li>
              <li>You can export or delete your account data at any time by emailing us.</li>
            </ul>
          </Section>

          <Section title="What we collect">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account data</strong>: your email address, and a hashed password (or your Google identity if you sign in with Google).</li>
              <li><strong>Listings you analyze</strong>: the property URLs you submit, the resulting RealHunt Score, and the metadata we extract from public listings.</li>
              <li><strong>Usage data</strong>: pages visited, features used, approximate location (country/city from IP), device and browser type — used to improve the product.</li>
              <li><strong>Billing data</strong>: if you subscribe, Stripe processes your payment. We never see or store your full card number.</li>
            </ul>
          </Section>

          <Section title="Cookies">
            We use a small number of essential cookies to keep you signed in and remember preferences.
            We use privacy-friendly analytics (no third-party ad tracking) to understand which features
            are useful. You can clear cookies from your browser at any time.
          </Section>

          <Section title="How we use your data">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To run, secure and improve the RealHunt service.</li>
              <li>To send you transactional emails (sign-in, receipts, report-ready notifications).</li>
              <li>To answer your support requests at hello@realhunt.co.</li>
              <li>We do <em>not</em> use your data to train third-party AI models.</li>
            </ul>
          </Section>

          <Section title="Your rights">
            You have the right to access, correct, export, restrict, or delete your personal data.
            Email <a className="rh-btn-tertiary" href="mailto:hello@realhunt.co">hello@realhunt.co</a> and
            we will respond within 30 days.
          </Section>

          <Section title="Data retention & security">
            Account data is kept as long as your account is active. Analyses are kept so you can
            revisit them; you can delete any analysis from the app. We use industry-standard
            encryption in transit (TLS) and at rest. Authentication and database are hosted on
            Supabase (EU region where possible).
          </Section>

          <Section title="Sub-processors">
            We share data only with the vendors strictly required to run the product:
            Supabase (database, auth), Stripe (payments), Google Cloud / OpenAI / Anthropic / Google
            Gemini (AI model inference, on a no-training basis), and Resend (transactional email).
          </Section>

          <Section title="Contact">
            Questions? Email <a className="rh-btn-tertiary" href="mailto:hello@realhunt.co">hello@realhunt.co</a>.
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

export default Privacy;
