// 11-oct-2026 (Carlos): "too much stuff before the homes". The home page now opens straight onto big photo
// cards: the photo, the price, the score. Everything else (vibes, near the city, best per country) comes
// after the first homes, never before.
import { Link } from "react-router-dom";
import { money } from "./api";
import { useScore } from "./scores";
import { t } from "./i18n";
import { SaveHeart } from "./v4";
import { thumb, onThumbError } from "@/lib/thumbs";
import { CardCheck } from "./check";
import { CompareToggle } from "./compareTools";
import { Sparkles } from "lucide-react";
import { FLAG_LABEL } from "../../supabase/functions/realhunt-live-search/flags";
import "./aicheck.css";

const gtone = (n: number) => (n >= 90 ? "is-top" : n >= 80 ? "is-great" : "is-good");
const isNew = (d: any) => { const at = d.approved_at || d.publish_at; return !!at && Date.now() - new Date(at).getTime() < 36 * 3600 * 1000; };
const where = (d: any) => (d.location_name && d.country && !String(d.location_name).includes(d.country) ? `${d.location_name}, ${d.country}` : d.location_name || d.country || "");

/**
 * 8-nov-2026 (live search v2): homes the live search's AI check published carry ai_checked / ai_checked_at /
 * why_cheap / ai_flags, and the card says so ("AI-checked, not yet by a person", why it is cheap, 55+...). Normal
 * homes have none of these, so they look exactly as before. Optional props, only for live results:
 *   href      an external link instead of /deal/<slug> (rentals, which have no RealHunt page), opened in a new tab
 *   origPrice the listing's own price when it is not in euros ("$350,000"), shown next to the € price
 *   rent      the price is per month
 */
export function HomeCard({ deal, pos, href: ext, origPrice, rent }: { deal: any; pos: number; href?: string; origPrice?: string; rent?: boolean }) {
  const s = useScore(deal);
  const href = ext || `/deal/${encodeURIComponent(deal.slug)}?tab=all`;
  const img = deal.image_urls?.[0];
  const title = String(deal.title || "").replace(/\s+/g, " ").trim();
  const perSqm = deal.sqm && deal.price_eur ? Math.round(deal.price_eur / deal.sqm) : null;
  const pick = String(deal.pick_note || "").trim();
  const ai = !!deal.ai_checked;
  const cheap = String(deal.why_cheap || "").trim();
  const flags: string[] = Array.isArray(deal.ai_flags) ? deal.ai_flags.filter((f: string) => FLAG_LABEL[f]) : [];
  const label = `${pos}. ${title}, ${money(deal.price_eur)}${rent ? " " + t("a month") : ""}${s ? `, ${t("RealHunt score")} ${s.n}` : ""}${ai ? `, ${t("AI-checked, not yet by a person")}` : ""}`;
  const Tag: any = ext ? "a" : Link;
  const linkProps = ext ? { href: ext, target: "_blank", rel: "noopener nofollow" } : { to: href };
  return (
    <div className="hx-wrap">
      <Tag {...linkProps} className={"hx-card" + (pos <= 3 ? " is-podium" : "")} aria-label={label}>
        <span className="hx-img">
          {img ? <img src={thumb(img)} alt={`${title}, ${where(deal)}`} width={480} height={360} loading={pos <= 3 ? "eager" : "lazy"} fetchPriority={pos === 1 ? "high" : "auto"} decoding="async" onError={(e) => onThumbError(e.currentTarget, img)} /> : null}
          <span className="hx-pos">#{pos}</span>
          {isNew(deal) ? <span className="hx-new">{t("New today")}</span> : Number(deal.price_drop) > 0 ? <span className="hx-new is-drop">{t("Price dropped")}</span> : null}
          {s && <span className={"hx-score " + gtone(s.n)} title={t("RealHunt score")}>{s.n}</span>}
          <span className="hx-price">
            <b>{money(deal.price_eur)}{rent && <span className="hx-mo"> {t("a month")}</span>}</b>
            {origPrice && <small className="hx-orig">{origPrice}</small>}
            {deal.sqm || deal.bedrooms ? <small>{[deal.sqm ? `${deal.sqm} m²` : "", perSqm && !rent ? `${money(perSqm)}/m²` : "", deal.bedrooms ? `${deal.bedrooms} ${deal.bedrooms === 1 ? "bed" : "beds"}` : ""].filter(Boolean).join(" · ")}</small> : null}
          </span>
        </span>
        <span className="hx-text">
          <strong>{title}</strong>
          <small>{where(deal)}</small>
          <CardCheck d={deal} />
          {pick && <small className="hx-pick">{pick}</small>}
          {(ai || flags.length > 0) && <span className="hx-ai">{ai && <span className="hx-ai-badge"><Sparkles size={12} aria-hidden="true" />{t("AI-checked, not yet by a person")}</span>}{flags.map((f) => <span key={f} className="hx-ai-flag">{t(FLAG_LABEL[f])}</span>)}</span>}
          {cheap && <small className="hx-cheap"><b>{t("Why so cheap:")}</b> {cheap}</small>}
          {/* TaxLine dropped 8-nov-2026: the CHECK all-in line (destinations.json) replaces it */}
        </span>
      </Tag>
      {!ext && <SaveHeart deal={deal} className="hv-save hx-save" />}
      {!ext && <CompareToggle deal={deal} />}
    </div>
  );
}

export function HomeCardSkeleton() {
  return <div className="hx-card hx-skel" aria-hidden="true"><span className="hx-img" /><span className="hx-text"><i /><i /></span></div>;
}
