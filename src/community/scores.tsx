// RealHunt score (7-oct-2026): every home gets a grade from 70 to 98 plus 10 sub-scores from 0 to 100,
// like Nomad List. 70 is the floor because every home on RealHunt already passed our hand check;
// the rest compares it with every other home on the site. Data: community_scores() / community_feed.
import { useEffect, useState } from "react";
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
  ["interest", "Buyer interest", "Views, saves and votes from RealHunt buyers"],
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
