import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import RHNav from "@/components/realhunt/RHNav";
import { fbLead } from "@/lib/fbpixel";
import { ArrowRight, Check, Info, TrendingDown, Share2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Project = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  district: string | null;
  country_id: string | null;
  ticket_min_eur: number | null;
  delivery_quarter: string | null;
  construction_pct: number | null;
  hero_image_url: string | null;
  is_owned_by_realhunt: boolean | null;
  conflict_disclosure: string | null;
  deposit_pct: number | null;
  plan_months: number | null;
  balloon_pct: number | null;
  payment_terms_source: string | null;
};

type Scored = Project & {
  countryName: string;
  depositNeeded: number;
  monthlyNeeded: number;
  balloonNeeded: number;
  headroom: number;
  usedPct: number;
  declared: boolean;
  fits: boolean;
  shortfallMonthly: number;
  shortfallDeposit: number;
  cashByHandover: number;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const eur = (n: number) =>
  "€" + Math.round(n).toLocaleString("en-GB", { maximumFractionDigits: 0 });

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const parseNum = (v: string) => {
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/* Number field: typed input + slider, kept in sync                    */
/* ------------------------------------------------------------------ */

const MoneyField = ({
  label, hint, value, onChange, min, max, step,
}: {
  label: string; hint: string; value: number;
  onChange: (n: number) => void; min: number; max: number; step: number;
}) => (
  <div className="flex flex-col gap-2">
    <label className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-medium">
      {label}
    </label>
    <div className="flex items-baseline gap-1 border-b border-hairline pb-2 focus-within:border-ink transition-colors">
      <span className="font-display text-[28px] text-ink-muted leading-none">€</span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={value.toLocaleString("en-GB")}
        onChange={(e) => onChange(clamp(parseNum(e.target.value), 0, max))}
        aria-label={label}
        className="w-full bg-transparent font-display text-[28px] text-ink leading-none outline-none tabular-nums"
      />
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={clamp(value, min, max)}
      onChange={(e) => onChange(Number(e.target.value))}
      aria-label={`${label} slider`}
      className="rh-range w-full"
    />
    <p className="text-[12px] text-ink-muted">{hint}</p>
  </div>
);

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const ASSUMED_DEPOSIT_PCT = 20;
const ASSUMED_BALLOON_PCT = 0;

const Fit = () => {
  const [params, setParams] = useSearchParams();

  const [deposit, setDeposit] = useState(() => parseNum(params.get("d") || "") || 40000);
  const [monthly, setMonthly] = useState(() => parseNum(params.get("m") || "") || 1800);
  const [months, setMonths] = useState(() => parseNum(params.get("t") || "") || 36);
  const [assumedDeposit, setAssumedDeposit] = useState(
    () => parseNum(params.get("dep") || "") || ASSUMED_DEPOSIT_PCT
  );
  const [balloonPct, setBalloonPct] = useState(
    () => parseNum(params.get("b") || "") || ASSUMED_BALLOON_PCT
  );

  const [rows, setRows] = useState<Project[] | null>(null);
  const [countries, setCountries] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    document.title = "What can I actually buy? · RealHunt";
  }, []);

  /* Deep link: the plan lives in the URL so it can be shared on WhatsApp. */
  useEffect(() => {
    const t = setTimeout(() => {
      setParams(
        { d: String(deposit), m: String(monthly), t: String(months), dep: String(assumedDeposit), b: String(balloonPct) },
        { replace: true }
      );
    }, 400);
    return () => clearTimeout(t);
  }, [deposit, monthly, months, assumedDeposit, balloonPct, setParams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: projects }, { data: cts }] = await Promise.all([
        (supabase as any)
          .from("projects")
          .select(
            "id,name,slug,city,district,country_id,ticket_min_eur,delivery_quarter,construction_pct,hero_image_url,is_owned_by_realhunt,conflict_disclosure,deposit_pct,plan_months,balloon_pct,payment_terms_source"
          )
          .eq("active", true)
          .not("ticket_min_eur", "is", null)
          .order("ticket_min_eur", { ascending: true })
          .limit(600),
        (supabase as any).from("countries").select("id,name"),
      ]);
      if (cancelled) return;
      const map: Record<string, string> = {};
      (cts || []).forEach((c: any) => { map[c.id] = c.name; });
      setCountries(map);
      setRows((projects || []) as Project[]);
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------------------------------------------------------------- */
  /* The whole product is these twenty lines                           */
  /* ---------------------------------------------------------------- */

  const scored: Scored[] = useMemo(() => {
    if (!rows) return [];
    return rows.map((p) => {
      const price = p.ticket_min_eur || 0;
      const declared = p.deposit_pct != null && p.plan_months != null;
      const depPct = p.deposit_pct ?? assumedDeposit;
      const balPct = p.balloon_pct ?? balloonPct;
      const term = p.plan_months ?? months;

      const depositNeeded = (price * depPct) / 100;
      const balloonNeeded = (price * balPct) / 100;
      const financed = Math.max(0, price - depositNeeded - balloonNeeded);
      const monthlyNeeded = term > 0 ? financed / term : financed;

      const fits = depositNeeded <= deposit && monthlyNeeded <= monthly;

      return {
        ...p,
        countryName: (p.country_id && countries[p.country_id]) || "",
        depositNeeded,
        monthlyNeeded,
        balloonNeeded,
        headroom: monthly - monthlyNeeded,
        usedPct: monthly > 0 ? clamp((monthlyNeeded / monthly) * 100, 0, 100) : 100,
        declared,
        fits,
        shortfallMonthly: Math.max(0, monthlyNeeded - monthly),
        shortfallDeposit: Math.max(0, depositNeeded - deposit),
        cashByHandover: depositNeeded + monthlyNeeded * term,
      };
    });
  }, [rows, deposit, monthly, months, assumedDeposit, balloonPct, countries]);

  const matches = useMemo(
    () => scored.filter((s) => s.fits).sort((a, b) => b.headroom - a.headroom),
    [scored]
  );

  /* Honest empty state: what exactly is missing to unlock the nearest one. */
  const nearest = useMemo(() => {
    if (matches.length || !scored.length) return null;
    return [...scored].sort((a, b) => {
      const ga = a.shortfallMonthly * 36 + a.shortfallDeposit;
      const gb = b.shortfallMonthly * 36 + b.shortfallDeposit;
      return ga - gb;
    })[0];
  }, [scored, matches]);

  const countriesFound = useMemo(
    () => Array.from(new Set(matches.map((m) => m.countryName).filter(Boolean))),
    [matches]
  );

  const copyPlan = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 2000); },
      () => {}
    );
  }, []);

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) return;
    setSaved(true);
    fbLead({ content_name: "fit_plan_saved", source: "fit_page" });
    try {
      await (supabase as any).from("newsletter_subscribers").insert({
        email,
        source: `fit:d=${deposit};m=${monthly};t=${months}`,
      });
    } catch { /* the user already got their result, never block on this */ }
  };

  const loading = rows === null;
  const visible = showAll ? matches : matches.slice(0, 6);

  return (
    <div className="min-h-screen bg-paper text-ink pb-20 lg:pb-0">
      <style>{`
        .rh-range{-webkit-appearance:none;appearance:none;height:2px;background:#e3e4e6;border-radius:2px;outline:none}
        .rh-range::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:22px;height:22px;border-radius:50%;background:currentColor;cursor:pointer;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)}
        .rh-range::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:currentColor;cursor:pointer;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.25)}
        .rh-range:focus-visible{box-shadow:0 0 0 3px rgba(0,0,0,.15)}
        @media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
      `}</style>

      <RHNav />

      {/* ---------------- Hero + calculator, one screen, one job ------- */}
      <section className="max-w-[1140px] mx-auto px-6 pt-12 pb-10">
        <div className="grid lg:grid-cols-[1.05fr_1fr] gap-12 items-start">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-4">
              Affordability, not asking price
            </p>
            <h1 className="font-display text-[clamp(32px,5vw,52px)] leading-[1.05] tracking-tight text-balance">
              You are not buying a price.<br />You are buying a schedule.
            </h1>
            <p className="mt-5 text-[17px] text-ink-muted max-w-[52ch] leading-relaxed">
              Property portals sort by total price. You think in deposit, monthly payment and
              dates. Tell us what you can actually pay and we will show you which of the{" "}
              {rows ? rows.length.toLocaleString("en-GB") : "1,100+"} projects we track fit that
              schedule, and what each one really costs you by handover.
            </p>

            <div className="mt-8 grid sm:grid-cols-2 gap-x-10 gap-y-7">
              <MoneyField
                label="I can put down today"
                hint="Deposit available now, before any financing."
                value={deposit} onChange={setDeposit} min={0} max={500000} step={5000}
              />
              <MoneyField
                label="I can pay monthly"
                hint="What you can commit without stretching."
                value={monthly} onChange={setMonthly} min={0} max={15000} step={100}
              />
            </div>

            <div className="mt-7 flex flex-col gap-2">
              <label className="text-[11px] uppercase tracking-[0.14em] text-ink-muted font-medium">
                Over how long
              </label>
              <div className="flex flex-wrap gap-2">
                {[12, 24, 36, 48, 60].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    aria-pressed={months === m}
                    className={`px-4 py-2 text-[14px] rounded-full border transition-colors ${
                      months === m
                        ? "border-ink bg-ink text-paper"
                        : "border-hairline text-ink-muted hover:border-ink hover:text-ink"
                    }`}
                  >
                    {m} months
                  </button>
                ))}
              </div>
            </div>

            <details className="mt-7 group">
              <summary className="cursor-pointer text-[13px] text-ink-muted hover:text-ink inline-flex items-center gap-2 list-none">
                <Info size={14} /> Payment plan assumptions
              </summary>
              <div className="mt-4 p-4 border border-hairline rounded-lg bg-white/60 flex flex-col gap-4">
                <p className="text-[12px] text-ink-muted leading-relaxed">
                  Where a developer has confirmed their terms to us, we use those and label the
                  result <strong className="text-ink">Declared</strong>. Where they have not, we
                  model the plan below and label it <strong className="text-ink">Assumed</strong>.
                  We never present an assumption as a developer&rsquo;s offer.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-ink-muted mr-1">Deposit</span>
                  {[10, 20, 30, 40].map((p) => (
                    <button
                      key={p}
                      onClick={() => setAssumedDeposit(p)}
                      aria-pressed={assumedDeposit === p}
                      className={`px-3 py-1.5 text-[13px] rounded-full border ${
                        assumedDeposit === p ? "border-ink bg-ink text-paper" : "border-hairline text-ink-muted"
                      }`}
                    >{p}%</button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-ink-muted mr-1">On handover</span>
                  {[0, 20, 40].map((p) => (
                    <button
                      key={p}
                      onClick={() => setBalloonPct(p)}
                      aria-pressed={balloonPct === p}
                      className={`px-3 py-1.5 text-[13px] rounded-full border ${
                        balloonPct === p ? "border-ink bg-ink text-paper" : "border-hairline text-ink-muted"
                      }`}
                    >{p}%</button>
                  ))}
                </div>
              </div>
            </details>
          </div>

          {/* ------- Live verdict. Updates as you drag. No submit button. */}
          <motion.aside
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:sticky lg:top-24 border border-hairline rounded-xl bg-white p-7"
          >
            {loading ? (
              <div className="flex flex-col gap-3" aria-busy="true">
                <div className="h-12 w-28 bg-hairline/60 rounded animate-pulse" />
                <div className="h-4 w-44 bg-hairline/60 rounded animate-pulse" />
                <div className="h-px bg-hairline my-3" />
                <div className="h-4 w-full bg-hairline/60 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-hairline/60 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="font-display text-[56px] leading-none tabular-nums">
                  {matches.length}
                </div>
                <p className="mt-2 text-[15px] text-ink-muted">
                  {matches.length === 1 ? "project fits this schedule" : "projects fit this schedule"}
                </p>

                {countriesFound.length > 0 && (
                  <p className="mt-4 text-[14px] text-ink leading-relaxed">
                    In {countriesFound.slice(0, 4).join(", ")}
                    {countriesFound.length > 4 ? ` and ${countriesFound.length - 4} more` : ""}.
                  </p>
                )}

                <div className="h-px bg-hairline my-6" />

                <dl className="flex flex-col gap-3 text-[14px]">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Down today</dt>
                    <dd className="tabular-nums">{eur(deposit)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink-muted">Monthly × {months}</dt>
                    <dd className="tabular-nums">{eur(monthly)}</dd>
                  </div>
                  <div className="flex justify-between gap-4 pt-3 border-t border-hairline">
                    <dt className="font-medium">Total committed</dt>
                    <dd className="tabular-nums font-medium">{eur(deposit + monthly * months)}</dd>
                  </div>
                </dl>

                <button
                  onClick={copyPlan}
                  className="mt-6 w-full inline-flex items-center justify-center gap-2 border border-hairline rounded-lg py-2.5 text-[14px] text-ink-muted hover:text-ink hover:border-ink transition-colors"
                >
                  <Share2 size={14} /> {copied ? "Link copied" : "Copy this plan"}
                </button>
                <p className="mt-2 text-[11px] text-ink-muted text-center">
                  The link carries your numbers. Nothing is stored until you ask us to.
                </p>
              </>
            )}
          </motion.aside>
        </div>
      </section>

      {/* ---------------- Results --------------------------------------- */}
      <section id="results" className="max-w-[1140px] mx-auto px-6 pb-28">
        <div className="h-px bg-hairline mb-10" />

        {loading && (
          <div className="grid md:grid-cols-2 gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border border-hairline rounded-xl p-6 flex flex-col gap-3">
                <div className="h-5 w-2/3 bg-hairline/60 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-hairline/60 rounded animate-pulse" />
                <div className="h-2 w-full bg-hairline/60 rounded animate-pulse mt-4" />
              </div>
            ))}
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div className="max-w-[640px]">
            <h2 className="font-display text-[26px] tracking-tight">
              Nothing in our catalogue fits that schedule yet.
            </h2>
            {nearest ? (
              <>
                <p className="mt-4 text-[16px] text-ink-muted leading-relaxed">
                  The closest is <strong className="text-ink">{nearest.name}</strong>
                  {nearest.city ? ` in ${nearest.city}` : ""}
                  {nearest.countryName ? `, ${nearest.countryName}` : ""}, at{" "}
                  {eur(nearest.ticket_min_eur || 0)}.
                </p>
                <div className="mt-5 border border-hairline rounded-xl p-5 bg-white flex flex-col gap-3 text-[15px]">
                  <div className="flex items-start gap-3">
                    <TrendingDown size={18} className="mt-0.5 shrink-0 text-ink-muted" />
                    <span>
                      It needs{" "}
                      {nearest.shortfallDeposit > 0 && (
                        <strong>{eur(nearest.shortfallDeposit)} more down</strong>
                      )}
                      {nearest.shortfallDeposit > 0 && nearest.shortfallMonthly > 0 && " or "}
                      {nearest.shortfallMonthly > 0 && (
                        <strong>{eur(nearest.shortfallMonthly)} more per month</strong>
                      )}
                      {nearest.shortfallMonthly > 0 && months < 60 && (
                        <>, or the same money spread over 60 months instead of {months}</>
                      )}
                      .
                    </span>
                  </div>
                  <p className="text-[13px] text-ink-muted">
                    You can also lower the assumed deposit above. Many off-plan developers take
                    10% from international buyers, they just do not advertise it.
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-4 text-[16px] text-ink-muted">
                Try a longer term or a smaller deposit assumption.
              </p>
            )}
          </div>
        )}

        {!loading && matches.length > 0 && (
          <>
            <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
              <h2 className="font-display text-[26px] tracking-tight">
                Sorted by how much monthly room they leave you
              </h2>
              <p className="text-[13px] text-ink-muted">
                Showing {visible.length} of {matches.length}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {visible.map((m, i) => (
                <motion.article
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.24) }}
                  className="border border-hairline rounded-xl bg-white overflow-hidden flex flex-col"
                >
                  <div className="p-6 flex flex-col gap-4 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-[19px] leading-tight tracking-tight">
                          {m.name}
                        </h3>
                        <p className="text-[13px] text-ink-muted mt-1">
                          {[m.district, m.city, m.countryName].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-[10px] uppercase tracking-[0.1em] px-2 py-1 rounded-full border ${
                          m.declared
                            ? "border-ink/25 text-ink"
                            : "border-hairline text-ink-muted"
                        }`}
                        title={
                          m.declared
                            ? "Payment terms confirmed by the developer"
                            : "Modelled on your assumptions above, not the developer's offer"
                        }
                      >
                        {m.declared ? "Declared" : "Assumed"}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-[14px]">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">Down</p>
                        <p className="tabular-nums mt-0.5">{eur(m.depositNeeded)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">Monthly</p>
                        <p className="tabular-nums mt-0.5">{eur(m.monthlyNeeded)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">Price</p>
                        <p className="tabular-nums mt-0.5">{eur(m.ticket_min_eur || 0)}</p>
                      </div>
                    </div>

                    {/* Capacity bar: how much of the monthly this eats */}
                    <div>
                      <div className="h-1.5 w-full bg-hairline/70 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-ink rounded-full transition-[width] duration-300"
                          style={{ width: `${m.usedPct}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[12px] text-ink-muted">
                        Uses {Math.round(m.usedPct)}% of your monthly. Leaves{" "}
                        <strong className="text-ink">{eur(Math.max(0, m.headroom))}</strong> free.
                      </p>
                    </div>

                    <p className="text-[12px] text-ink-muted">
                      {m.delivery_quarter ? `Handover ${m.delivery_quarter}. ` : ""}
                      {m.construction_pct != null ? `${m.construction_pct}% built. ` : ""}
                      Cash out by handover {eur(m.cashByHandover)}
                      {m.balloonNeeded > 0 ? `, plus ${eur(m.balloonNeeded)} on completion` : ""}.
                    </p>

                    {m.is_owned_by_realhunt && (
                      <p className="text-[11px] text-ink-muted border-t border-hairline pt-3">
                        Disclosure: RealHunt has a commercial interest in this project.
                        {m.conflict_disclosure ? ` ${m.conflict_disclosure}` : ""}
                      </p>
                    )}
                  </div>

                  <Link
                    to={`/projects/${m.slug}`}
                    className="border-t border-hairline px-6 py-4 text-[14px] inline-flex items-center justify-between hover:bg-paper transition-colors"
                  >
                    <span>See the project and make an offer</span>
                    <ArrowRight size={16} />
                  </Link>
                </motion.article>
              ))}
            </div>

            {matches.length > visible.length && (
              <button
                onClick={() => setShowAll(true)}
                className="mt-8 border border-hairline rounded-lg px-6 py-3 text-[14px] hover:border-ink transition-colors"
              >
                Show the other {matches.length - visible.length}
              </button>
            )}
          </>
        )}

        {/* ---------------- Email, asked AFTER the value is delivered ---- */}
        {!loading && (
          <div className="mt-16 border border-hairline rounded-xl bg-white p-7 max-w-[640px]">
            {saved ? (
              <p className="text-[15px] inline-flex items-center gap-2">
                <Check size={18} /> Saved. We will email you when a project matches this schedule.
              </p>
            ) : (
              <form onSubmit={saveEmail} className="flex flex-col gap-3">
                <h3 className="font-display text-[20px] tracking-tight">
                  Tell me when something new fits this plan
                </h3>
                <p className="text-[14px] text-ink-muted">
                  We add projects every week. No newsletter, no drip sequence. One email when the
                  numbers above have a new answer.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    aria-label="Your email"
                    className="flex-1 border border-hairline rounded-lg px-4 py-3 text-[15px] bg-paper outline-none focus:border-ink transition-colors"
                  />
                  <button type="submit" className="rh-btn-primary">Watch this plan</button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      {/* ---------------- Sticky summary on mobile --------------------- */}
      {!loading && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-hairline px-5 py-3 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-display text-[20px] leading-none tabular-nums">{matches.length} fit</p>
            <p className="text-[12px] text-ink-muted truncate">
              {eur(deposit)} down · {eur(monthly)}/mo · {months} mo
            </p>
          </div>
          <a href="#results" className="rh-btn-primary !px-5 !py-2.5 !text-[14px] shrink-0">
            See them
          </a>
        </div>
      )}

      <footer className="border-t border-hairline">
        <div className="max-w-[1140px] mx-auto px-6 py-10 flex flex-wrap gap-x-8 gap-y-3 text-[13px] text-ink-muted">
          <Link to="/" className="hover:text-ink">Score a property</Link>
          <Link to="/method" className="hover:text-ink">Method</Link>
          <Link to="/deals" className="hover:text-ink">Deals</Link>
          <Link to="/legal/terms" className="hover:text-ink">Terms</Link>
          <Link to="/legal/privacy" className="hover:text-ink">Privacy</Link>
          <span className="ml-auto">
            Figures are estimates for comparison, not an offer of credit or a developer quote.
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Fit;
