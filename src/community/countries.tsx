// /countries and /countries/<a>-vs-<b>: two countries side by side, from the homes on RealHunt (public/data/rh-static.json)
// and the buying rules and costs in src/data/destinations.json. seo/prerender.ts builds the same pages for crawlers
// (same pairs, same figures); keep the two in step.
import { mediaDeep } from "@/lib/media";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Scale } from "lucide-react";
import GUIDES_JSON from "@/data/guides.json";
import DEST_JSON from "@/data/destinations.json";
import { money } from "./api";
import { MiniCard, type Row } from "./extras";
const theC = (n: string) => (/^(United |Netherlands$|Dominican Republic$|Czech Republic$|Philippines$)/.test(n) ? "the " + n : n);
import { t } from "./i18n";

const GUIDES = GUIDES_JSON as Record<string, { name: string }>;
const DESTS = DEST_JSON as Record<string, any>;
const MIN_HOMES = 3;
const key = (c?: string | null) => String(c || "").toLowerCase().trim().replace(/\s+/g, "-");
const median = (xs: number[]) => { const a = xs.filter((x) => x > 0).sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : 0; };

export type CountryStats = { k: string; name: string; n: number; med: number; ppsqm: number; min: number; score: number; top: Row[] };

let snap: Promise<Record<string, CountryStats>> | null = null;
export function countryStats() {
  return (snap ||= fetch("/data/rh-static.json", { cache: "force-cache" }).then((r) => r.json()).then(mediaDeep).then((s: any) => {
    const by: Record<string, Row[]> = {};
    for (const r of (s.rows || []) as any[]) if (r.price_eur > 0) (by[key(r.country)] ||= []).push(r);
    const out: Record<string, CountryStats> = {};
    for (const [k, rows] of Object.entries(by)) {
      rows.sort((a: any, b: any) => (b.nota || 0) - (a.nota || 0));
      out[k] = { k, name: (rows[0] as any).country, n: rows.length, med: median(rows.map((r: any) => r.price_eur)), ppsqm: median(rows.filter((r: any) => r.sqm > 0).map((r: any) => r.price_eur / r.sqm)),
        min: Math.min(...rows.map((r: any) => r.price_eur)), score: median(rows.map((r: any) => r.nota || 0)), top: rows.slice(0, 3) };
    }
    return out;
  }).catch(() => ({})));
}
/** Countries that can be compared: a buying guide, cost data and at least MIN_HOMES homes. */
export const comparable = (st: Record<string, CountryStats>) => Object.keys(GUIDES).filter((k) => DESTS[k] && (st[k]?.n || 0) >= MIN_HOMES).sort((a, b) => st[b].n - st[a].n);
const pct = (a: number, b: number) => Math.round(Math.abs(a - b) / Math.max(a, b) * 100);
const lowCost = (s?: string) => Number((String(s || "").match(/[\d.]+/) || [])[0]) || 0;

export function CountriesPage() {
  const { pair = "" } = useParams();
  const [st, setSt] = useState<Record<string, CountryStats> | null>(null);
  useEffect(() => { countryStats().then(setSt); window.scrollTo(0, 0); }, [pair]);
  const [ka, kb] = pair.split("-vs-");
  const A = st?.[ka]; const B = st?.[kb];
  const ok = !!(A && B && DESTS[ka] && DESTS[kb] && GUIDES[ka] && GUIDES[kb]);
  useEffect(() => {
    document.title = ok ? `${A!.name} vs ${B!.name}: cheap homes, prices and buying costs compared · RealHunt` : "Compare countries for a cheap home abroad · RealHunt";
  }, [ok, ka, kb, st]);
  if (!st) return <div className="hunt-wrap"><div className="hunt-skeleton-list" /></div>;
  const list = comparable(st);
  if (!pair || !ok) return (
    <div className="hunt-wrap hunt-page">
      <span className="hunt-eyebrow"><Scale size={13} /> {t("Compare countries")}</span>
      <h1>{t("Compare two countries for a cheap home")}</h1>
      <p>{t("Prices from the homes on RealHunt, side by side with the buying rules, taxes and costs on top of the price.")}</p>
      {list.map((a) => <p key={a}><b>{st[a].name}</b>: {list.filter((b) => b !== a).map((b, i) => <span key={b}>{i ? " · " : ""}<Link className="hunt-link" to={`/countries/${[a, b].sort().join("-vs-")}`}>vs {st[b].name}</Link></span>)}</p>)}
    </div>
  );
  const da = DESTS[ka], db = DESTS[kb];
  const cheaper = A!.ppsqm && B!.ppsqm ? (A!.ppsqm < B!.ppsqm ? [A!, B!] : [B!, A!]) : null;
  const rows: [string, string, string][] = [
    [t("Homes on RealHunt"), String(A!.n), String(B!.n)],
    [t("Median price"), money(A!.med), money(B!.med)],
    [t("Median price per m²"), A!.ppsqm ? money(Math.round(A!.ppsqm)) : "n/a", B!.ppsqm ? money(Math.round(B!.ppsqm)) : "n/a"],
    [t("Cheapest home"), money(A!.min), money(B!.min)],
    [t("Median score"), String(A!.score), String(B!.score)],
    [t("Costs on top of the price"), da.purchase_costs_pct ? `${da.purchase_costs_pct}%` : "n/a", db.purchase_costs_pct ? `${db.purchase_costs_pct}%` : "n/a"],
    [t("Can foreigners buy?"), da.can_foreigners_buy || "n/a", db.can_foreigners_buy || "n/a"],
    [t("Yearly property tax"), da.annual_property_tax || "n/a", db.annual_property_tax || "n/a"],
    [t("Tax on rental income"), da.rental_income_tax || "n/a", db.rental_income_tax || "n/a"],
  ];
  return (
    <div className="hunt-wrap hunt-page rh-cmp">
      <nav className="hv-crumbs"><Link to="/">RealHunt</Link> › <Link to="/countries">{t("Compare countries")}</Link> › <span>{A!.name} vs {B!.name}</span></nav>
      <h1>{A!.name} vs {B!.name}: {t("where is a cheap home better value?")}</h1>
      {cheaper && <p>{pct(cheaper[0].ppsqm, cheaper[1].ppsqm) < 3 ? <>On RealHunt, homes in {theC(A!.name)} and {B!.name} cost about the same per m² ({money(Math.round(A!.ppsqm))} and {money(Math.round(B!.ppsqm))}), with median prices of {money(A!.med)} and {money(B!.med)}.</> : <>On RealHunt, homes in <b>{cheaper[0].name}</b> cost a median {money(Math.round(cheaper[0].ppsqm))} per m², {pct(cheaper[0].ppsqm, cheaper[1].ppsqm)}% less than in {theC(cheaper[1].name)} ({money(Math.round(cheaper[1].ppsqm))} per m²).</>}{lowCost(da.purchase_costs_pct) && lowCost(db.purchase_costs_pct) ? ` Buying costs start at about ${da.purchase_costs_pct.split(/[-–]/)[0]}% in ${theC(A!.name)} and ${db.purchase_costs_pct.split(/[-–]/)[0]}% in ${theC(B!.name)}.` : ""}</p>}
      <div className="hv-costs-table"><table><thead><tr><th></th><th>{A!.name}</th><th>{B!.name}</th></tr></thead>
        <tbody>{rows.map(([l, a, b]) => <tr key={l}><th scope="row">{l}</th><td>{a}</td><td>{b}</td></tr>)}</tbody></table></div>
      <p className="hunt-fine">{t("Prices describe the homes on RealHunt, each checked by a person, not every home in each country. Rules and taxes: general information, not legal or tax advice.")}</p>
      {[A!, B!].map((c) => <section key={c.k}>
        <h2>{t("Best homes in")} {c.name}</h2>
        <div className="hunt-minigrid">{c.top.map((d) => <MiniCard key={d.id} d={d} />)}</div>
        <p className="hunt-row"><Link className="hunt-primary" to={`/homes/${c.k}`}>All {c.n} homes in {theC(c.name)}</Link><Link className="hunt-secondary" to={`/guide/${c.k}`}>How to buy in {theC(c.name)}</Link><Link className="hunt-secondary" to={`/costs/${c.k}`}>{t("Costs and sources")}</Link></p>
      </section>)}
      <h2>{t("Other comparisons")}</h2>
      <p className="hunt-chips">{list.filter((x) => x !== ka && x !== kb).slice(0, 6).flatMap((x) => [[ka, x], [kb, x]]).map(([p, q]) => <Link key={p + q} to={`/countries/${[p, q].sort().join("-vs-")}`}>{st[p].name} vs {st[q].name}</Link>)}</p>
    </div>
  );
}
