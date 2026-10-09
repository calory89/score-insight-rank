// 9-oct-2026 (Carlos): pages fed by the RealHunt Score extension.
//   /best                 every city where extension users have looked at homes
//   /best/:cc/:city       top 10 homes in a city right now, ranked by price per m² against the city and the RealHunt score
//   /ranking/:id          a whole search ranked by a user and shared from the extension
//   /homes-compare/:id    2 to 4 homes side by side, sent from the extension
// Data comes from public read-only RPCs (ext_city_top, ext_city_list, ext_ranking_get). No credits, no edge functions.
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import "./best.css";

const db = supabase as any;
const EXT = "/extension?utm_source=best";
type Item = { url: string; portal: string; price: number; currency?: string; cur?: string; sqm: number | null; rooms: number | null; ppsqm?: number; pct: number | null; area: string | null; rh?: number; score?: number | null; last_seen?: string };

const SYM: Record<string, string> = { EUR: "€", GBP: "£", USD: "$" };
const money = (n: number | null | undefined, c?: string) => {
  if (n == null || !isFinite(n)) return "—";
  const cur = c || "EUR";
  if (SYM[cur]) return SYM[cur] + Math.round(n).toLocaleString("en-GB");
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n); } catch { return Math.round(n).toLocaleString("en-GB") + " " + cur; }
};
const color = (s: number) => (s >= 75 ? "#0F6B34" : s >= 60 ? "#2E9E5B" : s >= 45 ? "#D39B12" : "#C2412D");
const portal = (p: string) => String(p || "").replace(/^www\./, "");
const FLAG: Record<string, string> = { ES: "🇪🇸", PT: "🇵🇹", IT: "🇮🇹", FR: "🇫🇷", DE: "🇩🇪", GB: "🇬🇧", DK: "🇩🇰", NL: "🇳🇱", US: "🇺🇸", SE: "🇸🇪", NO: "🇳🇴", AT: "🇦🇹", CH: "🇨🇭", BE: "🇧🇪", IE: "🇮🇪" };
function meta(title: string, desc: string) {
  document.title = title;
  let m = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
  if (!m) { m = document.createElement("meta"); m.name = "description"; document.head.appendChild(m); }
  m.content = desc;
}

function ExtCta({ city }: { city?: string }) {
  return (
    <div className="bx-cta">
      <div>
        <b>Score any home on any property site, free</b>
        <span>{city ? `Rank every home for sale in ${city} by price per m², location and red flags in one click.` : "Rank a whole search by price per m², location and red flags in one click."} 160 property sites in 50 countries.</span>
      </div>
      <Link className="hunt-primary" to={EXT}>Get the free extension</Link>
    </div>
  );
}

function Row({ it, i, cur }: { it: Item; i: number; cur?: string }) {
  const s = it.rh ?? it.score ?? null;
  const c = it.currency || it.cur || cur;
  return (
    <a className="bx-row" href={it.url} target="_blank" rel="noopener nofollow">
      <span className="bx-n">{i + 1}</span>
      {s != null ? <span className="bx-s" style={{ background: color(s) }}>{s}</span> : <span className="bx-s bx-s0">–</span>}
      <span className="bx-d">
        <b>{money(it.price, c)}</b>
        {it.sqm ? <> · {Math.round(it.sqm)} m²</> : null}
        {it.rooms ? <> · {it.rooms} rooms</> : null}
        {it.pct != null && Math.abs(it.pct) >= 3 ? <i className={it.pct < 0 ? "bx-good" : "bx-bad"}>{it.pct < 0 ? "−" : "+"}{Math.abs(it.pct)}% /m²</i> : null}
        <small>{[it.area, portal(it.portal), it.ppsqm ? money(it.ppsqm, c) + "/m²" : ""].filter(Boolean).join(" · ")}</small>
      </span>
      <span className="bx-go">View ↗</span>
    </a>
  );
}

export function BestCityPage({ cc, city }: { cc: string; city: string }) {
  const [d, setD] = useState<any>(null);
  const [near, setNear] = useState<any[]>([]);
  useEffect(() => {
    setD(null);
    db.rpc("ext_city_top", { p_cc: cc, p_slug: city, p_limit: 10 }).then(({ data }: any) => setD(data || { error: "x" }));
    db.rpc("ext_city_list", { p_cc: cc }).then(({ data }: any) => setNear((data || []).filter((x: any) => x.slug !== city).slice(0, 12)));
  }, [cc, city]);
  const name = d && d.city ? d.city.name : city.replace(/-/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
  useEffect(() => {
    meta(`Top 10 homes for sale in ${name} right now · RealHunt`, `The 10 best-value homes for sale in ${name} today, ranked by price per m² against the city median and the RealHunt Score. Updated from real listings.`);
  }, [name]);
  const cur = d && d.items && d.items[0] ? d.items[0].currency : undefined;
  const ld = useMemo(() => d && d.items ? JSON.stringify({ "@context": "https://schema.org", "@type": "ItemList", name: `Top homes for sale in ${name}`, itemListElement: d.items.map((x: Item, i: number) => ({ "@type": "ListItem", position: i + 1, url: x.url })) }) : "", [d, name]);
  return (
    <div className="hunt-wrap bx-page">
      <p className="bx-crumb"><Link to="/best">Best homes by city</Link> · {FLAG[cc.toUpperCase()] || ""} {cc.toUpperCase()}</p>
      <h1>Top 10 homes for sale in {name}</h1>
      <p className="bx-lead">Ranked by price per m² against the rest of {name} and the RealHunt Score. Built from the listings that RealHunt Score users open, so it changes every day.</p>
      {d && d.median ? <div className="bx-stats"><div><b>{money(d.median, cur)}</b><span>median per m²</span></div><div><b>{d.n}</b><span>homes seen in 120 days</span></div><div><b>{d.items.length}</b><span>in this top</span></div></div> : null}
      {!d ? <div className="bx-skel">{Array.from({ length: 6 }).map((_, i) => <i key={i} />)}</div>
        : d.items && d.items.length ? <div className="bx-list">{d.items.map((it: Item, i: number) => <Row key={it.url} it={it} i={i} cur={cur} />)}</div>
        : <div className="bx-empty"><b>We're still collecting homes in {name}.</b><span>Install the free extension and open any property site in {name}: your search builds this page, and you'll see every home ranked on the spot.</span></div>}
      {ld ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} /> : null}
      <ExtCta city={name} />
      {near.length ? <><h2 className="bx-h2">More cities</h2><div className="bx-cities">{near.map((c) => <Link key={c.slug} to={`/best/${c.cc.toLowerCase()}/${c.slug}`}>{c.name}<small>{c.n} homes</small></Link>)}</div></> : null}
      <p className="hunt-fine">Prices and sizes as published by each property site when a RealHunt Score user saw them. An estimate, not an appraisal. Always check the listing.</p>
    </div>
  );
}

export function BestIndexPage() {
  const [list, setList] = useState<any[] | null>(null);
  useEffect(() => { meta("Best homes for sale by city · RealHunt", "Top 10 best-value homes for sale in every city, ranked by price per m² and the RealHunt Score."); db.rpc("ext_city_list", { p_cc: null }).then(({ data }: any) => setList(data || [])); }, []);
  const by = useMemo(() => { const m: Record<string, any[]> = {}; for (const c of list || []) (m[c.cc] = m[c.cc] || []).push(c); return Object.entries(m).sort((a, b) => b[1].length - a[1].length); }, [list]);
  return (
    <div className="hunt-wrap bx-page">
      <h1>Best homes for sale, city by city</h1>
      <p className="bx-lead">Each city has a live top 10, ranked by price per m² against the city and the RealHunt Score.</p>
      {!list ? <div className="bx-skel">{Array.from({ length: 6 }).map((_, i) => <i key={i} />)}</div>
        : !list.length ? <div className="bx-empty"><b>The first cities are being built right now.</b><span>Install the extension and open a property site: your city appears here.</span></div>
        : by.map(([cc, cs]) => <div key={cc}><h2 className="bx-h2">{FLAG[cc] || ""} {cc}</h2><div className="bx-cities">{cs.map((c) => <Link key={c.slug} to={`/best/${cc.toLowerCase()}/${c.slug}`}>{c.name}<small>{c.n} homes · {money(c.median, c.currency)}/m²</small></Link>)}</div></div>)}
      <ExtCta />
    </div>
  );
}

export function SharedRankingPage({ id, compare }: { id: string; compare?: boolean }) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { db.rpc("ext_ranking_get", { p_id: id }).then(({ data }: any) => setD(data || { error: "x" })); }, [id]);
  useEffect(() => { if (d && !d.error) meta(`${compare ? "Homes compared" : "Ranked search"}${d.city ? " in " + d.city : ""} · RealHunt`, `${d.n} homes ${compare ? "side by side" : "ranked by the RealHunt Score"}${d.city ? " in " + d.city : ""}.`); }, [d, compare]);
  if (!d) return <div className="hunt-wrap bx-page"><div className="bx-skel">{Array.from({ length: 6 }).map((_, i) => <i key={i} />)}</div></div>;
  if (d.error) return <div className="hunt-wrap bx-page"><h1>Not found</h1><p>This link has expired or never existed. <Link to="/best">See the best homes by city</Link></p></div>;
  const items: Item[] = d.items || [];
  if (compare) {
    const rows: [string, (x: Item) => any][] = [["RealHunt Score", (x) => x.score ?? "–"], ["Price", (x) => money(x.price, x.cur)], ["Size", (x) => (x.sqm ? Math.round(x.sqm) + " m²" : "–")], ["Price per m²", (x) => (x.price && x.sqm ? money(x.price / x.sqm, x.cur) : "–")], ["Rooms", (x) => x.rooms ?? "–"], ["Vs similar homes", (x) => (x.pct != null ? (x.pct > 0 ? "+" : "") + x.pct + "%" : "–")], ["Area", (x) => x.area || "–"], ["Site", (x) => portal(x.portal)]];
    const best = items.reduce((a, x) => ((x.score ?? 0) > (a.score ?? 0) ? x : a), items[0]);
    return (
      <div className="hunt-wrap bx-page">
        <h1>{items.length} homes side by side</h1>
        <p className="bx-lead">Best score: <b>{money(best.price, best.cur)}{best.sqm ? ` · ${Math.round(best.sqm)} m²` : ""}</b> ({best.score}).</p>
        <div className="bx-cmp"><table><tbody>{rows.map(([k, f]) => <tr key={k}><th>{k}</th>{items.map((x) => <td key={x.url} className={x === best ? "bx-win" : ""}>{f(x)}</td>)}</tr>)}
          <tr><th></th>{items.map((x) => <td key={x.url}><a href={x.url} target="_blank" rel="noopener nofollow">View ↗</a></td>)}</tr></tbody></table></div>
        <ExtCta />
      </div>
    );
  }
  return (
    <div className="hunt-wrap bx-page">
      <h1>{d.title || "A whole search, ranked"}</h1>
      <p className="bx-lead">{d.n} homes{d.city ? ` in ${d.city}` : ""}, ranked by the RealHunt Score on {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}.{d.src ? <> <a href={d.src} target="_blank" rel="noopener nofollow">Original search ↗</a></> : null}</p>
      <div className="bx-list">{items.map((it, i) => <Row key={it.url + i} it={it} i={i} />)}</div>
      <ExtCta city={d.city || undefined} />
    </div>
  );
}

export default function BestRoute() {
  const { pathname } = useLocation();
  const p = pathname.split("/").filter(Boolean);
  if (p[0] === "ranking" && p[1]) return <SharedRankingPage id={p[1]} />;
  if (p[0] === "homes-compare" && p[1]) return <SharedRankingPage id={p[1]} compare />;
  if (p[0] === "best" && p[1] && p[2]) return <BestCityPage cc={p[1]} city={p[2]} />;
  return <BestIndexPage />;
}
