// The price block at the top of a home page (8-nov-2026, minimal pass). One big asking price, then each other
// number with its own label, and one quiet line for €/m² and the visitor's currency. Logic in ./priceLogic (tested).
// Replaces, in this spot: CostBadge (big orange fee line), LocalPrice and PerSqmVsCountry, which printed €/m² twice.
import { useEffect, useState, type ReactNode } from "react";
import { money } from "./api";
import { fmt } from "./costs";
import { t } from "./i18n";
import { RentLine } from "./v6";
import { countryMedians, areaMedians, areaParts } from "./oct24";
import { rates, ratesDate, visitorCurrency } from "./extras";
import { usePreference } from "./buyer-state";
import { isEs } from "@/lib/lang";
import { PICK_CCY, listingCurrency } from "./n10/logic";
import { dayLabel } from "./n9/status";
import { priceSummary, vsMedian, MONTHLY_LABEL } from "./priceLogic";
import type { CheckRow } from "./checkLogic";

// 21-nov-2026 (list2 35): one tap between euro, dollar and pound, remembered on this device (rh.ccy). Without a
// choice the visitor's own currency is shown as before.
function useFx(): [Record<string, number> | null, string | null] {
  const [r, setR] = useState<Record<string, number> | null>(null);
  useEffect(() => { let on = true; rates().then((x) => { if (on) setR(x || null); }); return () => { on = false; }; }, []);
  return [r, r ? ratesDate() : null];
}
const fmtCcy = (v: number, ccy: string) => new Intl.NumberFormat(isEs() ? "es-ES" : navigator.language || "en", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(v);
const CCY_NAME: Record<string, [string, string]> = { USD: ["US dollars", "dólares estadounidenses"], GBP: ["pounds sterling", "libras esterlinas"], CAD: ["Canadian dollars", "dólares canadienses"], MXN: ["Mexican pesos", "pesos mexicanos"], JPY: ["Japanese yen", "yenes japoneses"], SEK: ["Swedish kronor", "coronas suecas"], NOK: ["Norwegian kroner", "coronas noruegas"], DKK: ["Danish kroner", "coronas danesas"], PLN: ["Polish złoty", "esloti polacos"], CZK: ["Czech koruna", "coronas checas"], HUF: ["Hungarian forint", "forintos húngaros"], RON: ["Romanian lei", "lei rumanos"], TRY: ["Turkish lira", "liras turcas"], CHF: ["Swiss francs", "francos suizos"] };

export function PriceHead({ d, hidePer = false, after }: { d: CheckRow & { sqm?: number | null }; hidePer?: boolean; after?: ReactNode }) {
  const s = priceSummary(d);
  const [median, setMedian] = useState<number | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const parts = areaParts(d as any).join("|");
  useEffect(() => {
    let on = true;
    if (d.country) Promise.all([countryMedians(), areaMedians()]).then(([m, a]) => {
      if (!on) return;
      // the most local place with at least 3 homes: "Lake Como" before "Lombardy" before the country
      const hit = parts.split("|").find((x) => x && a[d.country + "|" + x]);
      setMedian((hit && a[d.country + "|" + hit]) || m[d.country as string] || null); setArea(hit || null);
    });
    return () => { on = false; };
  }, [d.country, parts]);
  const [choice, setChoice] = usePreference<string>("rh.ccy", "");
  const [fx, fxDay] = useFx();
  const own = visitorCurrency();
  const ccy = choice === "EUR" ? null : choice && (PICK_CCY as readonly string[]).includes(choice) ? choice : own;
  const local = ccy && ccy !== "EUR" && fx?.[ccy] && d.price_eur ? "≈ " + fmtCcy(d.price_eur * fx[ccy], ccy) : "";
  const src = listingCurrency(d.country);
  const es = isEs();
  // hidePer: the key facts row under the price already shows €/m² (./keyfacts.tsx)
  const per = !hidePer && d.price_eur && d.sqm ? Math.round(d.price_eur / d.sqm) : null;
  const vs = vsMedian(d.price_eur, d.sqm, median, area || d.country);
  if (d.price_eur == null) return null;
  return (
    <div className="rh-ph">
      <div className="hunt-price" aria-label={`${t("Asking price")} ${money(d.price_eur)}`}>{money(d.price_eur)}</div>
      {/* the key facts row sits right under the price, above the lines that arrive later (currency, rent), so it never moves */}
      {after}
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
          {local ? <span>{choice && choice !== own ? local : es ? `${local} en tu moneda` : `${local} in your currency`}</span> : null}
        </p>
      )}
      <div className="rh-ph-ccy" role="group" aria-label={es ? "Moneda del precio" : "Price currency"}>
        {PICK_CCY.map((c) => { const on = c === "EUR" ? !ccy : ccy === c; return <button key={c} type="button" aria-pressed={on} onClick={() => setChoice(c)} title={c}>{c === "EUR" ? "€" : c === "USD" ? "$" : "£"}<span className="sr-only">{c}</span></button>; })}
      </div>
      {src && fx?.[src] && fxDay && (
        <p className="rh-ph-fx">{es
          ? `El anuncio da el precio en ${CCY_NAME[src]?.[1] || src}; aquí se muestra en euros. Al cambio del Banco Central Europeo del ${dayLabel(fxDay, "es")}: ${fmtCcy(d.price_eur * fx[src], src)}.`
          : `The advert gives the price in ${CCY_NAME[src]?.[0] || src}; it is shown here in euros. At the European Central Bank rate of ${dayLabel(fxDay, "en")}: ${fmtCcy(d.price_eur * fx[src], src)}.`}</p>
      )}
    </div>
  );
}
