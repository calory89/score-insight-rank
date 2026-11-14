// "Who writes this" line under research posts and buying guides (14-nov-2026). The prerendered pages carry the same
// text (seo/assetsTrust.ts, BYLINE): keep the two in step. Only statements the About page already makes.
import { Link } from "react-router-dom";
import { t } from "./i18n";

export function Byline({ kind }: { kind: "blog" | "guide" }) {
  return (
    <p className="hv-post-note" data-rhx-by>
      <b>{t("Who writes this.")}</b>{" "}
      {t("RealHunt Research is the name RealHunt publishes its own studies and guides under; RealHunt is run by Equinox Investment Group LLC, founded by Carlos de Ory Gordillo.")}{" "}
      {kind === "blog" ? t("Prices and counts come from the homes listed on RealHunt on the date shown.") : t("Rules, taxes and costs are compiled from the sources listed on this page; prices come from the homes listed on RealHunt.")}{" "}
      {t("General information, not legal or tax advice.")}{" "}
      <Link className="hunt-link" to="/editorial-policy">{t("Editorial policy and corrections")}</Link> · <Link className="hunt-link" to="/method">{t("How the score works")}</Link> · <Link className="hunt-link" to="/about">{t("Who we are")}</Link>
    </p>
  );
}
