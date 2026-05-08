import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";

const Dim = ({
  name,
  bullets,
  sources,
  limits,
  updated,
}: {
  name: string;
  bullets: string[];
  sources: { label: string; url?: string }[];
  limits: string;
  updated: string;
}) => (
  <section className="py-12 hairline-b last:border-b-0">
    <h2 className="font-display text-[28px] text-ink">{name}</h2>
    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-8 reading">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-3">What we check</div>
        <ul className="space-y-2 text-ink-muted">
          {bullets.map((b) => (
            <li key={b}>· {b}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-soft mb-3">Sources</div>
        <ul className="space-y-2 text-ink-muted">
          {sources.map((s) => (
            <li key={s.label}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer" className="rh-btn-tertiary">{s.label}</a>
              ) : (
                <span>{s.label}</span>
              )}
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
    title: "Method — How RealHunt scores listings",
    description: "Every weight, every source, every formula. Public methodology for the RH 5-dimension forensic score.",
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[880px] mx-auto px-6 py-20 md:py-28">
        <div className="text-[12px] uppercase tracking-[0.18em] text-ink-soft">Method</div>
        <h1 className="font-display text-[44px] md:text-[58px] text-ink mt-3 leading-[1.05]">
          How the RH Score is computed.
        </h1>
        <p className="mt-6 reading text-ink-muted max-w-[680px]">
          The RH Score is a weighted average of five forensic dimensions. We publish what we check,
          where the data comes from, and what we can't yet verify. If you find a mistake, email{" "}
          <a href="mailto:method@realhunt.co" className="rh-btn-tertiary">method@realhunt.co</a>{" "}
          — we publish a public changelog.
        </p>

        <div className="mt-12">
          <Dim
            name="Developer"
            bullets={[
              "Track record of delivered projects vs announced",
              "Average delay across the last 10 deliveries",
              "Public complaints, court cases, regulator actions",
              "Parent-company financial health where disclosed",
            ]}
            sources={[
              { label: "RERA / DLD (UAE)", url: "https://www.dubailand.gov.ae/" },
              { label: "Registro Mercantil (Spain)" },
              { label: "Companies House (UK)", url: "https://find-and-update.company-information.service.gov.uk/" },
            ]}
            limits="Off-plan developers under 5 years old often have thin records. We mark these as 'Insufficient history' rather than guess."
            updated="May 2026"
          />
          <Dim
            name="Delivery"
            bullets={[
              "Construction stage vs official handover quarter",
              "Escrow status (mandatory in UAE; varies elsewhere)",
              "Main contractor identity and current concurrent load",
              "Sales velocity vs plan",
            ]}
            sources={[
              { label: "DLD escrow registry (UAE)" },
              { label: "Local planning portals (UK, ES, US)" },
            ]}
            limits="We cannot inspect site conditions remotely. Reported construction percentages rely on developer disclosure and satellite cross-checks where available."
            updated="May 2026"
          />
          <Dim
            name="Legal"
            bullets={[
              "Title clarity and current registry encumbrances",
              "Planning permission status and any open objections",
              "Litigation history affecting the parcel",
              "Foreign-buyer eligibility for the asset class",
            ]}
            sources={[
              { label: "HM Land Registry (UK)", url: "https://www.gov.uk/government/organisations/land-registry" },
              { label: "Catastro / Registro de la Propiedad (ES)" },
              { label: "County recorder offices (US)" },
            ]}
            limits="We surface public-record signals; we do not replace local counsel. A clean RH Legal score is necessary but not sufficient."
            updated="May 2026"
          />
          <Dim
            name="Location"
            bullets={["Methodology under review — full rubric publishing soon."]}
            sources={[{ label: "ETA: Sprint 2" }]}
            limits="Currently using a placeholder weighting from comparable-density and walkability signals. Do not over-weight this dimension yet."
            updated="In review"
          />
          <Dim
            name="Economics"
            bullets={["Methodology under review — full rubric publishing soon."]}
            sources={[{ label: "ETA: Sprint 2" }]}
            limits="Yield estimates use ECB-rate-converted comparables; STR yields are conservative due to platform-data noise."
            updated="In review"
          />
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

export default Method;
