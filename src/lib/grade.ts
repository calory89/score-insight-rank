// Letter grade from 0–100 score + one-line verdict helper

export const scoreToGrade = (score: number | null | undefined): string => {
  if (score == null) return "—";
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "A−";
  if (score >= 80) return "B+";
  if (score >= 75) return "B";
  if (score >= 70) return "B−";
  if (score >= 65) return "C+";
  if (score >= 55) return "C";
  if (score >= 45) return "D";
  return "F";
};

export const gradeColor = (score: number | null | undefined): string => {
  if (score == null) return "text-ink-soft";
  if (score >= 80) return "text-good";
  if (score >= 60) return "text-accent-gold";
  if (score >= 45) return "text-warn";
  return "text-bad";
};

// Format a price string/number with currency symbol and thousands separators.
// Accepts raw numeric ("600000"), already-formatted ("€600,000"), or strings with
// trailing notes ("€272,500 (Estimated...)"). Falls back to original input when no
// numeric value can be parsed.
export const formatPrice = (
  price: string | number | null | undefined,
  currency: string | null | undefined
): string => {
  if (price == null || price === "") return "—";
  const sym = currency === "GBP" || currency === "£" ? "£"
    : currency === "USD" || currency === "$" ? "$"
    : "€";
  const raw = String(price).trim();
  // Extract first numeric run (supports commas/dots as thousands)
  const match = raw.match(/[\d][\d.,]*/);
  if (!match) return raw;
  const numStr = match[0];
  // If the chunk has both . and , assume , is thousands; else strip any commas
  const cleaned = numStr.replace(/,/g, "");
  const n = parseFloat(cleaned);
  if (!isFinite(n) || n === 0) return raw;
  const formatted = Math.round(n).toLocaleString("en-US");
  // Preserve any trailing annotation like "(Estimated...)"
  const tailIdx = raw.indexOf(numStr) + numStr.length;
  const tail = raw.slice(tailIdx).trim();
  return `${sym}${formatted}${tail ? " " + tail : ""}`;
};

export const oneLineVerdict = (d: {
  global_score?: number | null;
  verdict?: string | null;
  price?: string | null;
  currency?: string | null;
  city?: string | null;
}): string => {
  const s = d.global_score ?? 0;
  const curr = d.currency === "GBP" ? "£" : d.currency === "USD" ? "$" : "€";
  const loc = d.city || "the area";
  if (s >= 85) return `Strong buy${d.price ? ` at ${curr}${d.price}` : ""} — outperforms peers in ${loc}.`;
  if (s >= 70) return `Solid opportunity — fair pricing for ${loc}, watch the negotiation room.`;
  if (s >= 55) return `Moderate — only buy if you can negotiate ${d.price ? "below " + curr + d.price : "the asking price"}.`;
  return `Pass — overpriced or risky for ${loc}. Better deals exist on the leaderboard.`;
};
