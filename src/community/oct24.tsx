// 24-oct-2026: home-page FAQ, inline alert sign-up, mortgage calculator and price per m² against the country.
import { mediaDeep } from "@/lib/media";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Calculator } from "lucide-react";
import { money } from "./api";
import { AlertForm } from "./extras";
import { t } from "./i18n";
import { homeArticle } from "./homeArticle";
import { homeArticleEs } from "./homeArticleEs";
import { localizeRows } from "./seo2data";
import DESTS_ES from "@/data/destinations-es.json";
import { isEs } from "@/lib/lang";
import { regionOf, slugify } from "./regions";
import DESTS from "@/data/destinations.json";

// Inline sign-up after the first rows of homes: the moment someone has seen enough to want more.
export function InlineAlert({ countries, country }: { countries: string[]; country?: string }) {
  return (
    <section className="rh-inline-alert" aria-label={t("Get new homes by email")}>
      <div className="rh-inline-alert-text"><Bell size={18} aria-hidden /><div><strong>{t("Get homes like these by email")}</strong><small>{t("Pick countries and a budget. Free, and every email has a one-click unsubscribe.")}</small></div></div>
      <AlertForm compact countries={countries} initial={country ? ({ country } as any) : undefined} />
    </section>
  );
}

const FAQ: [string, string][] = [
  ["What is RealHunt?", "A list of cheap homes for sale around the world. A person checks every home before it goes up, and each one gets a score from 70 to 98 that compares it with every other home on the site."],
  ["Does RealHunt sell the homes?", "No. RealHunt is not an estate agent and does not take a commission from buyers. Every home links to its original listing, so you contact the seller or agent directly."],
  ["How is the score calculated?", "From 11 sub-scores: price, price per m², space, condition, extras, distance to the sea or a lake, weather, airport, buying costs, listing detail and buyer interest. Nobody pays to rank higher."],
  ["Why are the homes so cheap?", "We look for homes you can live in more or less as they are, in places where houses cost less: villages, smaller towns and countries with lower prices. Ruins and homes that need major work are turned down."],
  ["Can I buy a home in another country?", "In most countries listed here, yes. Each country has different taxes and paperwork; see the buying costs page and get a local lawyer or notary before you pay anything."],
  ["How do I get new homes first?", "Set an alert with your countries and budget and we email you new homes as they pass our check. You can also follow the RSS feed."],
];
export function HomeFaq() {
  return (
    <section className="rh-faq" aria-labelledby="rh-faq-h">
      <h2 id="rh-faq-h">{t("Questions")}</h2>
      {FAQ.map(([q, a]) => <details key={q}><summary>{t(q)}</summary><p>{t(a)}</p></details>)}
      <p className="hunt-fine"><Link to="/method">{t("How the score works")}</Link> · <Link to="/costs">{t("Buying costs by country")}</Link> · <Link to="/new">{t("New homes")}</Link> · <Link to="/research/prices">{t("Prices by country")}</Link> · <Link to="/sitemap">{t("Site map")}</Link></p>
    </section>
  );
}

// Monthly payment of a fixed-rate loan. A calculator, not an offer: the visitor sets every number.
export function MortgageCalc({ price }: { price: number }) {
  const [down, setDown] = useState(30);
  const [rate, setRate] = useState(4);
  const [years, setYears] = useState(20);
  const loan = Math.max(0, price * (1 - down / 100));
  const r = rate / 100 / 12, n = years * 12;
  const monthly = loan <= 0 ? 0 : r === 0 ? loan / n : (loan * r) / (1 - Math.pow(1 + r, -n));
  return (
    <details className="rh-mortgage">
      <summary><Calculator size={16} aria-hidden /> {t("Mortgage calculator")}</summary>
      <div className="rh-mortgage-grid">
        <label><span>{t("Down payment")} (%)</span><input id="rh-mg-down" type="number" inputMode="numeric" min={0} max={100} value={down} onChange={(e) => setDown(Math.min(100, Math.max(0, Number(e.target.value))))} /></label>
        <label><span>{t("Interest rate")} (%)</span><input id="rh-mg-rate" type="number" inputMode="decimal" min={0} max={20} step={0.1} value={rate} onChange={(e) => setRate(Math.min(20, Math.max(0, Number(e.target.value))))} /></label>
        <label><span>{t("Years")}</span><input id="rh-mg-years" type="number" inputMode="numeric" min={1} max={40} value={years} onChange={(e) => setYears(Math.min(40, Math.max(1, Number(e.target.value))))} /></label>
      </div>
      <p className="rh-mortgage-out">{t("Loan")} <strong>{money(loan)}</strong> · {t("about")} <strong>{money(Math.round(monthly))}</strong> {t("a month")}</p>
      <p className="hunt-fine">{t("An estimate with the numbers you enter. Banks set their own rates and often lend less to non-residents.")}</p>
    </details>
  );
}

// "€1,339/m², 30% below the median for Spain on RealHunt", from the same static data the site reads.
let medians: Promise<Record<string, number>> | null = null;
export function countryMedians() {
  return (medians ||= fetch("/data/rh-static.json", { cache: "no-cache" }).then((r) => r.json()).then(mediaDeep).then((s: any) => {
    const by: Record<string, number[]> = {};
    for (const r of (s.rows || []) as any[]) if (r.sqm > 0 && r.price_eur > 0) (by[r.country] ||= []).push(r.price_eur / r.sqm);
    const out: Record<string, number> = {};
    for (const [c, xs] of Object.entries(by)) if (xs.length >= 5) { xs.sort((a, b) => a - b); out[c] = xs[Math.floor(xs.length / 2)]; }
    return out;
  }).catch(() => ({})));
}
export function PerSqmVsCountry({ price, sqm, country }: { price?: number | null; sqm?: number | null; country?: string | null }) {
  const [med, setMed] = useState<number | null>(null);
  useEffect(() => { let on = true; if (country) countryMedians().then((m) => { if (on) setMed(m[country] || null); }); return () => { on = false; }; }, [country]);
  const own = price && sqm ? price / sqm : 0;
  const diff = useMemo(() => (own && med ? Math.round(((own - med) / med) * 100) : null), [own, med]);
  if (diff == null || Math.abs(diff) < 3) return null;
  return <p className={"rh-vs " + (diff < 0 ? "is-below" : "is-above")}>{money(Math.round(own))}/m², {Math.abs(diff)}% {diff < 0 ? t("below") : t("above")} {t("the median for")} {country} {t("on RealHunt")} ({money(Math.round(med!))}/m²)</p>;
}

// /alerts/confirm?t=<token>: the link in the confirmation email.
export function AlertConfirmPage() {
  const [state, setState] = useState<"busy" | "ok" | string>("busy");
  useEffect(() => {
    document.title = "Confirm your alerts · RealHunt";
    const tok = new URLSearchParams(location.search).get("t") || "";
    if (!/^[a-f0-9]{16,64}$/.test(tok)) { setState("This link is not complete. Open it again from the email, or sign up again."); return; }
    import("@/integrations/supabase/client").then(({ supabase }) => (supabase.rpc as any)("alert_confirm", { p_token: tok }))
      .then(({ data, error }: any) => setState(error ? t("We could not confirm right now. Please open the link again in a minute.") : data?.ok ? "ok" : (data?.error || t("This link is not valid any more."))))
      .catch(() => setState(t("We could not confirm right now. Please open the link again in a minute.")));
  }, []);
  return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow"><Bell size={13} /> {t("Alerts")}</span>
      {state === "busy" ? <h1>{t("Confirming your alerts…")}</h1> : state === "ok" ? (
        <>
          <h1>{t("Your alerts are on.")}</h1>
          <p>{t("We just emailed you the best homes for your search. From now on you get new ones as they pass our check.")}</p>
          <p className="hunt-row"><Link className="hunt-primary" to="/new">{t("See the newest homes")}</Link> <Link className="hunt-secondary" to="/">{t("See the best homes")}</Link></p>
        </>
      ) : (
        <>
          <h1>{t("We could not confirm these alerts")}</h1>
          <p>{state}</p>
          <p><Link className="hunt-primary" to="/alerts">{t("Sign up again")}</Link></p>
        </>
      )}
    </div>
  );
}

// The written article on each home page, the same text crawlers read (src/community/homeArticle.ts).
let allRows: Promise<any[]> | null = null;
const rowsP = () => (allRows ||= fetch("/data/rh-static.json", { cache: "no-cache" }).then((r) => r.json()).then((s: any) => s.rows || []).catch(() => []));
export function HomeArticle({ d }: { d: any }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { let on = true; rowsP().then((x) => { if (on) setRows(x); }); return () => { on = false; }; }, [d?.slug]);
  const art = useMemo(() => {
    if (!rows || !d?.country) return null;
    const key = (c: string) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
    const cc = key(d.country);
    const countryHomes = rows.filter((r) => key(r.country) === cc);
    const rg = regionOf(d);
    const regionHomes = rg ? countryHomes.filter((r) => slugify(regionOf(r)) === slugify(rg)) : [];
    const es = isEs(); // 8-nov-2026: the Spanish page gets the article written in Spanish (homeArticleEs.ts)
    const dests: any = es ? localizeRows(DESTS as any, DESTS_ES as any) : DESTS;
    return (es ? homeArticleEs : homeArticle)({ ...rows.find((r) => r.slug === d.slug), ...d }, { countryHomes: countryHomes.length ? countryHomes : [d], regionHomes: regionHomes.length >= 3 ? regionHomes : undefined, regionName: regionHomes.length >= 3 ? rg : undefined, dest: dests[cc] || null });
  }, [rows, d]);
  if (!art) return null;
  return (
    <section className="rh-home-article">
      {art.sections.map((s) => <div key={s.h}><h2>{s.h}</h2>{s.p.map((p) => <p key={p}>{p}</p>)}</div>)}
      {art.faq.length > 0 && <div className="rh-faq"><h2>{t("Questions about this home")}</h2>{art.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>}
    </section>
  );
}
