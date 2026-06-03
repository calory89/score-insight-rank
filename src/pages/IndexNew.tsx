import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, Star, ShieldCheck, FileSearch, Sparkles, Play } from "lucide-react";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import HeroLiveDemo from "@/components/realhunt/HeroLiveDemo";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { detectListingSource, isLikelyListingUrl } from "@/lib/source-detect";

const EXAMPLES = [
  { label: "Dubai off-plan", url: "https://www.propertyfinder.ae/en/plp/buy/apartment-for-sale-dubai-business-bay.html" },
  { label: "Marbella resale", url: "https://www.idealista.com/inmueble/sample-marbella" },
  { label: "London buy-to-let", url: "https://www.rightmove.co.uk/properties/sample-london" },
  { label: "Miami new build", url: "https://www.zillow.com/homedetails/sample-miami" },
];

const SAMPLE_URL = "https://www.idealista.com/inmueble/sample-marbella";

const PasteInput = ({
  size = "lg",
  onTryDemo,
  inputRef: extRef,
}: {
  size?: "lg" | "md";
  onTryDemo?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) => {

  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const detected = useMemo(() => (value ? detectListingSource(value) : null), [value]);
  const valid = isLikelyListingUrl(value);

  const submit = (url?: string) => {
    const u = (url ?? value).trim();
    if (!u) {
      inputRef.current?.focus();
      return;
    }
    if (u === SAMPLE_URL && onTryDemo) {
      onTryDemo();
      return;
    }
    if (!isLikelyListingUrl(u)) {
      inputRef.current?.focus();
      return;
    }
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
          className="rh-btn-primary sm:min-w-[140px]"
          style={size === "lg" ? { padding: "20px 28px", fontSize: 16 } : undefined}
        >
          Analyze
          <ArrowRight size={16} />
        </button>
        {onTryDemo && (
          <button
            type="button"
            onClick={onTryDemo}
            className="rh-btn-secondary sm:min-w-[140px] justify-center"
            style={size === "lg" ? { padding: "20px 22px", fontSize: 15 } : undefined}
          >
            <Play size={14} />
            Try a sample
          </button>
        )}
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
        5 free · No credit card · Trusted by 2,400+ agents · 50+ countries
      </p>
    </div>
  );
};

const Section = ({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => (
  <section id={id} className={`max-w-[1140px] mx-auto px-6 py-16 md:py-24 ${className}`}>
    {children}
  </section>
);

const FeatureTile = ({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) => (
  <div className="rh-card">
    <div className="w-10 h-10 rounded-xl bg-[#F4F0E6] flex items-center justify-center text-ink">
      {icon}
    </div>
    <h3 className="font-display text-[22px] text-ink leading-tight mt-5">{title}</h3>
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
  badge,
}: {
  name: string;
  price: string;
  cadence?: string;
  features: string[];
  cta: { label: string; to: string };
  highlight?: boolean;
  badge?: string;
}) => (
  <div
    className={`rh-card flex flex-col h-full relative ${highlight ? "ring-2 ring-[#16150F] shadow-[0_14px_40px_rgba(20,18,10,0.12)]" : ""}`}
  >
    {badge && (
      <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-[#16150F] text-white text-[11px] font-medium tracking-wide uppercase">
        {badge}
      </div>
    )}
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
    <Link
      to={cta.to}
      className={highlight ? "rh-btn-primary mt-6" : "rh-btn-secondary mt-6 justify-center"}
    >
      {cta.label}
    </Link>
  </div>
);

const SOURCE_LOGOS = ["Zillow", "Rightmove", "Idealista", "Redfin", "Airbnb", "PropertyFinder"];

const TESTIMONIALS = [
  {
    quote: "Caught an escrow gap on a Marbella villa nobody else flagged. We renegotiated 8% off list. RealHunt paid for itself in one report.",
    name: "Ana Cárdenas",
    role: "Buyer's Agent",
    city: "Marbella, ES",
    initial: "A",
  },
  {
    quote: "I send the PDF on WhatsApp and the client decides in the same evening. Cut my closing cycle almost in half.",
    name: "James Holloway",
    role: "Investment Broker",
    city: "London, UK",
    initial: "J",
  },
  {
    quote: "The forensic score forces sellers to defend their price. It changed how I negotiate off-plan in Dubai.",
    name: "Reem Al-Sayed",
    role: "Partner, Boutique Agency",
    city: "Dubai, AE",
    initial: "R",
  },
];

const FAQS = [
  {
    q: "How accurate is the RH Score?",
    a: "Each score is a weighted average of five sourced dimensions. We publish every weight and every data source on the Method page. When inputs are weak (e.g. opaque developer history) the report says so explicitly — no false confidence.",
  },
  {
    q: "Where does the data come from?",
    a: "Public listing pages, land and title registries, planning portals, market comparables, and licensed third-party datasets. Every number in a report links back to its source — no black box.",
  },
  {
    q: "What's your refund policy?",
    a: "If the report is materially inaccurate, email us within 7 days and we'll refund in full. Pro plans cancel in two clicks, prorated to the day.",
  },
  {
    q: "Do you sell my data?",
    a: "Never. We don't sell, share or rent user data. Analyses are private to your account by default. GDPR-friendly, account deletion is one click.",
  },
];

const DIMENSION_BARS = [
  { l: "Developer", v: 5.8, status: "warn" as const },
  { l: "Delivery", v: 8.1, status: "good" as const },
  { l: "Legal", v: 8.7, status: "good" as const },
  { l: "Location", v: 8.4, status: "good" as const },
  { l: "Economics", v: 6.2, status: "warn" as const },
];

const statusColor = (s: "good" | "warn" | "bad") =>
  s === "good" ? "#1E6B4F" : s === "warn" ? "#B7791F" : "#B23A3A";

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="hairline-b">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full py-5 flex items-center justify-between text-left gap-6"
        aria-expanded={open}
      >
        <span className="font-display text-[18px] text-ink">{q}</span>
        <ChevronDown
          size={18}
          className={`text-ink-muted transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="pb-6 text-ink-muted text-[15px] leading-relaxed max-w-[760px]">{a}</p>}
    </div>
  );
};

const IndexNew = () => {
  useDocumentMeta({
    title: "RealHunt — Is this listing actually a good deal?",
    description:
      "Paste any Zillow, Rightmove, Idealista, Redfin, Airbnb or PropertyFinder URL. Get a forensic real-estate score in under 10 seconds. Every number sourced.",
  });

  const [scrolled, setScrolled] = useState(false);
  const [demoRun, setDemoRun] = useState(0);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const runDemo = () => setDemoRun((n) => n + 1);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div
        className={`sticky top-0 z-40 transition-all duration-200 ${
          scrolled ? "bg-paper/85 backdrop-blur-md border-b border-hairline" : "bg-transparent"
        }`}
      >
        <RHNav />
      </div>

      {/* HERO */}
      <Section className="!pt-16 md:!pt-24 !pb-16">
        <div className="max-w-[820px]">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-ink-soft mb-6">
            <span className="w-6 h-px bg-[#B8893B]" />
            The trust score for property deals
          </div>
          <h1 className="font-display text-[44px] sm:text-[58px] md:text-[72px] text-ink leading-[1.02] tracking-[-0.02em]">
            Is this listing <span className="italic text-[#B8893B]">actually</span> a good deal?
          </h1>
          <p className="mt-6 text-ink-muted text-[18px] sm:text-[20px] leading-relaxed max-w-[640px]">
            Paste any listing. Forensic score in 10 seconds. Every number sourced.
          </p>
          <div className="mt-10 max-w-[760px]">
            <PasteInput onTryDemo={runDemo} />
          </div>
          {demoRun > 0 && (
            <div className="max-w-[820px]">
              <HeroLiveDemo runKey={demoRun} />
            </div>
          )}
        </div>
      </Section>

      {/* WORKS WITH */}
      <div className="border-y border-hairline bg-[#F8F5EE]">
        <div className="max-w-[1140px] mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center gap-4 md:gap-10">
          <span className="text-[11px] uppercase tracking-[0.2em] text-ink-soft shrink-0">
            Works with
          </span>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-3 grayscale opacity-70">
            {SOURCE_LOGOS.map((l) => (
              <span
                key={l}
                className="font-display text-[18px] text-ink-muted tracking-tight"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* WHAT YOU GET */}
      <Section>
        <div className="mb-10">
          <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">What you get</div>
          <h2 className="font-display text-[34px] md:text-[46px] text-ink mt-3 max-w-[680px] tracking-[-0.02em]">
            Three things. Done well.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureTile
            icon={<FileSearch size={20} />}
            title="Forensic 5D score."
            body="Developer, Delivery, Legal, Location, Economics. Every number sourced. No black box."
          />
          <FeatureTile
            icon={<Sparkles size={20} />}
            title="Verdict in one line."
            body='"Buy below 4.2M AED" or "Pass — escrow risk." No essays. No hedging.'
          />
          <FeatureTile
            icon={<ShieldCheck size={20} />}
            title="Send-to-client PDF."
            body="Your logo, your phone, your disclaimer. WhatsApp-ready in two taps."
          />
        </div>
      </Section>

      {/* LIVE DEMO TEASER */}
      <div className="bg-surface-2 border-y border-hairline">
        <Section className="!py-20">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-5">
              <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Live demo</div>
              <h2 className="font-display text-[34px] md:text-[46px] text-ink mt-3 leading-[1.05] tracking-[-0.02em]">
                See a real report.
              </h2>
              <p className="mt-4 text-ink-muted text-[16px] leading-relaxed">
                A forensic analysis of an actual listing, rendered exactly as your clients will see it.
              </p>
              <div className="mt-7">
                <Link to="/a/demo" className="rh-btn-primary">
                  Open the demo report
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <div className="md:col-span-7">
              <div className="rh-card !p-8">
                <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
                  Idealista · Marbella · Resale
                </div>
                <div className="mt-2 font-display text-[20px] text-ink truncate">
                  Villa with sea view — Sierra Blanca
                </div>
                <div className="mt-6 flex items-end gap-6">
                  <div>
                    <div className="font-display text-[88px] leading-none tabular" style={{ color: "#B8893B" }}>
                      7.4
                    </div>
                    <div className="text-[12px] text-ink-soft mt-1 uppercase tracking-wider">RH Score / 10</div>
                  </div>
                  <div className="flex-1 hairline-l pl-6">
                    <div className="font-display text-[18px] text-ink leading-snug">
                      Decent yield, weak developer track record — negotiate 8% off list.
                    </div>
                  </div>
                </div>
                <div className="mt-8 space-y-3 hairline-t pt-6">
                  {DIMENSION_BARS.map((d) => (
                    <div key={d.l} className="grid grid-cols-12 items-center gap-3">
                      <div className="col-span-3 text-[12px] uppercase tracking-wider text-ink-soft">
                        {d.l}
                      </div>
                      <div className="col-span-7 h-2 rounded-full bg-[#F0EBDE] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(d.v / 10) * 100}%`,
                            backgroundColor: statusColor(d.status),
                          }}
                        />
                      </div>
                      <div className="col-span-2 text-right font-display text-[16px] tabular text-ink">
                        {d.v.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* STATS BAND */}
      <div className="border-b border-hairline">
        <div className="max-w-[1140px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {[
            { v: "12,400", l: "Listings scored" },
            { v: "€38M", l: "Analyzed" },
            { v: "4.8★", l: "From agents" },
          ].map((s) => (
            <div key={s.l} className="flex flex-col items-center md:items-start">
              <div className="font-display text-[44px] tabular text-ink leading-none">{s.v}</div>
              <div className="text-[13px] uppercase tracking-[0.18em] text-ink-soft mt-2">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BUILT FOR AGENTS */}
      <Section>
        <div className="mb-10 max-w-[680px]">
          <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">For agents who close</div>
          <h2 className="font-display text-[34px] md:text-[46px] text-ink mt-3 leading-[1.05] tracking-[-0.02em]">
            Paste. Score. Send. Close.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureTile
            icon={<Sparkles size={20} />}
            title="Mobile-first analyze."
            body="One thumb, parking lot, 23:00. The whole flow works on a 4-inch screen."
          />
          <FeatureTile
            icon={<FileSearch size={20} />}
            title="Branded PDF on WhatsApp."
            body="Your logo and phone on every report. Clients reopen them. You see when."
          />
          <FeatureTile
            icon={<ShieldCheck size={20} />}
            title="Library + light CRM."
            body="Every analysis tied to a client. Stop juggling tabs and screenshots."
          />
        </div>
        <div className="mt-8">
          <Link to="/for-agents" className="rh-btn-primary">
            See the agent playbook
            <ArrowRight size={16} />
          </Link>
        </div>
      </Section>

      {/* TESTIMONIALS */}
      <div className="bg-surface-2 border-y border-hairline">
        <Section className="!py-20">
          <div className="mb-10 max-w-[680px]">
            <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">From the field</div>
            <h2 className="font-display text-[34px] md:text-[46px] text-ink mt-3 leading-[1.05] tracking-[-0.02em]">
              Agents who closed harder deals.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rh-card flex flex-col h-full">
                <div className="flex items-center gap-1 text-[#B8893B]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" stroke="none" />
                  ))}
                </div>
                <blockquote className="mt-4 font-display text-[18px] text-ink leading-snug flex-1">
                  "{t.quote}"
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3 pt-5 hairline-t">
                  <div className="w-10 h-10 rounded-full bg-[#16150F] text-white flex items-center justify-center font-display text-[16px]">
                    {t.initial}
                  </div>
                  <div>
                    <div className="text-[14px] text-ink font-medium">{t.name}</div>
                    <div className="text-[12px] text-ink-soft">
                      {t.role} · {t.city}
                    </div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      </div>

      {/* METHODOLOGY TEASER */}
      <Section>
        <div className="mb-8 max-w-[680px]">
          <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Method</div>
          <h2 className="font-display text-[34px] md:text-[46px] text-ink mt-3 leading-[1.05] tracking-[-0.02em]">
            Five dimensions. Zero black box.
          </h2>
        </div>
        <div className="rh-card !p-0">
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

      {/* PRICING PREVIEW */}
      <div className="bg-surface-2 border-y border-hairline">
        <Section>
          <div className="mb-12 max-w-[680px]">
            <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Pricing</div>
            <h2 className="font-display text-[34px] md:text-[46px] text-ink mt-3 leading-[1.05] tracking-[-0.02em]">
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
              badge="Most popular"
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
      </div>

      {/* FAQ */}
      <Section id="faq">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">FAQ</div>
            <h2 className="font-display text-[34px] md:text-[42px] text-ink mt-3 leading-[1.05] tracking-[-0.02em]">
              Questions, answered.
            </h2>
            <p className="mt-4 text-ink-muted text-[15px] leading-relaxed">
              Still curious? Email <a href="mailto:hello@realhunt.co" className="rh-btn-tertiary">hello@realhunt.co</a> — a human replies.
            </p>
          </div>
          <div className="md:col-span-8 hairline-t">
            {FAQS.map((f) => (
              <FAQItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </div>
      </Section>

      {/* FINAL CTA */}
      <div className="border-t border-hairline bg-[#16150F]">
        <Section className="!py-20">
          <div className="max-w-[720px]">
            <h2 className="font-display text-[40px] md:text-[56px] text-white leading-[1.05] tracking-[-0.02em]">
              Your next deal is one paste away.
            </h2>
            <p className="mt-4 text-white/60 text-[16px]">
              5 free. Then €19/mo. Cancel in two clicks.
            </p>
            <div className="mt-10 max-w-[680px]">
              <PasteInput />
            </div>
          </div>
        </Section>
      </div>

      <RHFooter />
    </div>
  );
};

export default IndexNew;
