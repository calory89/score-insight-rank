// What the home page says under the asking price (8-nov-2026, minimal pass). Carlos saw "€197,000" and then
// "≈ €212,000 to buy · ≈ €90/mo" on a card and thought the price was wrong. Now cards show one price, and the home
// page explains the other numbers, each with its own label:
//   €197,000
//   Total with buying costs   ≈ €212,000
//   Monthly costs             ≈ €90 (community fee)
//   €1,659/m² · 13% above the median in Spain · ≈ 1.004.667 kr. in your currency     (one quiet line)
import { allIn, roundNice, type CheckRow } from "./checkLogic";

export type MonthlyWhat = "fee" | "tax" | "fee_tax";
export type PriceSummary = {
  /** price plus the country's usual buying costs (midpoint of the range), rounded; null when unknown */
  total: number | null;
  /** community fee and/or property tax per month, in euros; null when the listing states neither */
  monthly: number | null;
  monthlyWhat: MonthlyWhat | null;
  /** a flat whose listing does not state the community fee */
  feeUnknown: boolean;
  /** the same monthly amount in the listing's own currency when it is not euros ($1,100), so it matches the
   *  "What it costs every month" block further down */
  monthlyLocal: { amount: number; currency: string } | null;
};

export function priceSummary(d: CheckRow): PriceSummary {
  const a = allIn(d);
  const total = a.totalLow != null && a.totalHigh != null ? roundNice((a.totalLow + a.totalHigh) / 2) : null;
  const fee = a.hoaEur != null && a.hoaEur > 0, tax = a.taxMonthEur != null && a.taxMonthEur > 0;
  const monthly = fee || tax ? Math.round(a.monthly || 0) : null;
  return {
    // a total equal to the price says nothing (country without known costs)
    total: total != null && a.price != null && total > a.price ? total : null,
    monthly: monthly && monthly > 0 ? monthly : null,
    monthlyWhat: fee && tax ? "fee_tax" : fee ? "fee" : tax ? "tax" : null,
    feeUnknown: !!d.hoa_unknown && !fee,
    monthlyLocal: monthly && monthly > 0 && d.hoa_currency && d.hoa_currency !== "EUR"
      ? { amount: Math.round((Number(d.hoa_monthly) > 0 ? Number(d.hoa_monthly) : 0) + (Number(d.tax_annual) > 0 ? Number(d.tax_annual) / 12 : 0)), currency: d.hoa_currency }
      : null,
  };
}

export const MONTHLY_LABEL: Record<MonthlyWhat, string> = {
  fee: "(community fee)",
  tax: "(property tax)",
  fee_tax: "(community fee and property tax)",
};

/** "13% above the median in Spain" (null when within 3% or unknown). */
export function vsMedian(price: number | null | undefined, sqm: number | null | undefined, median: number | null | undefined, country: string | null | undefined): string | null {
  if (!price || !sqm || !median || !country) return null;
  const diff = Math.round(((price / sqm - median) / median) * 100);
  if (Math.abs(diff) < 3) return null;
  return `${Math.abs(diff)}% ${diff < 0 ? "below" : "above"} the median in ${country}`;
}

/** 21-nov-2026 (list 2 idea 75): which running costs the advert leaves out, so pages and cards say "not stated"
 *  instead of a blank that reads as zero. A fee of 0 counts as not stated: adverts never write "0 a month". */
export type NotStated = "both" | "fee" | "tax" | null;
export function costsNotStated(d: { hoa_monthly?: number | string | null; tax_annual?: number | string | null }): NotStated {
  const fee = Number(d.hoa_monthly) > 0, tax = Number(d.tax_annual) > 0;
  return !fee && !tax ? "both" : !fee ? "fee" : !tax ? "tax" : null;
}
/** The words for a card or the price block (English; the Spanish site swaps them through public/i18n/es-extra.json). */
export const NOT_STATED_LABEL: Record<Exclude<NotStated, null>, string> = {
  both: "Community fee and yearly tax not stated",
  fee: "Community fee not stated",
  tax: "Yearly tax not stated",
};
