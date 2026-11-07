// Growth pages in the app. seo/prerender.ts builds the same pages as plain HTML for crawlers, from the same
// shared logic (./seo2data.ts), so both say the same thing:
//   /can-i-buy                              who can buy where, by nationality
//   /can-i-buy/<nationality>-in-<country>   the answer for one nationality and one country
//   /buying-costs and /buying-costs/<k>     calculator: what you pay on top of the price
import "./seo2.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Calculator, Check, AlertTriangle, Ban, ChevronDown } from "lucide-react";
import CB_JSON from "@/data/canbuy.json";
import GUIDES_JSON from "@/data/guides.json";
import DEST_JSON from "@/data/destinations.json";
import { mediaDeep } from "@/lib/media";
import { MiniCard, type Row } from "./extras";
import { t } from "./i18n";
import {
  type CanBuyData, type Status, STATUS_LABEL, UPDATED, the, countryKey, nameOf, costLines, costCountries,
  canBuyCountries, canBuySlug, parseCanBuySlug, ruleFor, residencyFor, canBuyFaq, canBuyMeta, fill, fmtMoney,
} from "./seo2data";

const CB = CB_JSON as unknown as CanBuyData;
const GUIDES = GUIDES_JSON as unknown as Record<string, { name: string; steps: [string, string][]; yearly: string }>;
const DEST = DEST_JSON as Record<string, any>;

const setMeta = (title: string, desc: string) => { document.title = title; document.querySelector('meta[name="description"]')?.setAttribute("content", desc); };
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

// All published homes by country, best score first (the same static snapshot the feed uses).
let homesP: Promise<Record<string, Row[]>> | null = null;
function homesByCountry() {
  return (homesP ||= fetch("/data/rh-static.json", { cache: "no-cache" }).then((r) => r.json()).then(mediaDeep).then((s: any) => {
    const by: Record<string, Row[]> = {};
    for (const r of (s.rows || []) as any[]) if (r?.slug && r.price_eur > 0) (by[countryKey(r.country)] ||= []).push(r);
    for (const k of Object.keys(by)) by[k].sort((a: any, b: any) => (b.nota || 0) - (a.nota || 0) || (a.rank ?? 1e9) - (b.rank ?? 1e9));
    return by;
  }).catch(() => ({})));
}
function useHomes() {
  const [h, setH] = useState<Record<string, Row[]> | null>(null);
  useEffect(() => { homesByCountry().then(setH); }, []);
  return h;
}

const ICON: Record<Status, JSX.Element> = { yes: <Check size={16} />, conditions: <AlertTriangle size={16} />, restricted: <Ban size={16} /> };
export function StatusPill({ s, big = false }: { s: Status; big?: boolean }) {
  return <span className={`rh2-pill is-${s}${big ? " is-big" : ""}`}>{ICON[s]}{t(STATUS_LABEL[s])}</span>;
}

// ---------------------------------------------------------------- /can-i-buy
export function CanBuyIndex() {
  const nats = Object.keys(CB.nationalities);
  const [nat, setNat] = useState(() => { const v = ls.get("rh_canbuy_nat"); return v && CB.nationalities[v] ? v : "american"; });
  const countries = canBuyCountries(CB, DEST, GUIDES).filter((c) => CB.nationalities[nat].home !== c);
  useEffect(() => {
    window.scrollTo(0, 0);
    setMeta(`Can I buy property abroad? Rules by nationality for ${countries.length} countries (${UPDATED}) · RealHunt`, "Can Americans, British, Canadians, Australians and Europeans buy a home in Spain, Italy, Denmark, Switzerland, Mexico and more? The short answer for each nationality, with costs and taxes.");
  }, []);
  const n = CB.nationalities[nat];
  const pick = (k: string) => { setNat(k); ls.set("rh_canbuy_nat", k); };
  return (
    <div className="hunt-wrap hunt-page rh2">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <span>{t("Can I buy there?")}</span></nav>
      <span className="hunt-eyebrow">{t("Buying rules by nationality")}</span>
      <h1>{t("Can I buy property there?")}</h1>
      <p className="rh2-lead">{t("Pick your passport and see, country by country, whether you can buy a home, on what conditions, and what it costs on top of the price.")}</p>
      <div className="rh2-natpick" role="group" aria-label={t("Your nationality")}>
        {nats.map((k) => <button key={k} type="button" aria-pressed={k === nat} onClick={() => pick(k)}>{CB.nationalities[k].label}</button>)}
      </div>
      <h2 className="rh2-h2">{`Rules for ${n.label} buyers`}</h2>
      <ul className="rh2-list">
        {countries.map((c) => {
          const r = ruleFor(CB, nat, c)!; const name = GUIDES[c].name;
          return (
            <li key={c}>
              <Link to={`/can-i-buy/${canBuySlug(nat, c)}`} className="rh2-row">
                <span className="rh2-row-main"><strong>{name}</strong><StatusPill s={r.s} /></span>
                <span className="rh2-row-text">{fill(r.a, n)}</span>
                {DEST[c]?.purchase_costs_pct && <small>{t("Costs on top of the price")}: {DEST[c].purchase_costs_pct}%</small>}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="hunt-fine">{t("General information, not legal advice.")} {t("Updated")} {UPDATED}. {t("Rules change: check with a local lawyer or notary before you sign anything.")}</p>
      <p className="hunt-row"><Link className="hunt-secondary" to="/buying-costs">{t("Buying-cost calculator")}</Link><Link className="hunt-secondary" to="/guide">{t("Buying guides by country")}</Link><Link className="hunt-secondary" to="/countries">{t("Compare two countries")}</Link></p>
    </div>
  );
}

// ---------------------------------------------------------------- /can-i-buy/<nat>-in-<country>
export function CanBuyPage() {
  const { slug = "" } = useParams();
  const p = parseCanBuySlug(slug, CB);
  const homesAll = useHomes();
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);
  const name = p ? GUIDES[p.country]?.name || "" : "";
  const meta = p && name ? canBuyMeta(CB, p.nat, p.country, name) : null;
  useEffect(() => { if (meta) setMeta(meta.title, meta.desc); }, [slug]);
  if (!p || !name || !meta) return <CanBuyIndex />;
  const { nat, country } = p;
  const n = CB.nationalities[nat]; const r = ruleFor(CB, nat, country)!; const d = DEST[country] || {}; const g = GUIDES[country];
  const homes = (homesAll?.[country] || []).slice(0, 6);
  const allHere = homesAll?.[country] || [];
  const faq = canBuyFaq(CB, nat, country, { dest: d, guide: g, name, homes: allHere });
  const ex = costLines(150000, d);
  const res = residencyFor(CB, nat, country, name);
  const otherNats = Object.keys(CB.nationalities).filter((k) => k !== nat && CB.nationalities[k].home !== country);
  const otherCountries = canBuyCountries(CB, DEST, GUIDES).filter((c) => c !== country && c !== n.home);
  return (
    <article className="hunt-wrap hunt-page rh2">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <Link to="/can-i-buy">{t("Can I buy there?")}</Link> › <span>{n.label} · {name}</span></nav>
      <span className="hunt-eyebrow">{`Buying rules for ${n.label} citizens`}</span>
      <h1>{meta.h1}</h1>
      <section className={`rh2-answer is-${r.s}`} aria-label={t("Short answer")}>
        <StatusPill s={r.s} big />
        <p>{fill(r.a, n)}</p>
        <small>{t("General information, not legal advice.")} {t("Updated")} {UPDATED}.</small>
      </section>
      <div className="rh2-facts">
        {ex && <div><small>{t("Costs on top of the price")}</small><b>{ex.pct}</b><span>{ex.fees} {t("on a €150,000 home")}</span></div>}
        {allHere.length > 0 && <div><small>{t("Homes on RealHunt")}</small><b>{allHere.length}</b><span>{t("from")} {fmtMoney(Math.min(...allHere.map((h: any) => h.price_eur)))}</span></div>}
        <div><small>{t("Living there")}</small><b>{n.bloc !== "other" && (CB.eu.includes(country) || country === "norway" || country === "switzerland") ? t("Free movement") : t("Visa rules apply")}</b><span>{`${n.label} passport`}</span></div>
      </div>
      {ex && <section>
        <h2>{t("What it costs to buy")}</h2>
        <p>{t("About")} <b>{d.purchase_costs_pct}%</b> {t("on top of the price")}. {t("On a €150,000 home that is")} <b>{ex.fees}</b>, {t("so")} <b>{ex.total}</b> {t("in total")}.</p>
        {d.purchase_costs_breakdown && <p className="rh2-muted">{d.purchase_costs_breakdown}</p>}
        <p><Link className="hunt-link" to={`/buying-costs/${country}`}><Calculator size={14} /> {t("Work it out for your price")}</Link></p>
      </section>}
      <section>
        <h2>{t("Every year")}</h2>
        {d.annual_property_tax && <p><b>{t("Yearly property tax")}:</b> {d.annual_property_tax}</p>}
        {g?.yearly && <p>{g.yearly}</p>}
        {d.rental_income_tax && <p><b>{t("Tax on rental income")}:</b> {d.rental_income_tax}</p>}
      </section>
      {res.length > 0 && <section><h2>{t("Living there")}</h2>{res.map((x) => <p key={x}>{x}</p>)}</section>}
      {n.notes.length > 0 && <section><h2>{`Good to know for ${n.label} buyers`}</h2><ul className="rh2-notes">{n.notes.map((x) => <li key={x}>{x}</li>)}</ul></section>}
      {g?.steps?.length > 0 && <section>
        <h2>{`The steps to buy in ${the(name)}`}</h2>
        <ol className="rh2-steps">{g.steps.map(([h]) => <li key={h}>{h}</li>)}</ol>
        <p><Link className="hunt-link" to={`/guide/${country}`}>{t("The full guide, step by step")} →</Link></p>
      </section>}
      <section>
        <h2>{t("Best homes in")} {name}</h2>
        {!homesAll ? <div className="hunt-skeleton-list" /> : homes.length ? <div className="hunt-minigrid rh2-homes">{homes.map((h) => <MiniCard key={h.slug} d={h} />)}</div> : <p>{t("No homes here right now.")} <Link className="hunt-link" to={`/alerts?country=${encodeURIComponent(name)}`}>{t("Get an alert when one appears")}</Link></p>}
        {allHere.length > homes.length && <p><Link className="hunt-link" to={`/homes/${country}`}>{`All ${allHere.length} homes in ${the(name)}`} →</Link></p>}
      </section>
      <section>
        <h2>{t("Questions")}</h2>
        <div className="rh2-faq">{faq.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={16} aria-hidden /></summary><p>{a}</p></details>)}</div>
      </section>
      <p className="hunt-row"><Link className="hunt-primary" to={`/guide/${country}`}>{t("How to buy in")} {the(name)}</Link><Link className="hunt-secondary" to={`/costs/${country}`}>{t("Costs, taxes and sources")}</Link></p>
      <h2 className="rh2-h2">{`Other nationalities in ${name}`}</h2>
      <p className="hunt-chips">{otherNats.map((k) => <Link key={k} to={`/can-i-buy/${canBuySlug(k, country)}`}>{CB.nationalities[k].label}</Link>)}</p>
      <h2 className="rh2-h2">{`${n.label} buyers in other countries`}</h2>
      <p className="hunt-chips">{otherCountries.map((c) => <Link key={c} to={`/can-i-buy/${canBuySlug(nat, c)}`}>{GUIDES[c].name}</Link>)}</p>
      <p className="hunt-fine">{t("General information, not legal advice. Rules and taxes change: check with a local lawyer or notary before you sign anything.")} {t("Updated")} {UPDATED}.</p>
    </article>
  );
}

// ---------------------------------------------------------------- /buying-costs and /buying-costs/<country>
const CCYS = ["EUR", "USD", "GBP"] as const;
export function BuyingCostsPage() {
  const { country = "" } = useParams();
  const nav = useNavigate();
  const keys = useMemo(() => costCountries(DEST, GUIDES), []);
  const k = keys.includes(country) ? country : "";
  const [price, setPrice] = useState(150000);
  const [ccy, setCcy] = useState<string>(() => { const v = ls.get("rh_calc_ccy"); return v && (CCYS as readonly string[]).includes(v) ? v : "EUR"; });
  const name = k ? nameOf(k, GUIDES) : "";
  useEffect(() => {
    window.scrollTo(0, 0);
    if (k) setMeta(`Buying costs calculator for ${the(name)}: taxes and fees on top of the price · RealHunt`, `What you pay on top of the price when you buy a home in ${the(name)}: about ${DEST[k].purchase_costs_pct}% in taxes and fees, with a calculator and worked examples.`);
    else setMeta(`Buying costs calculator: taxes and fees in ${keys.length} countries · RealHunt`, `Enter a price and see what you pay on top in taxes and fees when you buy a home in ${keys.length} countries, from Spain and Italy to Japan and Mexico.`);
  }, [k]);
  const d = k ? DEST[k] : null;
  const c = d ? costLines(price, d, ccy) : null;
  const setC = (v: string) => { setCcy(v); ls.set("rh_calc_ccy", v); };
  return (
    <div className="hunt-wrap hunt-page rh2">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › {k ? <><Link to="/buying-costs">{t("Buying costs")}</Link> › <span>{name}</span></> : <span>{t("Buying costs")}</span>}</nav>
      <span className="hunt-eyebrow"><Calculator size={13} /> {t("Calculator")}</span>
      <h1>{k ? `Buying costs in ${the(name)}` : t("What does it cost to buy a home abroad?")}</h1>
      <p className="rh2-lead">{t("Taxes and fees you pay on top of the price: transfer tax or VAT, notary, land registry and lawyer. Enter a price to see the total.")}</p>
      <form className="rh2-calc" onSubmit={(e) => e.preventDefault()}>
        <label className="rh2-field rh2-field-country"><span>{t("Country")}</span>
          <select value={k} onChange={(e) => nav(e.target.value ? `/buying-costs/${e.target.value}` : "/buying-costs")}>
            <option value="">{t("Choose a country")}</option>
            {keys.map((x) => <option key={x} value={x}>{nameOf(x, GUIDES)}</option>)}
          </select>
        </label>
        <label className="rh2-field"><span>{t("Price of the home")}</span>
          <input type="number" inputMode="numeric" min={0} step={1000} value={price || ""} onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))} />
        </label>
        <label className="rh2-field rh2-field-ccy"><span>{t("Currency")}</span>
          <select value={ccy} onChange={(e) => setC(e.target.value)}>{CCYS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
        </label>
      </form>
      {c ? <section className="rh2-result" aria-live="polite">
        <div><small>{t("Taxes and fees")} ({c.pct})</small><b>{c.fees}</b></div>
        <div className="is-total"><small>{t("Total with the price")}</small><b>{c.total}</b></div>
      </section> : !k && <p className="rh2-muted">{t("Choose a country to see the result.")}</p>}
      {d && <>
        {d.purchase_costs_breakdown && <><h2>{t("Where the money goes")}</h2><p>{d.purchase_costs_breakdown}</p></>}
        {d.annual_property_tax && <><h2>{t("Every year after you buy")}</h2><p><b>{t("Yearly property tax")}:</b> {d.annual_property_tax}</p></>}
        {d.rental_income_tax && <p><b>{t("Tax on rental income")}:</b> {d.rental_income_tax}</p>}
        <h2>{t("Worked examples")}</h2>
        <div className="hv-costs-table"><table><thead><tr><th>{t("Price")}</th><th>{t("Taxes and fees")}</th><th>{t("Total")}</th></tr></thead>
          <tbody>{[150000, 300000].map((p) => { const x = costLines(p, d, "EUR")!; return <tr key={p}><td>{fmtMoney(p)}</td><td>{x.fees}</td><td>{x.total}</td></tr>; })}</tbody></table></div>
        <p className="hunt-fine">{t("Costs are a share of the price, so they work in any currency. Ranges cover new and resale homes and different regions.")} {t("Figures as of")} {d.as_of}. {t("General information, not tax or legal advice.")}</p>
        <p className="hunt-row">{GUIDES[k] && <Link className="hunt-primary" to={`/guide/${k}`}>{t("How to buy in")} {the(name)}</Link>}<Link className="hunt-secondary" to={`/costs/${k}`}>{t("Costs, taxes and sources")}</Link><Link className="hunt-secondary" to={`/homes/${k}`}>{t("Homes in")} {the(name)}</Link></p>
      </>}
      <h2>{t("All countries")}</h2>
      <div className="hv-costs-table"><table><thead><tr><th>{t("Country")}</th><th>{t("On top of the price")}</th><th>{`Fees on ${fmtMoney(price || 0, ccy)}`}</th></tr></thead>
        <tbody>{keys.map((x) => { const l = costLines(price, DEST[x], ccy)!; return <tr key={x} className={x === k ? "is-on" : undefined}><td><Link to={`/buying-costs/${x}`}>{nameOf(x, GUIDES)}</Link></td><td>{DEST[x].purchase_costs_pct}%</td><td>{l.fees}</td></tr>; })}</tbody></table></div>
      <p className="hunt-row"><Link className="hunt-secondary" to="/can-i-buy">{t("Can I buy there?")}</Link><Link className="hunt-secondary" to="/costs">{t("Real costs and rental yields")}</Link></p>
    </div>
  );
}
