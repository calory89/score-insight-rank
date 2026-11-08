// Running costs of a home (7-nov-2026, Carlos: "que aparezcan grandes si hay cuota de comunidad HOA... muchas
// casas son baratas, pero luego es muy caro"). The community / HOA fee and property tax come from the listing
// (columns hoa_monthly, hoa_currency, hoa_unknown, tax_annual, costs_note). A flat whose listing does not state
// the fee says so plainly instead of looking free.
import { t } from "./i18n";
import { isEs } from "@/lib/lang";

type D = { hoa_monthly?: number | string | null; hoa_currency?: string | null; hoa_unknown?: boolean | null; tax_annual?: number | string | null; costs_note?: string | null };
const n = (v: unknown) => (v == null || v === "" ? null : Number(v));
// Spanish site: "124 US$", "9.000 €" (8-nov-2026).
export const fmt = (v: number, cur?: string | null) => new Intl.NumberFormat(isEs() ? "es-ES" : "en", { style: "currency", currency: cur || "EUR", maximumFractionDigits: 0 }).format(v);

/** Big line on cards: "+ $1,073 / month HOA" or "HOA fee not stated". Nothing when we know nothing. */
export function CostBadge({ d }: { d: D }) {
  const hoa = n(d.hoa_monthly);
  if (hoa && hoa > 0) return <div className="rh-cost is-fee"><b>+ {fmt(hoa, d.hoa_currency)}</b> {t("/ month community fee (HOA)")}</div>;
  if (d.hoa_unknown) return <div className="rh-cost is-unknown">{t("Community fee (HOA) not stated: ask before you visit")}</div>;
  return null;
}

/** Block on the home page: monthly fee, property tax, total per month, and what the fee includes. */
export function RunningCosts({ d }: { d: D }) {
  const hoa = n(d.hoa_monthly), tax = n(d.tax_annual);
  if (!hoa && !tax && !d.hoa_unknown) return null;
  const cur = d.hoa_currency;
  const taxM = tax ? tax / 12 : 0;
  return (
    <section className={"rh-costs" + (d.hoa_unknown ? " is-unknown" : "")} aria-label={t("Monthly running costs")}>
      <h2>{t("What it costs every month")}</h2>
      <dl>
        <div><dt>{t("Community fee (HOA)")}</dt><dd>{hoa ? <>{fmt(hoa, cur)} / {t("month")}</> : d.hoa_unknown ? t("Not stated in the listing") : "-"}</dd></div>
        {tax ? <div><dt>{t("Property tax")}</dt><dd>{fmt(taxM, cur)} / {t("month")} <small>({fmt(tax, cur)} / {t("year")})</small></dd></div> : null}
        {hoa || taxM ? <div className="rh-costs-total"><dt>{t("Total before insurance and utilities")}</dt><dd>{d.hoa_unknown && !hoa ? `${fmt(taxM, cur)} + ${t("HOA")}` : fmt((hoa || 0) + taxM, cur)} / {t("month")}</dd></div> : null}
      </dl>
      {d.costs_note && <p>{d.costs_note}</p>}
      {d.hoa_unknown && <p className="rh-costs-warn">{t("Flats in this area usually pay a monthly community fee, sometimes over $1,000, plus possible special assessments for building works. Ask the agent for the exact fee and any pending assessment before you make an offer.")}</p>}
    </section>
  );
}
