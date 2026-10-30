// Taxes per country (21-oct-2026, Carlos: "añade info sobre la fiscalidad en cada tarjeta").
// Data lives in /public/data/taxes.json (one entry per country, Spain also by region, US by state),
// so every home, present and future, shows its taxes automatically from its country.
import { useEffect, useState } from "react";
import { getLang } from "@/lib/lang";

type Row = Record<string, any>;
type Tx = {
  updated: string;
  countries: Record<string, { card: { en: string[]; es: string[] }; en: Row; es?: Row; states?: { en: Row; es?: Row }; sources: string[] }>;
  spain_regions: Record<string, { itp: string; wealth_en: string; wealth_es: string }>;
  spain_kw: Record<string, string[]>;
};

let txP: Promise<Tx> | null = null;
let txV: Tx | null = null;
function loadTaxes(): Promise<Tx> {
  return (txP ||= fetch("/data/taxes.json", { cache: "force-cache" }).then((r) => {
    if (!r.ok) throw new Error("taxes " + r.status);
    return r.json();
  }).then((j) => (txV = j)).catch((e) => { txP = null; throw e; }));
}
export function useTaxes(): Tx | null {
  const [v, setV] = useState<Tx | null>(txV);
  useEffect(() => { if (!txV) loadTaxes().then(setV).catch(() => {}); }, []);
  return v;
}

const es = () => getLang() === "es";
const ES_NAME: Record<string, string> = { Spain: "España", Italy: "Italia", Denmark: "Dinamarca", Sweden: "Suecia", France: "Francia", Poland: "Polonia", "United States": "Estados Unidos", Japan: "Japón", Germany: "Alemania", Netherlands: "Países Bajos", Greece: "Grecia", Switzerland: "Suiza", Mexico: "México", Canada: "Canadá", Bulgaria: "Bulgaria", "Dominican Republic": "República Dominicana", Portugal: "Portugal", Cyprus: "Chipre", "United Kingdom": "Reino Unido", Norway: "Noruega" };
export function spainRegion(tx: Tx, deal: Row): string | null {
  const hay = `${deal.location_name || ""} ${deal.title || ""}`.toLowerCase();
  for (const [reg, kws] of Object.entries(tx.spain_kw || {})) if (kws.some((k) => hay.includes(k))) return reg;
  return null;
}
function usState(tx: Tx, deal: Row): string | null {
  const st = tx.countries["United States"]?.states?.en || {};
  const hay = `${deal.location_name || ""}`;
  return Object.keys(st).find((s) => hay.includes(s)) || null;
}

/** One compact line for the card: buying taxes · yearly tax · wealth tax. */
export function TaxLine({ deal }: { deal: Row }) {
  const tx = useTaxes();
  const c = tx?.countries[deal.country];
  if (!tx || !c) return null;
  const L = es() ? "es" : "en";
  let [buy, year, wealth] = c.card[L];
  if (deal.country === "Spain") {
    const reg = spainRegion(tx, deal);
    const r = reg ? tx.spain_regions[reg] : null;
    if (r) { buy = (L === "es" ? "ITP " : "ITP ") + r.itp + (L === "es" ? " + ~2% gastos" : " + ~2% fees"); wealth = L === "es" ? r.wealth_es : r.wealth_en; }
  }
  return (
    <span className="rh-tax-line" translate="no" title={L === "es" ? "Impuestos aproximados. Consulta con un asesor local." : "Approximate taxes. Check with a local adviser."}>
      🧾 {L === "es" ? "Compra" : "Buy"} {buy} · {L === "es" ? "Anual" : "Yearly"} {year} · {wealth}
    </span>
  );
}

const LABELS: [string, string, string][] = [
  ["buy_resale_pct", "Buying a resale home", "Comprar una vivienda de segunda mano"],
  ["buy_new_pct", "Buying a new build", "Comprar obra nueva"],
  ["buy_fees_pct", "Notary, registry and legal fees", "Notaría, registro y abogado"],
  ["yearly", "Every year you own it", "Cada año que la tengas"],
  ["wealth", "Wealth tax", "Impuesto sobre el patrimonio"],
  ["sell", "When you sell", "Cuando vendas"],
  ["rent", "If you rent it out", "Si la alquilas"],
  ["foreigners", "Buying as a foreigner", "Comprar siendo extranjero"],
];

/** Full taxes panel for the home page. */
export function TaxPanel({ deal }: { deal: Row }) {
  const tx = useTaxes();
  const c = tx?.countries[deal.country];
  if (!tx || !c) return null;
  const isEs = es();
  const d: Row = (isEs && c.es) || c.en;
  const reg = deal.country === "Spain" ? spainRegion(tx, deal) : null;
  const r = reg ? tx.spain_regions[reg] : null;
  const st = deal.country === "United States" ? usState(tx, deal) : null;
  const stText = st ? ((isEs && c.states?.es?.[st]) || c.states?.en?.[st]) : null;
  return (
    <section className="rh-taxes" translate="no" aria-label={isEs ? "Impuestos" : "Taxes"}>
      <h2>🧾 {isEs ? `Impuestos en ${ES_NAME[deal.country] || deal.country}` : `Taxes in ${deal.country}`}</h2>
      {r && <p className="rh-taxes-local"><strong>{reg}:</strong> {isEs ? `ITP (impuesto de compra) ${r.itp} · ${r.wealth_es}` : `transfer tax (ITP) ${r.itp} · ${r.wealth_en}`}</p>}
      {st && stText && <p className="rh-taxes-local"><strong>{st}:</strong> {stText}</p>}
      <dl className="rh-taxes-grid">
        {LABELS.filter(([k]) => d[k]).map(([k, en, esL]) => (
          <div key={k}><dt>{isEs ? esL : en}</dt><dd>{d[k]}</dd></div>
        ))}
      </dl>
      <p className="rh-taxes-note">
        {isEs
          ? `Información orientativa actualizada en ${tx.updated.slice(0, 7)}. Los impuestos cambian y dependen de tu residencia fiscal: confírmalo con un asesor o abogado local antes de comprar.`
          : `Guide information updated ${tx.updated.slice(0, 7)}. Taxes change and depend on where you are tax resident: confirm with a local adviser or lawyer before buying.`}
        {c.sources?.length ? <> {isEs ? "Fuentes:" : "Sources:"} {c.sources.slice(0, 3).map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow">{i ? ", " : ""}{new URL(u).hostname.replace(/^www\./, "")}</a>)}</> : null}
      </p>
    </section>
  );
}

// Styles (kept here so the feature is self-contained).
if (typeof document !== "undefined" && !document.getElementById("rh-taxes-css")) {
  const s = document.createElement("style");
  s.id = "rh-taxes-css";
  s.textContent = `.rh-tax-line{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.4;color:#5b6168;margin-top:3px;white-space:normal}
.rh-taxes{padding:24px 0}.rh-taxes h2{font-size:23px;font-weight:650}.rh-taxes-local{margin-top:10px;font-size:15px;padding:10px 14px;border-radius:12px;background:#f3f7f4}
.rh-taxes-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}.rh-taxes-grid>div{padding:14px 16px;border:1px solid #d6d8db;border-radius:14px}
.rh-taxes-grid dt{font-weight:650;margin-bottom:6px}.rh-taxes-grid dd{font-size:14px;line-height:1.5;margin:0}.rh-taxes-note{font-size:12.5px;color:#6b7076;margin-top:12px;line-height:1.5}.rh-taxes-note a{text-decoration:underline}
@media(max-width:700px){.rh-taxes-grid{grid-template-columns:1fr}.rh-tax-line{font-size:10.5px}}
html.dark .rh-taxes-local,[data-theme=dark] .rh-taxes-local{background:#1d2622}html.dark .rh-tax-line,[data-theme=dark] .rh-tax-line{color:#a7adb3}`;
  document.head.appendChild(s);
}
