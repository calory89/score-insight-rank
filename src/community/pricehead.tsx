// The price block at the top of a home page (8-nov-2026, minimal pass). One big asking price, then each other
// number with its own label, and one quiet line for €/m² and the visitor's currency. Logic in ./priceLogic (tested).
// Replaces, in this spot: CostBadge (big orange fee line), LocalPrice and PerSqmVsCountry, which printed €/m² twice.
import { useEffect, useState } from "react";
import { money } from "./api";
import { fmt } from "./costs";
import { t } from "./i18n";
import { RentLine } from "./v6";
import { countryMedians } from "./oct24";
import { rates, visitorCurrency } from "./extras";
import { priceSummary, vsMedian, MONTHLY_LABEL } from "./priceLogic";
import type { CheckRow } from "./checkLogic";

function useLocalCurrency(eur: number | null | undefined): string {
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const ccy = visitorCurrency();
    if (!eur || !ccy) return;
    let on = true;
    rates().then((r) => {
      if (!on || !r || !r[ccy]) return;
      setTxt("≈ " + new Intl.NumberFormat(navigator.language, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(eur * r[ccy]));
    });
    return () => { on = false; };
  }, [eur]);
  return txt;
}

export function PriceHead({ d }: { d: CheckRow & { sqm?: number | null } }) {
  const s = priceSummary(d);
  const [median, setMedian] = useState<number | null>(null);
  useEffect(() => { let on = true; if (d.country) countryMedians().then((m) => { if (on) setMedian(m[d.country as string] || null); }); return () => { on = false; }; }, [d.country]);
  const local = useLocalCurrency(d.price_eur);
  const per = d.price_eur && d.sqm ? Math.round(d.price_eur / d.sqm) : null;
  const vs = vsMedian(d.price_eur, d.sqm, median, d.country);
  if (d.price_eur == null) return null;
  return (
    <div className="rh-ph">
      <div className="hunt-price" aria-label={`${t("Asking price")} ${money(d.price_eur)}`}>{money(d.price_eur)}</div>
      {(s.total != null || s.monthly != null || s.feeUnknown) && (
        <dl className="rh-ph-lines">
          {s.total != null && <div><dt>{t("Total with buying costs")}</dt><dd>≈ {money(s.total)}</dd></div>}
          {s.monthly != null && s.monthlyWhat && <div><dt>{t("Monthly costs")}</dt><dd>≈ {money(s.monthly)} <small>{s.monthlyLocal ? `${fmt(s.monthlyLocal.amount, s.monthlyLocal.currency)} · ` : ""}{t(MONTHLY_LABEL[s.monthlyWhat])}</small></dd></div>}
          {s.monthly == null && s.feeUnknown && <div><dt>{t("Monthly costs")}</dt><dd className="is-unknown">{t("Community fee not stated")}</dd></div>}
        </dl>
      )}
      <RentLine price={d.price_eur} big />
      {(per || local) && (
        <p className="rh-ph-quiet">
          {per ? <span>{`${money(per)}/m²`}</span> : null}
          {vs ? <span className={vs.includes("below") ? "is-below" : undefined}>{vs}</span> : null}
          {local ? <span>{`${local} in your currency`}</span> : null}
        </p>
      )}
    </div>
  );
}
