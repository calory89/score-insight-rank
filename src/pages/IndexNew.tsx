import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { detectListingSource, isLikelyListingUrl } from "@/lib/source-detect";

const EXAMPLES = [
  { label: "Dubai off-plan", url: "https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-business-bay.html" },
  { label: "Marbella resale", url: "https://www.idealista.com/inmueble/sample-marbella" },
  { label: "London buy-to-let", url: "https://www.rightmove.co.uk/properties/sample-london" },
  { label: "Miami new build", url: "https://www.zillow.com/homedetails/sample-miami" },
];

const PasteInput = ({ size = "lg" }: { size?: "lg" | "md" }) => {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = useMemo(() => (value ? detectListingSource(value) : null), [value]);
  const valid = isLikelyListingUrl(value);

  const submit = (url?: string) => {
    const u = (url ?? value).trim();
    if (!isLikelyListingUrl(u)) return;
    navigate(`/app/analyze?u=${encodeURIComponent(u)}`);
  };

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Paste listing URL…"
            className="rh-input"
            style={size === "lg" ? { fontSize: 17, padding: "20px 18px" } : undefined}
            aria-label="Listing URL"
          />
          {detected && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2 text-[12px] text-ink-muted bg-paper px-2 py-1 rounded-md border border-hairline">
              <span>{detected.flag}</span>
              <span>{detected.platform}</span>
              <span className="text-ink-soft">·</span>
              <span>{detected.country}</span>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!valid}
          className="rh-btn-primary sm:min-w-[140px]"
          style={size === "lg" ? { padding: "20px 28px", fontSize: 16 } : undefined}
        >
          Analyze
          <ArrowRight size={16} />
        </button>
      </form>

      {focused && !value && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-ink-soft">Try one of these →</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setValue(ex.url);
                submit(ex.url);
              }}
              className="px-3 py-1.5 rounded-full border border-hairline text-ink-muted hover:text-ink hover:border-hairline-strong transition-colors"
            >
              {ex.label}
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-[13px] text-ink-soft">
        5 free analyses · No credit card · Cancel anytime
      </p>
    </div>
  );
};

const Section = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <section className={`max-w-[1140px] mx-auto px-6 py-20 md:py-32 ${className}`}>{children}</section>
);

const FeatureTile = ({
  title,
  body,
}: {
  title: string;
  body: string;
}) => (
  <div className="rh-card">
    <h3 className="font-display text-[22px] text-ink leading-tight">{title}</h3>
    <p className="mt-3 text-ink-muted text-[15px] leading-relaxed">{body}</p>
  </div>
);

const MethodRow = ({ name, what }: { name: string; what: string }) => (
  <div className="grid grid-cols-12 gap-4 py-5 hairline-b">
    <div className="col-span-12 md:col-span-3 font-display text-[17px] text-ink">{name}</div>
    <div className="col-span-12 md:col-span-7 text-ink-muted text-[15px]">{what}</div>
    <div className="col-span-12 md:col-span-2 md:text-right">
      <Link to="/method" className="rh-btn-tertiary text-[14px]">See sources</Link>
    </div>
  </div>
);

const PriceCard = ({
  name,
  price,
  cadence,
  features,
  cta,
  highlight = false,
}: {
  name: string;
  price: string;
  cadence?: string;
  features: string[];
  cta: { label: string; to: string };
  highlight?: boolean;
}) => (
  <div
    className={`rh-card flex flex-col h-full ${highlight ? "border-2" : ""}`}
    style={highlight ? { borderColor: "var(--rh-accent)" } : undefined}
  >
    <div className="font-display text-[20px] text-ink">{name}</div>
    <div className="mt-3 flex items-baseline gap-1">
      <span className="font-display text-[44px] tabular text-ink leading-none">{price}</span>
      {cadence && <span className="text-ink-soft text-[14px]">/{cadence}</span>}
    </div>
    <ul className="mt-6 space-y-2.5 text-[14px] text-ink-muted flex-1">
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2">
          <Check size={15} className="text-accent-gold mt-0.5 shrink-0" />
          <span>{f}</span>
        </li>
      ))}
    </ul>
    <Link to={cta.to} className={highlight ? "rh-btn-primary mt-6" : "rh-btn-secondary mt-6 justify-center"}>
      {cta.label}
    </Link>
  </div>
);

const IndexNew = () => {
  useDocumentMeta({
    title: "RealHunt — Is this listing actually a good deal?",
    description:
      "Paste any Zillow, Rightmove, Idealista, Redfin, Airbnb or PropertyFinder URL. Get a forensic real-estate score in under 10 seconds.",
  });

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />

      {/* HERO */}
      <Section className="!py-20 md:!py-28">
        <div className="max-w-[820px]">
          <h1 className="font-display text-[44px] sm:text-[58px] md:text-[68px] text-ink leading-[1.05]">
            Is this listing actually a good deal?
          </h1>
          <p className="mt-6 text-ink-muted text-[17px] sm:text-[19px] leading-relaxed max-w-[640px]">
            Paste any Zillow, Rightmove, Idealista, Redfin, Airbnb or PropertyFinder URL.
            Get a forensic score in under 10 seconds.
          </p>
          <div className="mt-10 max-w-[680px]">
            <PasteInput />
          </div>
        </div>
      </Section>

      {/* WHAT YOU GET */}
      <Section>
        <div className="mb-12">
          <div className="text-[12px] uppercase tracking-[0.18em] text-ink-soft">What you get</div>
          <h2 className="font-display text-[34px] md:text-[42px] text-ink mt-3 max-w-[680px]">
            Three things. Done well.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureTile
            title="Forensic 5D score."
            body="Developer, Delivery, Legal, Location, Economics. Every number sourced. No black box."
          />
          <FeatureTile
            title="Verdict in one line."
            body='"Buy below 4.2M AED" or "Pass — escrow risk." No essays. No hedging.'
          />
          <FeatureTile
            title="Send-to-client PDF."
            body="Your logo, your phone, your disclaimer. WhatsApp-ready in two taps."
          />
        </div>
      </Section>

      {/* LIVE DEMO TEASER */}
      <div className="bg-surface-2 border-y border-hairline">
        <Section className="!py-20 md:!py-24">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-5">
              <div className="text-[12px] uppercase tracking-[0.18em] text-ink-soft">Live demo</div>
              <h2 className="font-display text-[34px] md:text-[42px] text-ink mt-3 leading-tight">
                See a real report.
              </h2>
              <p className="mt-4 text-ink-muted text-[16px] leading-relaxed">
                A forensic analysis of an actual listing, rendered exactly as your clients will see it.
              </p>
              <div className="mt-6">
                <Link to="/a/demo" className="rh-btn-secondary">
                  Open the demo report
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="md:col-span-7">
              <div className="rh-card !p-8">
                <div className="text-[11px] uppercase tracking-[0.16em] text-ink-soft">
                  Idealista · Marbella · Resale
                </div>
                <div className="mt-2 font-display text-[20px] text-ink truncate">
                  Villa with sea view — Sierra Blanca
                </div>
                <div className="mt-6 flex items-end gap-6">
                  <div>
                    <div className="font-display text-[88px] leading-none tabular text-good">7.4</div>
                    <div className="text-[12px] text-ink-soft mt-1">RH Score / 10</div>
                  </div>
                  <div className="flex-1 hairline-l pl-6">
                    <div className="font-display text-[18px] text-ink leading-snug">
                      Decent yield, weak developer track record — negotiate 8% off list.
                    </div>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-5 gap-0 hairline-t pt-5">
                  {[
                    { l: "Developer", v: "5.8" },
                    { l: "Delivery", v: "8.1" },
                    { l: "Legal", v: "8.7" },
                    { l: "Location", v: "8.4" },
                    { l: "Economics", v: "6.2" },
                  ].map((d, i) => (
                    <div
                      key={d.l}
                      className={`text-center ${i > 0 ? "hairline-l" : ""}`}
                    >
                      <div className="text-[11px] uppercase tracking-wider text-ink-soft">{d.l}</div>
                      <div className="font-display text-[26px] tabular text-ink mt-1">{d.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* BUILT FOR AGENTS */}
      <Section>
        <div className="mb-12 max-w-[680px]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-ink-soft">For agents who close</div>
          <h2 className="font-display text-[34px] md:text-[42px] text-ink mt-3 leading-tight">
            Paste. Score. Send. Close.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureTile
            title="Mobile-first analyze."
            body="One thumb, parking lot, 23:00. The whole flow works on a 4-inch screen."
          />
          <FeatureTile
            title="Branded PDF on WhatsApp."
            body="Your logo and phone on every report. Clients reopen them. You see when."
          />
          <FeatureTile
            title="Library + light CRM."
            body="Every analysis tied to a client. Stop juggling tabs and screenshots."
          />
        </div>
      </Section>

      {/* METHODOLOGY TEASER */}
      <div className="bg-surface-2 border-y border-hairline">
        <Section className="!py-20 md:!py-24">
          <div className="mb-10 max-w-[680px]">
            <div className="text-[12px] uppercase tracking-[0.18em] text-ink-soft">Method</div>
            <h2 className="font-display text-[34px] md:text-[42px] text-ink mt-3 leading-tight">
              Five dimensions. Zero black box.
            </h2>
          </div>
          <div className="rh-card !p-0 !bg-surface">
            <div className="px-6">
              <MethodRow name="Developer" what="Track record, delivered projects, complaints, financial health." />
              <MethodRow name="Delivery" what="Construction stage, escrow, contractor, expected handover vs market." />
              <MethodRow name="Legal" what="Title clarity, planning permission, registry checks, litigation history." />
              <MethodRow name="Location" what="Walkability, transit, school catchment, comparable sales density." />
              <MethodRow name="Economics" what="Yield, price/sqm vs comparables, exit liquidity, downside scenarios." />
            </div>
            <div className="px-6 py-5 flex items-center justify-between">
              <span className="text-[14px] text-ink-soft">
                We publish every weight, every source, every formula.
              </span>
              <Link to="/method" className="rh-btn-tertiary text-[14px]">Read the full method →</Link>
            </div>
          </div>
        </Section>
      </div>

      {/* PRICING PREVIEW */}
      <Section>
        <div className="mb-12 max-w-[680px]">
          <div className="text-[12px] uppercase tracking-[0.18em] text-ink-soft">Pricing</div>
          <h2 className="font-display text-[34px] md:text-[42px] text-ink mt-3 leading-tight">
            Free forever. Pro when you close.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PriceCard
            name="Free"
            price="€0"
            features={[
              "5 analyses / month",
              "PDF with RealHunt watermark",
              "Library — 30 days",
              "3 comparables per report",
            ]}
            cta={{ label: "Start free", to: "/auth/sign-up" }}
          />
          <PriceCard
            name="Pro"
            price="€19"
            cadence="mo"
            highlight
            features={[
              "200 analyses / month",
              "Your logo, name, phone on PDFs",
              "Unlimited library",
              "Batch up to 50 URLs",
              "Read receipts on shared reports",
              "Priority queue",
            ]}
            cta={{ label: "Go Pro", to: "/auth/sign-up?plan=pro" }}
          />
          <PriceCard
            name="Agency"
            price="€79"
            cadence="mo"
            features={[
              "1,000 analyses / month",
              "3 seats (+€19/extra)",
              "Custom color, multi-agent",
              "Team library + analytics",
              "API access (2,000 calls/mo)",
              "White-label domain",
            ]}
            cta={{ label: "Talk to us", to: "/contact" }}
          />
        </div>
        <p className="mt-6 text-[13px] text-ink-soft">
          No credit card to start. Cancel in two clicks. We don't sell your data — see{" "}
          <Link to="/legal/privacy" className="rh-btn-tertiary">privacy</Link>.
        </p>
      </Section>

      {/* FINAL CTA */}
      <div className="border-t border-hairline">
        <Section className="!py-24">
          <div className="max-w-[720px]">
            <h2 className="font-display text-[40px] md:text-[54px] text-ink leading-[1.05]">
              Your next deal is one paste away.
            </h2>
            <div className="mt-10">
              <PasteInput />
            </div>
            <p className="mt-6 text-[13px] text-ink-soft">
              5 free. Then €19/mo. Cancel in two clicks.
            </p>
          </div>
        </Section>
      </div>

      <RHFooter />
    </div>
  );
};

export default IndexNew;
