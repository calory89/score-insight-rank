// RealHunt score (7-oct-2026): every home gets a grade from 70 to 98 plus 10 sub-scores from 0 to 100,
// like Nomad List. 70 is the floor because every home on RealHunt already passed our hand check;
// the rest compares it with every other home on the site. Data: community_scores() / community_feed.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { money } from "./api";
import { supabase } from "@/integrations/supabase/client";
import { Check } from "lucide-react";
import { t } from "./i18n";

export type Score = { n: number; d: Record<string, number>; a: string[] };
let cache: Promise<Record<string, Score>> | null = null;
export function loadScores() {
  return (cache ||= (supabase.rpc as any)("community_scores").then(({ data }: any) => (data || {}) as Record<string, Score>).catch(() => ({})));
}
export function useScore(deal: { id?: string; nota?: number; dims?: any; amen?: any } | null | undefined): Score | null {
  const own = deal && (deal as any).nota != null ? { n: (deal as any).nota, d: (deal as any).dims || {}, a: (deal as any).amen || [] } : null;
  const [s, setS] = useState<Score | null>(own);
  useEffect(() => {
    if (own || !deal?.id) return;
    let on = true; loadScores().then((m) => { if (on) setS(m[deal.id as string] || null); });
    return () => { on = false; };
  }, [deal?.id, own?.n]);
  return own || s;
}

export const DIMS: [string, string, string][] = [
  ["price", "Price", "How cheap it is next to every other home here and in its country"],
  ["value", "Price per m²", "How little you pay per square metre"],
  ["space", "Space", "Size of the house"],
  ["condition", "Move-in condition", "Renovated or ready to live in scores more; homes that need work score less"],
  ["extras", "Extras", "Garden, terrace, pool, sauna, fireplace, views, land and more"],
  ["water", "Sea & lakes", "How close it is to the sea or a lake"],
  ["access", "Airport", "How close the nearest airport with scheduled flights is"],
  ["costs", "Buying costs", "Taxes and fees to buy in this country: lower scores more"],
  ["photos", "Listing detail", "Photos, size and rooms published, verified by us"],
  ["interest", "Buyer interest", "Views and saves from RealHunt buyers"],
];
export const AMEN: [string, string][] = [["garden", "Garden"], ["terrace", "Terrace"], ["pool", "Pool"], ["sauna", "Sauna"], ["fireplace", "Fireplace"], ["views", "Views"], ["land", "Land"], ["garage", "Garage"], ["outbuildings", "Outbuildings"], ["cellar", "Cellar or attic"], ["water", "By the water"]];
const tone = (v: number) => (v >= 80 ? "is-great" : v >= 60 ? "is-good" : v >= 40 ? "is-ok" : "is-low");
const gtone = (n: number) => (n >= 90 ? "is-top" : n >= 80 ? "is-great" : "is-good");

export function ScoreBadge({ deal }: { deal: any }) {
  const s = useScore(deal);
  if (!s) return null;
  return <span className={"hv-score " + gtone(s.n)} title={t("RealHunt score")} aria-label={`${t("RealHunt score")} ${s.n}`}>{s.n}</span>;
}

export function ScoreBars({ deal }: { deal: any }) {
  const s = useScore(deal);
  if (!s) return null;
  const list = DIMS.filter(([k]) => s.d[k] != null);
  const sorted = list.filter(([k]) => k !== "photos" && k !== "interest").sort((a, b) => s.d[b[0]] - s.d[a[0]]);
  return (
    <section className="rh-scores">
      <div className="rh-scores-head"><span className={"hv-score is-big " + gtone(s.n)}>{s.n}</span><div><strong>{t("RealHunt score")}</strong><small>{`${t("Best at")}: ${sorted.slice(0, 2).map(([, l]) => t(l)).join(", ")}`}</small></div></div>
      <div className="rh-dims">
        {list.map(([k, l, h]) => (
          <div key={k} className={"rh-dim " + tone(s.d[k])} title={t(h)}>
            <span>{t(l)}</span><i><b style={{ width: `${Math.max(4, s.d[k])}%` }} /></i><em>{s.d[k]}</em>
          </div>
        ))}
      </div>
      {s.a.length > 0 && <ul className="rh-amen">{AMEN.filter(([k]) => s.a.includes(k)).map(([k, l]) => <li key={k}><Check size={13} /><span>{t(l)}</span></li>)}</ul>}
      <p className="hunt-fine">{t("Every home on RealHunt passed our hand check, so the score starts at 70. The rest compares it with every other home on the site, using the scores above. Extras and condition come from the listing: check them with the seller.")}</p>
    </section>
  );
}

// Nomad List style quick filters: one tap each, they combine.
export type Quick = { k: string; label: string; need?: string; dim?: [string, number]; min?: number };
export const QUICK: Quick[] = [
  { k: "s85", label: "Score 85+", min: 85 },
  { k: "water", label: "Sea & lakes", dim: ["water", 70] },
  { k: "ready", label: "Move-in ready", dim: ["condition", 90] },
  { k: "garden", label: "Garden", need: "garden" },
  { k: "views", label: "Views", need: "views" },
  { k: "air", label: "Near an airport", dim: ["access", 70] },
  { k: "big", label: "Big", dim: ["space", 70] },
  { k: "cheapbuy", label: "Low buying costs", dim: ["costs", 80] },
  { k: "sauna", label: "Sauna", need: "sauna" },
  { k: "pool", label: "Pool", need: "pool" },
];

// "Best home in each country": the top-scored home of every country, one tap away (Top3Hotels style).
export function BestPerCountry({ onCountry }: { onCountry?: (c: string) => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => {
    (supabase.rpc as any)("community_feed", { p: { scope: "all", sort: "score", limit: 100 } })
      .then(({ data }: any) => {
        const seen = new Set<string>(); const out: any[] = [];
        for (const r of data?.rows || []) { if (!r.country || seen.has(r.country)) continue; seen.add(r.country); out.push(r); }
        setRows(out.slice(0, 12));
      }).catch(() => setRows([]));
  }, []);
  if (!rows?.length) return null;
  const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-GB");
  return (
    <section className="rh-best">
      <div className="rh-best-head"><strong>{t("The best home in each country")}</strong><small>{t("Highest RealHunt score right now")}</small></div>
      <div className="rh-best-row">
        {rows.map((r) => (
          <a key={r.id} href={`/deal/${encodeURIComponent(r.slug)}?tab=all`} className="rh-best-card">
            <span className="rh-best-img">{r.image_urls?.[0] && <img src={r.image_urls[0]} alt="" loading="lazy" />}<span className={"hv-score " + gtone(r.nota)}>{r.nota}</span></span>
            <b>{r.country}</b><small>{`${eur(r.price_eur)} · ${r.location_name || ""}`}</small>
          </a>
        ))}
      </div>
      {onCountry && <div className="rh-best-more">{rows.map((r) => <button key={r.country} className="hunt-link" onClick={() => onCountry(r.country)}>{`${t("Best in")} ${r.country}`}</button>)}</div>}
    </section>
  );
}

// 7-oct-2026 (Carlos): the main feed is a ranking, not a vote. One home per line: position, small photo,
// name, place and price, one vertical bar per score that matters to a buyer, and the grade at the end.
export const RANK_BARS: [string, string, string][] = [
  ["price", "Price", "Price"],
  ["value", "€/m²", "Price per m²"],
  ["water", "Sea", "Sea & lakes"],
  ["access", "Airport", "Airport"],
  ["space", "Space", "Space"],
  ["condition", "Ready", "Move-in condition"],
  ["extras", "Extras", "Extras"],
];
const isNew = (d: any) => { const at = d.approved_at || d.publish_at; return !!at && Date.now() - new Date(at).getTime() < 36 * 3600 * 1000; };
const cleanName = (d: any) => String(d.title || "").replace(/\s+/g, " ").trim().slice(0, 90);
export function RankHead() {
  return (
    <div className="rk-head" aria-hidden="true">
      <span>#</span><span /><span>{t("Home")}</span>
      <span className="rk-bars">{RANK_BARS.map(([k, s]) => <em key={k}>{t(s)}</em>)}</span>
      <span>{t("Score")}</span>
    </div>
  );
}
export function RankRow({ deal, pos, km, near }: { deal: any; pos: number; km?: number; near?: string }) {
  const s = useScore(deal);
  const href = `/deal/${encodeURIComponent(deal.slug)}?tab=all`;
  const where = deal.location_name && deal.country && !String(deal.location_name).includes(deal.country) ? `${deal.location_name}, ${deal.country}` : deal.location_name || deal.country;
  const amen = AMEN.filter(([k]) => s?.a?.includes(k)).slice(0, 3);
  return (
    <Link to={href} className={"rk-row" + (pos <= 3 ? " is-podium" : "")} aria-label={`${pos}. ${cleanName(deal)}, ${money(deal.price_eur)}, ${t("RealHunt score")} ${s?.n ?? ""}`}>
      <span className="rk-pos">{pos}</span>
      <span className="rk-img">{deal.image_urls?.[0] ? <img src={deal.image_urls[0]} alt="" loading={pos <= 6 ? "eager" : "lazy"} decoding="async" /> : null}</span>
      <span className="rk-main">
        <strong className="rk-price">{money(deal.price_eur)}{deal.sqm ? <small>{` · ${deal.sqm} m²`}</small> : null}</strong>
        <span className="rk-title">{cleanName(deal)}</span>
        <span className="rk-where">{where}{km != null && near ? ` · ${Math.round(km)} km ${t("from")} ${near}` : ""}</span>
        <span className="rk-tags">
          {isNew(deal) && <b className="rk-new">{t("New today")}</b>}
          {deal.developer ? <b>{t("New build")}</b> : null}
          {amen.map(([k, l]) => <b key={k}>{t(l)}</b>)}
        </span>
      </span>
      <span className="rk-bars">
        {RANK_BARS.map(([k, sh, full]) => {
          const v = s?.d?.[k];
          return (
            <span key={k} className={"rk-bar " + (v != null ? tone(v) : "is-none")} title={v != null ? `${t(full)}: ${v}/100` : t(full)}>
              <i><b style={{ height: `${v != null ? Math.max(6, v) : 0}%` }} /></i>
              <em>{t(sh)}</em>
            </span>
          );
        })}
      </span>
      <span className={"rk-grade " + (s ? gtone(s.n) : "")}>{s?.n ?? "–"}</span>
    </Link>
  );
}
export function RankSkeleton() {
  return <div className="rk-row rk-skel" aria-hidden="true"><span className="rk-pos" /><span className="rk-img" /><span className="rk-main"><i /><i /></span><span className="rk-bars" /><span className="rk-grade" /></div>;
}
export function ScoreHelp() {
  return <details className="rh-ranking-help"><summary>{t("How the score works")}</summary><p>{t("Every home on RealHunt passed our hand check, so the score starts at 70. The rest compares it with every other home on the site: price, price per m², sea and lakes, airport, space, move-in condition and extras. Higher bars are better. The list is sorted by score, best first, and changes every day as new homes come in.")}</p><p>{t("The score is not a valuation or a recommendation to buy. Check every detail with the seller.")}</p></details>;
}

// 7-oct-2026 (Carlos): a search with no homes never ends empty. "Nothing in Madrid yet" plus the
// best-scored homes closest to that place (score minus 1 point per 25 km, among the 30 nearest homes).
export function NearestHomes({ q }: { q: string }) {
  const [st, setSt] = useState<{ place: string; rows: any[] } | null>(null);
  const [miss, setMiss] = useState(false);
  useEffect(() => {
    let on = true; setSt(null); setMiss(false);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=en&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then(async (g: any[]) => {
        const p = g?.[0]; if (!p) { if (on) setMiss(true); return; }
        const { data } = await (supabase.rpc as any)("community_near", { p: { lat: Number(p.lat), lng: Number(p.lon), limit: 6 } });
        const place = String(p.name || p.display_name || q).split(",")[0];
        if (on) setSt({ place, rows: data?.rows || [] });
      }).catch(() => { if (on) setMiss(true); });
    return () => { on = false; };
  }, [q]);
  if (miss || (st && !st.rows.length)) return <section className="rk-near"><div className="rk-near-head"><strong>{`${t("No homes for")} “${q}” ${t("yet")}.`}</strong><small>{t("Try a country, a town or a simple word like sea, lake or cabin.")}</small></div></section>;
  if (!st) return null;
  return (
    <section className="rk-near">
      <div className="rk-near-head">
        <strong>{`${t("Nothing in")} ${st.place} ${t("yet")}.`}</strong>
        <small>{`${t("These are the best-scored homes closest to")} ${st.place}.`}</small>
      </div>
      <div className="rk-list">{st.rows.map((r, i) => <RankRow key={r.id} deal={r} pos={i + 1} km={r.km} near={st.place} />)}</div>
    </section>
  );
}

// 7-oct-2026 (Carlos): "live close to the city and work online". Homes about an hour from the big cities,
// for people who keep their city job remotely. Each card opens the search for that province.
const CITIES: [string, number, number][] = [["Madrid", 40.4168, -3.7038], ["Barcelona", 41.3874, 2.1686], ["Valencia", 39.4699, -0.3763]];
export function NearCity() {
  const [data, setData] = useState<Record<string, any[]>>({});
  useEffect(() => {
    let on = true;
    CITIES.forEach(([c, la, lo]) => (supabase.rpc as any)("community_near", { p: { lat: la, lng: lo, limit: 4 } })
      .then(({ data: d }: any) => { if (on) setData((x) => ({ ...x, [c]: (d?.rows || []).filter((r: any) => r.km <= 110) })); }).catch(() => {}));
    return () => { on = false; };
  }, []);
  const share = (c: string) => {
    const url = `${location.origin}/?q=${encodeURIComponent(c)}`;
    const text = `${t("Homes about an hour from")} ${c}. ${t("Keep your city job online and live with space, garden or pool.")}`;
    if ((navigator as any).share) (navigator as any).share({ title: "RealHunt", text, url }).catch(() => {});
    else navigator.clipboard?.writeText(`${text} ${url}`);
  };
  const ready = CITIES.filter(([c]) => data[c]?.length);
  if (!ready.length) return null;
  return (
    <section className="rh-near-city">
      <div className="rh-best-head"><strong>{t("Live an hour from the city, work online")}</strong><small>{t("Same salary, a house with a garden or a pool. Best-scored homes near each big city.")}</small></div>
      <div className="rh-nc-row">
        {ready.map(([c]) => {
          const rows = data[c]; const min = Math.min(...rows.map((r) => r.price_eur));
          return (
            <article key={c} className="rh-nc-card">
              <a href={`/?q=${encodeURIComponent(c)}`} className="rh-nc-imgs">{rows.slice(0, 3).map((r) => <img key={r.id} src={r.image_urls?.[0]} alt="" loading="lazy" />)}</a>
              <div className="rh-nc-body">
                <b>{`${t("Near")} ${c}`}</b>
                <small>{`${t("From")} ${money(min)} · ${t("best score")} ${Math.max(...rows.map((r) => r.nota || 0))}`}</small>
                <div className="rh-nc-actions"><a className="hunt-primary" href={`/?q=${encodeURIComponent(c)}`}>{t("See the homes")}</a><button type="button" className="hunt-link" onClick={() => share(c)}>{t("Share")}</button></div>
              </div>
            </article>
          );
        })}
      </div>
      <p className="hunt-fine">{t("Need a remote job first?")} <a href="https://jobersity.com" target="_blank" rel="noopener">{t("Jobersity finds remote jobs for you, free.")}</a></p>
    </section>
  );
}
