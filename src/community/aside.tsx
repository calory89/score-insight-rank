// Desktop only (CSS hides it under 1100px, where the fixed bottom bar does the same job): a sticky card
// beside the home's text with the price, the score and the main actions, so they stay in view while the
// visitor reads the score, taxes and map below.
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { money } from "./api";
import type { Row } from "./extras";
import { ScoreBadge } from "./scores";
import { SaveHeart, ShareButton } from "./v4";
import { t } from "./i18n";
import DEST from "@/data/destinations.json";

// Countries with a /costs page (src/data/destinations.json).
const COSTS = new Set(Object.keys(DEST).filter((k) => k !== "_meta"));

export function DetailAside({ deal, listing }: { deal: Row; listing: ReactNode }) {
  const country = deal.country || "";
  const slug = country.toLowerCase().replace(/ /g, "-");
  const perSqm = deal.sqm && deal.price_eur ? Math.round(deal.price_eur / deal.sqm) : null;
  return (
    <aside className="hv-aside" aria-label={t("Summary of this home")}>
      <div className="hv-aside-card">
        <div className="hv-aside-top">
          <div>
            <strong className="hv-aside-price">{money(deal.price_eur)}</strong>
            <small>{[deal.sqm ? `${deal.sqm} m²` : "", perSqm ? `${money(perSqm)}/m²` : "", (deal as any).bedrooms ? `${(deal as any).bedrooms} ${t("bedrooms")}` : ""].filter(Boolean).join(" · ")}</small>
          </div>
          <ScoreBadge deal={deal} />
        </div>
        <p className="hv-aside-where">{deal.location_name || deal.country}</p>
        <div className="hv-aside-cta">{listing}</div>
        <div className="hv-aside-row">
          <SaveHeart deal={deal as any} className="hunt-save hv-save-inline" />
          <ShareButton deal={deal} label />
        </div>
        {country && (
          <Link className="hv-aside-alert" to={`/alerts?country=${encodeURIComponent(country)}${deal.price_eur ? `&max=${Math.ceil(deal.price_eur / 20000) * 20000}` : ""}`}>
            <Bell size={15} /> {t("Get new homes like this by email")}
          </Link>
        )}
        <div className="hv-aside-links">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${deal.title} · ${money(deal.price_eur)} https://realhunt.co/deal/${deal.slug}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a href={`mailto:?subject=${encodeURIComponent(`${deal.title} · ${money(deal.price_eur)}`)}&body=${encodeURIComponent(`https://realhunt.co/deal/${deal.slug}`)}`}>{t("Email")}</a>
          {(deal as any).lat != null && (deal as any).lng != null && <a href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${(deal as any).lat},${(deal as any).lng}`} target="_blank" rel="noopener noreferrer nofollow">{t("Street View (approximate)")}</a>}
          {COSTS.has(slug) && <Link to={`/costs/${slug}`}>{t("Buying costs in")} {deal.country}</Link>}
        </div>
        <p className="hv-aside-fine">{t("RealHunt is not the seller. The listing opens on the original site.")} <Link to="/blog/property-scams-buying-abroad">{t("How to avoid scams")}</Link> · <Link to="/blog/viewing-checklist-cheap-house">{t("Viewing checklist")}</Link></p>
      </div>
    </aside>
  );
}
