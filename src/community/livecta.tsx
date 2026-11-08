// Entry points to the live web search (8-nov-2026). Small on purpose: the page itself (livesearch.tsx) is lazy.
import { Link } from "react-router-dom";
import { ArrowRight, Globe } from "lucide-react";
import { t } from "./i18n";
import "./livecta.css";

export const liveHref = (q: string) => "/live-search?q=" + encodeURIComponent(q.trim());

/** "Search the whole web for this": shown on the feed when a search finds fewer than 6 homes. */
export function LiveSearchCard({ q }: { q: string }) {
  if (!q.trim()) return null;
  return (
    <Link to={liveHref(q)} className="lv-cta">
      <span className="lv-cta-icon" aria-hidden="true"><Globe size={22} /></span>
      <span className="lv-cta-main"><strong>{t("Search the whole web for this")}</strong><small>{t("We look at estate agents and portals now and show only homes that score 80 or more:")} “{q.trim()}”</small></span>
      <ArrowRight size={20} aria-hidden="true" />
    </Link>
  );
}
