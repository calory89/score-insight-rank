// "Filter and sort" button on the /homes/<country> pages (shown on phones only, see mobile-ux.css): opens the main
// feed for that country with the filter sheet open (#filters). Kept apart from mobile-ux.tsx to avoid an import cycle.
import { Link } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { t } from "./i18n";

export function HomesFilterLink({ country, max }: { country: string; max?: number }) {
  const q = new URLSearchParams({ country, ...(max ? { price: String(max) } : {}) });
  return <Link className="hunt-mapfilters rh-mf-open rh-homes-filter" to={`/?${q}#filters`}><SlidersHorizontal size={15} /> {t("Filter and sort these homes")}</Link>;
}

