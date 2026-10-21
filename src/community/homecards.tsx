// 11-oct-2026 (Carlos): "too much stuff before the homes". The home page now opens straight onto big photo
// cards: the photo, the price, the score. Everything else (vibes, near the city, best per country) comes
// after the first homes, never before.
import { Link } from "react-router-dom";
import { money } from "./api";
import { useScore } from "./scores";
import { t } from "./i18n";
import { TaxLine } from "./taxes";

const gtone = (n: number) => (n >= 90 ? "is-top" : n >= 80 ? "is-great" : "is-good");
const isNew = (d: any) => { const at = d.approved_at || d.publish_at; return !!at && Date.now() - new Date(at).getTime() < 36 * 3600 * 1000; };
const where = (d: any) => (d.location_name && d.country && !String(d.location_name).includes(d.country) ? `${d.location_name}, ${d.country}` : d.location_name || d.country || "");

export function HomeCard({ deal, pos }: { deal: any; pos: number }) {
  const s = useScore(deal);
  const href = `/deal/${encodeURIComponent(deal.slug)}?tab=all`;
  const img = deal.image_urls?.[0];
  const title = String(deal.title || "").replace(/\s+/g, " ").trim();
  return (
    <Link to={href} className={"hx-card" + (pos <= 3 ? " is-podium" : "")} aria-label={`${pos}. ${title}, ${money(deal.price_eur)}${s ? `, ${t("RealHunt score")} ${s.n}` : ""}`}>
      <span className="hx-img">
        {img ? <img src={img} alt="" loading={pos <= 3 ? "eager" : "lazy"} fetchPriority={pos === 1 ? "high" : "auto"} decoding="async" /> : null}
        <span className="hx-pos">#{pos}</span>
        {s && <span className={"hx-score " + gtone(s.n)} title={t("RealHunt score")}>{s.n}</span>}
        <span className="hx-price">
          <b>{money(deal.price_eur)}</b>
          {deal.sqm || deal.bedrooms ? <small>{[deal.sqm ? `${deal.sqm} m²` : "", deal.bedrooms ? `${deal.bedrooms} 🛏` : ""].filter(Boolean).join(" · ")}</small> : null}
        </span>
        {isNew(deal) && <span className="hx-new">{t("New today")}</span>}
      </span>
      <span className="hx-text">
        <strong>{title}</strong>
        <small>{where(deal)}</small>
        <TaxLine deal={deal} />
      </span>
    </Link>
  );
}

export function HomeCardSkeleton() {
  return <div className="hx-card hx-skel" aria-hidden="true"><span className="hx-img" /><span className="hx-text"><i /><i /></span></div>;
}
