// Growth pages in the app. seo/prerender.ts builds the same pages as plain HTML for crawlers, from the same
// shared logic (./seo2data.ts), so both say the same thing:
//   /can-i-buy                              who can buy where, by nationality
//   /can-i-buy/<nationality>-in-<country>   the answer for one nationality and one country
//   /buying-costs and /buying-costs/<k>     calculator: what you pay on top of the price
import { snapshotRaw } from "@/lib/snapshotRaw";
import "./seo2.css";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Calculator, Check, AlertTriangle, Ban, ChevronDown } from "lucide-react";
import CB_JSON from "@/data/canbuy.json";
import GUIDES_JSON from "@/data/guides.json";
import DEST_JSON from "@/data/destinations.json";
import CB_ES_JSON from "@/data/canbuy-es.json";
import GUIDES_ES_JSON from "@/data/guides-es.json";
import DEST_ES_JSON from "@/data/destinations-es.json";
import { isEs } from "@/lib/lang";
import { mediaDeep } from "@/lib/media";
import { MiniCard, type Row } from "./extras";
import { t } from "./i18n";
import { ShareAnswer } from "./shareAnswer";
import {
  type CanBuyData, type Lang, type Status, UPDATED, countryKey, nameOf, costLines, costCountries,
  canBuyCountries, canBuySlug, parseCanBuySlug, ruleFor, residencyFor, canBuyFaq, canBuyMeta, fill, fmtMoney,
  localizeCanBuy, localizeRows, statusLabel, theL, pctL,
} from "./seo2data";

// Spanish site (8-nov-2026): rules, legal and tax sentences come from the *-es.json files and every sentence built
// here has a Spanish template, so nothing is left in English (the page reloads when the language changes).
const LANG: Lang = isEs() ? "es" : "en";
const ES = LANG === "es";
const L = (en: string, es: string) => (ES ? es : en);
type Guide = { name: string; steps: [string, string][]; yearly: string };
const CB = ES ? localizeCanBuy(CB_JSON as unknown as CanBuyData, CB_ES_JSON as any) : (CB_JSON as unknown as CanBuyData);
const GUIDES = (ES ? localizeRows(GUIDES_JSON as any, GUIDES_ES_JSON as any) : GUIDES_JSON) as unknown as Record<string, Guide>;
const DEST = (ES ? localizeRows(DEST_JSON as any, DEST_ES_JSON as any) : DEST_JSON) as Record<string, any>;
const the = (n: string) => theL(n, LANG);
const money = (n: number, ccy = "EUR") => fmtMoney(n, ccy, LANG);
const pct = (p: unknown) => pctL(p, LANG);
/** "Updated November 2026." / "Actualizado en noviembre de 2026." */
const Updated = () => (ES ? <>Actualizado en noviembre de 2026.</> : <>{t("Updated")} {UPDATED}.</>);
/** Spanish adjective for a nationality ("estadounidense"); the English label otherwise. */
const adj = (n: { label: string; adj?: string }) => n.adj || n.label;
const adjPl = (n: { label: string; adj_pl?: string }) => n.adj_pl || n.label;

const setMeta = (title: string, desc: string) => { document.title = title; document.querySelector('meta[name="description"]')?.setAttribute("content", desc); };
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
};

// All published homes by country, best score first (the same static snapshot the feed uses).
let homesP: Promise<Record<string, Row[]>> | null = null;
function homesByCountry() {
  return (homesP ||= snapshotRaw().then(mediaDeep).then((s: any) => {
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
  return <span className={`rh2-pill is-${s}${big ? " is-big" : ""}`}>{ICON[s]}{statusLabel(s, LANG)}</span>;
}

// ---------------------------------------------------------------- /can-i-buy
export function CanBuyIndex() {
  const nats = Object.keys(CB.nationalities);
  const [nat, setNat] = useState(() => { const v = ls.get("rh_canbuy_nat"); return v && CB.nationalities[v] ? v : "american"; });
  const countries = canBuyCountries(CB, DEST, GUIDES).filter((c) => CB.nationalities[nat].home !== c);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (ES) setMeta(`¿Puedo comprar una vivienda en el extranjero? Normas por nacionalidad en ${countries.length} países (noviembre de 2026) · RealHunt`, "¿Pueden los estadounidenses, británicos, canadienses, australianos y europeos comprar casa en España, Italia, Dinamarca, Suiza, México y otros países? La respuesta corta para cada nacionalidad, con gastos e impuestos.");
    else setMeta(`Can I buy property abroad? Rules by nationality for ${countries.length} countries (${UPDATED}) · RealHunt`, "Can Americans, British, Canadians, Australians and Europeans buy a home in Spain, Italy, Denmark, Switzerland, Mexico and more? The short answer for each nationality, with costs and taxes.");
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
      <h2 className="rh2-h2">{L(`Rules for ${n.label} buyers`, `Normas para compradores ${adjPl(n)}`)}</h2>
      <ul className="rh2-list">
        {countries.map((c) => {
          const r = ruleFor(CB, nat, c)!; const name = GUIDES[c].name;
          return (
            <li key={c}>
              <Link to={`/can-i-buy/${canBuySlug(nat, c)}`} className="rh2-row">
                <span className="rh2-row-main"><strong>{name}</strong><StatusPill s={r.s} /></span>
                <span className="rh2-row-text">{fill(r.a, n)}</span>
                {DEST[c]?.purchase_costs_pct && <small>{t("Costs on top of the price")}: {pct(DEST[c].purchase_costs_pct)}%</small>}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="hunt-fine">{t("General information, not legal advice.")} <Updated /> {t("Rules change: check with a local lawyer or notary before you sign anything.")}</p>
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
  const meta = p && name ? canBuyMeta(CB, p.nat, p.country, name, LANG) : null;
  useEffect(() => { if (meta) setMeta(meta.title, meta.desc); }, [slug]);
  if (!p || !name || !meta) return <CanBuyIndex />;
  const { nat, country } = p;
  const n = CB.nationalities[nat]; const r = ruleFor(CB, nat, country)!; const d = DEST[country] || {}; const g = GUIDES[country];
  const homes = (homesAll?.[country] || []).slice(0, 6);
  const allHere = homesAll?.[country] || [];
  const faq = canBuyFaq(CB, nat, country, { dest: d, guide: g, name, homes: allHere }, LANG);
  const ex = costLines(150000, d, "EUR", LANG);
  const res = residencyFor(CB, nat, country, name, LANG);
  const otherNats = Object.keys(CB.nationalities).filter((k) => k !== nat && CB.nationalities[k].home !== country);
  const otherCountries = canBuyCountries(CB, DEST, GUIDES).filter((c) => c !== country && c !== n.home);
  return (
    <article className="hunt-wrap hunt-page rh2">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <Link to="/can-i-buy">{t("Can I buy there?")}</Link> › <span>{n.label} · {name}</span></nav>
      <span className="hunt-eyebrow">{L(`Buying rules for ${n.label} citizens`, `Normas de compra para ciudadanos ${adjPl(n)}`)}</span>
      <h1>{meta.h1}</h1>
      <section className={`rh2-answer is-${r.s}`} aria-label={t("Short answer")}>
        <StatusPill s={r.s} big />
        <p>{fill(r.a, n)}</p>
        <small>{t("General information, not legal advice.")} <Updated /></small>
      </section>
      <ShareAnswer question={meta.h1} status={statusLabel(r.s, LANG)} rule={fill(r.a, n)} url={`https://realhunt.co${ES ? "/es" : ""}/can-i-buy/${slug}`} />
      <div className="rh2-facts">
        {ex && <div><small>{t("Costs on top of the price")}</small><b>{ex.pct}</b><span>{ex.fees} {t("on a €150,000 home")}</span></div>}
        {allHere.length > 0 && <div><small>{t("Homes on RealHunt")}</small><b>{allHere.length}</b><span>{t("from")} {money(Math.min(...allHere.map((h: any) => h.price_eur)))}</span></div>}
        <div><small>{t("Living there")}</small><b>{n.bloc !== "other" && (CB.eu.includes(country) || country === "norway" || country === "switzerland") ? t("Free movement") : t("Visa rules apply")}</b><span>{L(`${n.label} passport`, `Pasaporte ${adj(n)}`)}</span></div>
      </div>
      {ex && <section>
        <h2>{t("What it costs to buy")}</h2>
        {ES
          ? <p>Alrededor de un <b>{pct(d.purchase_costs_pct)}%</b> además del precio. En una vivienda de 150.000&nbsp;€ son <b>{ex.fees}</b>, así que <b>{ex.total}</b> en total.</p>
          : <p>{t("About")} <b>{d.purchase_costs_pct}%</b> {t("on top of the price")}. {t("On a €150,000 home that is")} <b>{ex.fees}</b>, {t("so")} <b>{ex.total}</b> {t("in total")}.</p>}
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
      {n.notes.length > 0 && <section><h2>{L(`Good to know for ${n.label} buyers`, `Conviene saber si eres ${adj(n)}`)}</h2><ul className="rh2-notes">{n.notes.map((x) => <li key={x}>{x}</li>)}</ul></section>}
      {g?.steps?.length > 0 && <section>
        <h2>{L(`The steps to buy in ${the(name)}`, `Los pasos para comprar en ${the(name)}`)}</h2>
        <ol className="rh2-steps">{g.steps.map(([h]) => <li key={h}>{h}</li>)}</ol>
        <p><Link className="hunt-link" to={`/guide/${country}`}>{t("The full guide, step by step")}</Link></p>
      </section>}
      <section>
        <h2>{t("Best homes in")} {ES ? the(name) : name}</h2>
        {!homesAll ? <div className="hunt-skeleton-list" /> : homes.length ? <div className="hunt-minigrid rh2-homes">{homes.map((h) => <MiniCard key={h.slug} d={h} />)}</div> : <p>{t("No homes here right now.")} <Link className="hunt-link" to={`/alerts?country=${encodeURIComponent(name)}`}>{t("Get an alert when one appears")}</Link></p>}
        {allHere.length > homes.length && <p><Link className="hunt-link" to={`/homes/${country}`}>{L(`All ${allHere.length} homes in ${the(name)}`, `Las ${allHere.length} casas en ${the(name)}`)}</Link></p>}
      </section>
      <section>
        <h2>{t("Questions")}</h2>
        <div className="rh2-faq">{faq.map(([q, a]) => <details key={q}><summary>{q}<ChevronDown size={16} aria-hidden /></summary><p>{a}</p></details>)}</div>
      </section>
      <p className="hunt-row"><Link className="hunt-primary" to={`/guide/${country}`}>{t("How to buy in")} {the(name)}</Link><Link className="hunt-secondary" to={`/costs/${country}`}>{t("Costs, taxes and sources")}</Link></p>
      <h2 className="rh2-h2">{L(`Other nationalities in ${name}`, `Otras nacionalidades en ${the(name)}`)}</h2>
      <p className="hunt-chips">{otherNats.map((k) => <Link key={k} to={`/can-i-buy/${canBuySlug(k, country)}`}>{CB.nationalities[k].label}</Link>)}</p>
      <h2 className="rh2-h2">{L(`${n.label} buyers in other countries`, `Compradores ${adjPl(n)} en otros países`)}</h2>
      <p className="hunt-chips">{otherCountries.map((c) => <Link key={c} to={`/can-i-buy/${canBuySlug(nat, c)}`}>{GUIDES[c].name}</Link>)}</p>
      <p className="hunt-fine">{t("General information, not legal advice. Rules and taxes change: check with a local lawyer or notary before you sign anything.")} <Updated /></p>
    </article>
  );
}

// ---------------------------------------------------------------- /buying-costs and /buying-costs/<country>
const CCYS = ["EUR", "USD", "GBP"] as const;
export function BuyingCostsPage() {
  const { country = "" } = useParams();
  const nav = useNavigate();
  const keys = useMemo(() => costCountries(DEST, GUIDES, LANG), []);
  const k = keys.includes(country) ? country : "";
  const [price, setPrice] = useState(150000);
  const [ccy, setCcy] = useState<string>(() => { const v = ls.get("rh_calc_ccy"); return v && (CCYS as readonly string[]).includes(v) ? v : "EUR"; });
  const name = k ? nameOf(k, GUIDES, LANG) : "";
  useEffect(() => {
    window.scrollTo(0, 0);
    if (ES) {
      if (k) setMeta(`Calculadora de gastos de compra en ${the(name)}: impuestos y gastos además del precio · RealHunt`, `Lo que pagas además del precio al comprar una vivienda en ${the(name)}: alrededor de un ${pct(DEST[k].purchase_costs_pct)}% en impuestos y gastos, con calculadora y ejemplos.`);
      else setMeta(`Calculadora de gastos de compra: impuestos y gastos en ${keys.length} países · RealHunt`, `Introduce un precio y mira lo que pagas además en impuestos y gastos al comprar una vivienda en ${keys.length} países, de España e Italia a Japón y México.`);
      return;
    }
    if (k) setMeta(`Buying costs calculator for ${the(name)}: taxes and fees on top of the price · RealHunt`, `What you pay on top of the price when you buy a home in ${the(name)}: about ${DEST[k].purchase_costs_pct}% in taxes and fees, with a calculator and worked examples.`);
    else setMeta(`Buying costs calculator: taxes and fees in ${keys.length} countries · RealHunt`, `Enter a price and see what you pay on top in taxes and fees when you buy a home in ${keys.length} countries, from Spain and Italy to Japan and Mexico.`);
  }, [k]);
  const d = k ? DEST[k] : null;
  const c = d ? costLines(price, d, ccy, LANG) : null;
  const setC = (v: string) => { setCcy(v); ls.set("rh_calc_ccy", v); };
  return (
    <div className="hunt-wrap hunt-page rh2">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › {k ? <><Link to="/buying-costs">{t("Buying costs")}</Link> › <span>{name}</span></> : <span>{t("Buying costs")}</span>}</nav>
      <span className="hunt-eyebrow"><Calculator size={13} /> {t("Calculator")}</span>
      <h1>{k ? L(`Buying costs in ${the(name)}`, `Gastos de compra en ${the(name)}`) : t("What does it cost to buy a home abroad?")}</h1>
      <p className="rh2-lead">{t("Taxes and fees you pay on top of the price: transfer tax or VAT, notary, land registry and lawyer. Enter a price to see the total.")}</p>
      <form className="rh2-calc" onSubmit={(e) => e.preventDefault()}>
        <label className="rh2-field rh2-field-country"><span>{t("Country")}</span>
          <select value={k} onChange={(e) => nav(e.target.value ? `/buying-costs/${e.target.value}` : "/buying-costs")}>
            <option value="">{t("Choose a country")}</option>
            {keys.map((x) => <option key={x} value={x}>{nameOf(x, GUIDES, LANG)}</option>)}
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
          <tbody>{[150000, 300000].map((p) => { const x = costLines(p, d, "EUR", LANG)!; return <tr key={p}><td>{money(p)}</td><td>{x.fees}</td><td>{x.total}</td></tr>; })}</tbody></table></div>
        <p className="hunt-fine">{t("Costs are a share of the price, so they work in any currency. Ranges cover new and resale homes and different regions.")} {t("Figures as of")} {d.as_of}. {t("General information, not tax or legal advice.")}</p>
        <p className="hunt-row">{GUIDES[k] && <Link className="hunt-primary" to={`/guide/${k}`}>{t("How to buy in")} {the(name)}</Link>}<Link className="hunt-secondary" to={`/costs/${k}`}>{t("Costs, taxes and sources")}</Link><Link className="hunt-secondary" to={`/homes/${k}`}>{t("Homes in")} {the(name)}</Link></p>
      </>}
      <h2>{t("All countries")}</h2>
      <div className="hv-costs-table"><table><thead><tr><th>{t("Country")}</th><th>{t("On top of the price")}</th><th>{L(`Fees on ${money(price || 0, ccy)}`, `Gastos sobre ${money(price || 0, ccy)}`)}</th></tr></thead>
        <tbody>{keys.map((x) => { const l = costLines(price, DEST[x], ccy, LANG)!; return <tr key={x} className={x === k ? "is-on" : undefined}><td><Link to={`/buying-costs/${x}`}>{nameOf(x, GUIDES, LANG)}</Link></td><td>{pct(DEST[x].purchase_costs_pct)}%</td><td>{l.fees}</td></tr>; })}</tbody></table></div>
      <p className="hunt-row"><Link className="hunt-secondary" to="/can-i-buy">{t("Can I buy there?")}</Link><Link className="hunt-secondary" to="/costs">{t("Real costs and rental yields")}</Link></p>
    </div>
  );
}
