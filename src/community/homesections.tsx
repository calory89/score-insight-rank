// 26-nov-2026 (list of 1,000, batch 11: 502, 509, 510, 511, 512, 537, 546, 549). Plain links under the home page's
// first homes, so a visitor (and a crawler) can reach every family of pages from "/" in one click: homes by country
// with their count, quick budget lists, new homes and price drops, guides, calculators and research, how RealHunt
// works and why it can be trusted. Every link goes to an indexable page that exists in both languages
// (/cheap-houses/under-<n>, /homes/<country>, /guide, /tools, /research...). The Spanish text is written whole here,
// not left to the dictionary, so a Spanish page never shows English words.
import { Link } from "react-router-dom";
import { isEs, esPlace } from "@/lib/lang";

/** 545: one event per click to the Google tag that is already on the page, only with analytics consent (same rule
 *  as src/measure). No personal data: only the name of the block. */
function track(name: string, p: { where: string }) {
  try { if (localStorage.getItem("rh_consent") !== "all") return; const g = (window as any).gtag; if (typeof g === "function") g("event", name, { section: p.where }); } catch { /* analytics never breaks the page */ }
}

const BUDGETS = [30000, 50000, 75000, 100000];
const slug = (c: string) => c.toLowerCase().replace(/ /g, "-");

const EN = {
  h: "Explore RealHunt", country: "Homes by country", budget: "By budget", under: (n: string) => `Under ${n}`,
  sea: "By the sea", fresh: "New and cheaper", newH: "New homes this week", drops: "Price drops",
  learn: "Before you buy", guides: "Buying guides by country", tools: "Free calculators", research: "Research and data", costs: "Buying costs by country", canbuy: "Can a foreigner buy there?",
  howH: "How RealHunt works",
  how: [["We search", "Property portals around the world, every day."], ["A person checks", "Photos, price and place, before a home goes live. Adverts are checked again every night."], ["We score", "Price, location, space and condition give a score out of 100. We never sell homes: we send you to the seller."]] as [string, string][],
  method: "How the score works", check: "How we check homes", money: "How we make money", all: "All pages",
};
const ES: typeof EN = {
  h: "Explora RealHunt", country: "Casas por país", budget: "Por presupuesto", under: (n: string) => `Menos de ${n}`,
  sea: "Cerca del mar", fresh: "Nuevas y más baratas", newH: "Casas nuevas de la semana", drops: "Bajadas de precio",
  learn: "Antes de comprar", guides: "Guías de compra por país", tools: "Calculadoras gratis", research: "Estudios y datos", costs: "Costes de compra por país", canbuy: "¿Puede comprar un extranjero?",
  howH: "Cómo funciona RealHunt",
  how: [["Buscamos", "Portales inmobiliarios de todo el mundo, cada día."], ["Una persona revisa", "Fotos, precio y lugar antes de publicar cada casa. Cada noche comprobamos que el anuncio sigue."], ["Puntuamos", "Precio, ubicación, espacio y estado dan una nota sobre 100. No vendemos casas: te enviamos al vendedor."]],
  method: "Cómo se calcula la nota", check: "Cómo revisamos las casas", money: "Cómo ganamos dinero", all: "Todas las páginas",
};

export function HomeSections({ countries }: { countries: Record<string, number> }) {
  const es = isEs();
  const x = es ? ES : EN;
  const fmt = (n: number) => es ? `${n.toLocaleString("es-ES")} €` : `€${n.toLocaleString("en")}`;
  const list = Object.entries(countries).filter(([, n]) => n >= 3) // the same 3-home floor as the indexable country pages
   .sort((a, b) => b[1] - a[1]);
  const go = (where: string) => () => track("home_section_click", { where });
  return (
    <section className="rh-hsec" aria-labelledby="rh-hsec-h">
      <h2 id="rh-hsec-h">{x.h}</h2>
      {list.length > 0 && (
        <nav className="rh-hsec-block" aria-label={x.country}>
          <h3>{x.country}</h3>
          <ul className="rh-hsec-countries">
            {list.map(([c, n]) => <li key={c}><Link to={`/homes/${encodeURIComponent(slug(c))}`} onClick={go("country")}>{es ? esPlace(c) : c} <small>{n}</small></Link></li>)}
          </ul>
        </nav>
      )}
      <nav className="rh-hsec-block" aria-label={x.budget}>
        <h3>{x.budget}</h3>
        <ul className="rh-hsec-chips">
          {BUDGETS.map((b) => <li key={b}><Link to={`/cheap-houses/under-${b}`} onClick={go("budget")}>{x.under(fmt(b))}</Link></li>)}
          <li><Link to="/cheap-houses/by-the-sea" onClick={go("sea")}>{x.sea}</Link></li>
        </ul>
      </nav>
      <div className="rh-hsec-cols">
        <nav className="rh-hsec-block" aria-label={x.fresh}>
          <h3>{x.fresh}</h3>
          <ul>
            <li><Link to="/new" onClick={go("new")}>{x.newH}</Link></li>
            <li><Link to="/price-drops" onClick={go("drops")}>{x.drops}</Link></li>
          </ul>
        </nav>
        <nav className="rh-hsec-block" aria-label={x.learn}>
          <h3>{x.learn}</h3>
          <ul>
            <li><Link to="/guide" onClick={go("guides")}>{x.guides}</Link></li>
            <li><Link to="/tools" onClick={go("tools")}>{x.tools}</Link></li>
            <li><Link to="/costs" onClick={go("costs")}>{x.costs}</Link></li>
            <li><Link to="/can-i-buy" onClick={go("canbuy")}>{x.canbuy}</Link></li>
            <li><Link to="/research" onClick={go("research")}>{x.research}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="rh-hsec-block rh-hsec-how">
        <h3>{x.howH}</h3>
        <ol>{x.how.map(([h, p]) => <li key={h}><strong>{h}</strong> <span>{p}</span></li>)}</ol>
        <p><Link to="/method" onClick={go("method")}>{x.method}</Link> · <Link to="/how-we-check-homes" onClick={go("check")}>{x.check}</Link> · <Link to="/how-we-make-money" onClick={go("money")}>{x.money}</Link> · <Link to="/sitemap" onClick={go("sitemap")}>{x.all}</Link></p>
      </div>
    </section>
  );
}
