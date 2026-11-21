// 11-oct-2026 (Carlos): "too much stuff before the homes". The home page now opens straight onto big photo
// cards: the photo, the price, the score. Everything else (vibes, near the city, best per country) comes
// after the first homes, never before.
import { Link } from "react-router-dom";
import { money } from "./api";
import { useScore } from "./scores";
import { getLang, t } from "./i18n";
import { SaveHeart, prefetchDetail, preloadImages } from "./v4";
import { useCommunity } from "./ctx";
import { GroupBadge } from "./n10/inline";
import { thumb, onThumbError, cardSrcSet, CARD_SIZES } from "@/lib/thumbs";
import { CardCheck } from "./check";
import { CompareToggle } from "./compareTools";
import { Sparkles } from "lucide-react";
import { FLAG_LABEL } from "../../supabase/functions/realhunt-live-search/flags";
import { isGone } from "./n9/status";
import { costsNotStated, NOT_STATED_LABEL } from "./priceLogic";
import "./aicheck.css";

/** "1.2 km" for "1.2 km from the centre" (live search v4 sends distance_to_centre_km). The number and the words are
 *  separate text nodes, so the Spanish site shows "1,2 km del centro". */
export function kmFromCentre(km: number, lang: string = getLang()): string {
  const v = km < 10 ? Math.round(km * 10) / 10 : Math.round(km);
  return `${new Intl.NumberFormat(lang === "es" ? "es-ES" : "en", { maximumFractionDigits: 1 }).format(v)} km`;
}
const gtone = (n: number) => (n >= 90 ? "is-top" : n >= 80 ? "is-great" : "is-good");
const isNew = (d: any) => { const at = d.approved_at || d.publish_at; return !!at && Date.now() - new Date(at).getTime() < 36 * 3600 * 1000; };
const where = (d: any) => (d.location_name && d.country && !String(d.location_name).includes(d.country) ? `${d.location_name}, ${d.country}` : d.location_name || d.country || "");

/**
 * 8-nov-2026 (live search v2): homes the live search's AI check published carry ai_checked / ai_checked_at /
 * why_cheap / ai_flags, and the card says so ("AI-checked, not yet by a person", why it is cheap, 55+...). Normal
 * homes have none of these, so they look exactly as before. Optional props, only for live results:
 *   href      an external link instead of /deal/<slug> (rentals, which have no RealHunt page), opened in a new tab
 *   origPrice the listing's own price when it is not in euros ("$350,000"): only in the card's accessible name,
 *             never printed (8-nov-2026, Carlos: one price per card; the home page shows both, labelled)
 *   rent      the price is per month
 *   dist      km from the city centre (live search v4), shown as one quiet fact
 * Minimal pass (8-nov-2026): one price, one line of facts (m² · beds), title, place, at most two small badges.
 */
export function HomeCard({ deal, pos, href: ext, origPrice, rent, dist, noRank }: { deal: any; pos: number; href?: string; origPrice?: string; rent?: boolean; dist?: number | null; noRank?: boolean }) {
  const s = useScore(deal);
  const { call } = useCommunity() || {};
  const href = ext || `/deal/${encodeURIComponent(deal.slug)}?tab=all`;
  const img = deal.image_urls?.[0];
  const title = String(deal.title || "").replace(/\s+/g, " ").trim();
  const pick = String(deal.pick_note || "").trim();
  const ai = !!deal.ai_checked;
  const cheap = String(deal.why_cheap || "").trim();
  const flags: string[] = Array.isArray(deal.ai_flags) ? deal.ai_flags.filter((f: string) => FLAG_LABEL[f]) : [];
  const label = `${pos}. ${title}, ${money(deal.price_eur)}${origPrice ? ` (${origPrice})` : ""}${rent ? " " + t("a month") : ""}${s ? `, ${t("RealHunt score")} ${s.n}` : ""}${ai ? `, ${t("AI-checked, not yet by a person")}` : ""}`;
  const Tag: any = ext ? "a" : Link;
  const linkProps = ext ? { href: ext, target: "_blank", rel: "noopener nofollow" } : { to: href };
  // 21-nov-2026 (list2 63): the home's record and first photo are fetched when a finger or the mouse rests on the card
  const warm = ext ? undefined : () => { prefetchDetail(deal.slug, call); preloadImages((deal.image_urls || []).slice(0, 1)); };
  return (
    <div className="hx-wrap" onMouseEnter={warm} onTouchStart={warm} onFocus={warm}>
      <Tag {...linkProps} className={"hx-card" + (pos <= 3 && !noRank ? " is-podium" : "")} aria-label={label}>
        <span className="hx-img">
          {img ? <img src={thumb(img)} srcSet={cardSrcSet(img)} sizes={cardSrcSet(img) ? CARD_SIZES : undefined} alt={`${title}, ${where(deal)}`} width={480} height={360} loading={pos <= 3 ? "eager" : "lazy"} fetchPriority={pos === 1 ? "high" : "auto"} decoding="async" onError={(e) => onThumbError(e.currentTarget, img)} /> : null}
          {!noRank && <span className="hx-pos">#{pos}</span>}
          {isGone(deal) ? <span className="hx-new is-gone">{t("Advert gone")}</span> : isNew(deal) && !ai ? <span className="hx-new">{t("New today")}</span> : Number(deal.price_drop) > 0 ? <span className="hx-new is-drop">{t("Price dropped")}</span> : null}
          {s && <span className={"hx-score " + gtone(s.n)} title={t("RealHunt score")}>{s.n}</span>}
          <span className="hx-price">
            <b>{money(deal.price_eur)}{rent && <span className="hx-mo"> {t("a month")}</span>}</b>
            {deal.sqm || deal.bedrooms ? <small>{[deal.sqm ? `${deal.sqm} m²` : "", deal.bedrooms ? `${deal.bedrooms} ${deal.bedrooms === 1 ? "bed" : "beds"}` : ""].filter(Boolean).join(" · ")}</small> : null}
          </span>
        </span>
        <span className="hx-text">
          <strong>{title}</strong>
          <small>{where(deal)}</small>
          <GroupBadge d={deal} compact />
          {/* 21-nov-2026 (list 2 idea 75): a fee or yearly tax the advert does not give is "not stated", never a silent zero */}
          {!rent && costsNotStated(deal) && <small className="hx-costs">{t(NOT_STATED_LABEL[costsNotStated(deal)!])}</small>}
          {dist != null && dist >= 0 && <small className="hx-dist"><span>{kmFromCentre(dist)}</span> <span>{t("from the centre")}</span></small>}
          <CardCheck d={deal} />
          {pick && <small className="hx-pick">{pick}</small>}
          {(ai || flags.length > 0) && <span className="hx-ai">{ai && <span className="hx-ai-badge" title={t("AI-checked, not yet by a person")}><Sparkles size={12} aria-hidden="true" />{t("AI-checked")}</span>}{flags.slice(0, 1).map((f) => <span key={f} className="hx-ai-flag">{t(FLAG_LABEL[f])}</span>)}</span>}
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
