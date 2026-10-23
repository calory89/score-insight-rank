import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Dim = ({
  name, bullets, sources, limits, updated, weight,
}: {
  name: string;
  bullets: string[];
  sources: { label: string; url?: string }[];
  limits: string;
  updated: string;
  weight: number;
}) => (
  <section className="py-12 hairline-b last:border-b-0">
    <div className="flex items-baseline justify-between flex-wrap gap-2">
      <h2 className="font-display text-[28px] text-ink">{name}</h2>
      <span className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
        Weight: <span className="text-ink font-mono">{weight}%</span> of the Global Score
      </span>
    </div>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 reading">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-3">What we check</div>
        <ul className="space-y-2 text-ink-muted">{bullets.map((b) => <li key={b}>· {b}</li>)}</ul>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-3">Sources</div>
        <ul className="space-y-2 text-ink-muted">
          {sources.map((s) => (
            <li key={s.label}>
              {s.url ? <a href={s.url} target="_blank" rel="noreferrer" className="rh-btn-tertiary">{s.label}</a> : <span>{s.label}</span>}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-3">Known limitations</div>
        <p className="text-ink-muted">{limits}</p>
        <div className="mt-4 text-[12px] text-ink-soft">Last updated: {updated}</div>
      </div>
    </div>
  </section>
);

const Method = () => {
  useDocumentMeta({
    title: "Method — How the RealHunt Global Score is computed",
    description:
      "Every weight, every source, every formula. Public methodology behind the RH 5-dimension forensic property score.",
    canonicalUrl: "https://realhunt.co/method/analysis",
    ogType: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "How the RealHunt Global Score is computed",
      description:
        "Every weight, every source, every formula. Public methodology behind the RH 5-dimension forensic property score.",
      mainEntityOfPage: "https://realhunt.co/method",
      publisher: { "@type": "Organization", name: "RealHunt", url: "https://realhunt.co" },
    },
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[880px] mx-auto px-6 py-20 md:py-28">
        <div className="text-[12px] uppercase tracking-[0.18em] text-ink-soft">Method</div>
        <h1 className="font-display text-[44px] md:text-[58px] text-ink mt-3 leading-[1.05]">
          How the RH Score is computed<span className="text-accent-gold">.</span>
        </h1>
        <p className="mt-6 reading text-ink-muted max-w-[680px]">
          The RH Global Score (0–100) is a weighted average of five forensic dimensions. Scores update as data changes
          — when a listing's price drops, when a comparable closes, when a court filing is published, the score
          recomputes. If you find a mistake, email{" "}
          <a href="mailto:method@realhunt.co" className="rh-btn-tertiary">method@realhunt.co</a> — we publish a public changelog.
        </p>

        {/* Global Score formula */}
        <section className="mt-12 rounded-2xl border border-hairline bg-[#FBF8F1] p-8">
          <h2 className="font-display text-[24px] text-ink">The Global Score formula</h2>
          <p className="reading text-ink-muted mt-3">
            We weight the five subscores, normalise to 0–100, and apply a confidence multiplier based on how much
            verified data backs the listing. Letter grade is a fixed mapping: A+ ≥ 95, A ≥ 90, A− ≥ 85, B+ ≥ 80,
            B ≥ 75, B− ≥ 70, C+ ≥ 65, C ≥ 55, D ≥ 45, F &lt; 45.
          </p>

          <pre className="mt-5 text-[12px] font-mono bg-surface border border-hairline rounded-xl p-4 overflow-x-auto text-ink">
{`Global Score = round(
  (ROI × 0.28)
+ (Market Stability × 0.18)
+ (Demand Strength × 0.20)
+ (Risk / Safety × 0.18)
+ (Liquidity Outlook × 0.16)
) × confidence_multiplier

confidence_multiplier:
  high   = 1.00   (verified comparables, legal records, public price history)
  medium = 0.95   (partial data, some metrics estimated)
  low    = 0.88   (developer site only / private listing)`}
          </pre>

          <h3 className="mt-6 font-display text-[18px] text-ink">Inputs that feed the model</h3>
          <ul className="mt-3 space-y-2 reading text-ink-muted">
            <li>· Comparable €/m² within a 1–2 km radius (or borough equivalent), trimmed for outliers</li>
            <li>· ROI assumptions: 2% appreciation, 3% rental growth, 5% vacancy, 2% maintenance, 5.2% interest</li>
            <li>· Time-on-market and price-change history (liquidity proxy)</li>
            <li>· Legal/title checks: registry encumbrances, planning permission status, litigation history</li>
            <li>· Developer track record: delivery delays, escrow status, parent-company filings (where disclosed)</li>
            <li>· Currency is kept native — we never auto-convert when computing the score</li>
          </ul>
        </section>

        <div className="mt-12">
          <Dim name="ROI Potential" weight={28}
            bullets={["5-year projected ROI under standard assumptions","Gross and net yield vs city median","Cash-on-cash return after financing costs","Sensitivity to vacancy and rate moves"]}
            sources={[{ label: "Local rental comparables (idealista/Zillow/Rightmove)" }, { label: "ECB / Fed base rates" }]}
            limits="STR yields are conservative due to platform-data noise. Off-plan ROI uses developer guidance discounted 10%." updated="May 2026" />
          <Dim name="Market Stability" weight={18}
            bullets={["3-year price index volatility","Transaction volume trend","Regulatory exposure (rent caps, transfer taxes)","New-build pipeline saturation"]}
            sources={[{ label: "INE / ONS / FHFA city indices" }, { label: "Local registry records" }]}
            limits="We can't price political risk in real time. Regulatory changes update within ~30 days of publication." updated="May 2026" />
          <Dim name="Demand Strength" weight={20}
            bullets={["Search-volume and saved-listing momentum","Days-on-market vs city median","Buyer-pool depth at this price tier","Seasonality adjustment"]}
            sources={[{ label: "Portal click and save signals" }, { label: "Public sold-prices feeds" }]}
            limits="Demand on private off-market listings is estimated, not observed." updated="May 2026" />
          <Dim name="Risk / Safety" weight={18}
            bullets={["Title clarity and registry encumbrances","Planning permission status and open objections","Litigation history affecting the parcel","Foreign-buyer eligibility for the asset class","Developer track record on delivery"]}
            sources={[
              { label: "HM Land Registry (UK)", url: "https://www.gov.uk/government/organisations/land-registry" },
              { label: "Catastro / Registro de la Propiedad (ES)" },
              { label: "RERA / DLD (UAE)", url: "https://www.dubailand.gov.ae/" },
              { label: "County recorder offices (US)" },
            ]}
            limits="We surface public-record signals; we do not replace local counsel. A clean Risk score is necessary but not sufficient." updated="May 2026" />
          <Dim name="Liquidity Outlook" weight={16}
            bullets={["Average months-on-market for the asset class","Price-cut frequency in the micro-market","Exit-cost burden (taxes, agent fees)","Foreign-currency exit friction"]}
            sources={[{ label: "Portal sold-vs-listed timing" }, { label: "Local notary fee schedules" }]}
            limits="Beachfront and trophy assets can sit for 9+ months without a price problem — we flag this rather than penalise it." updated="May 2026" />
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

export default Method;
