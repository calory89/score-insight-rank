import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Info } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type AnalysisData = Tables<"analyses">;

interface Factor {
  sign: "+" | "−";
  weight: number; // 1–5
  text: string;
  source?: string;
}

const buildFactors = (d: AnalysisData, explanations: Record<string, any>): Factor[] => {
  const factors: Factor[] = [];

  const pros = (d.pros as string[]) || [];
  const cons = (d.cons as string[]) || [];
  const reds = (d.red_flags as string[]) || [];
  const opps = (d.opportunity_signals as string[]) || [];

  opps.slice(0, 3).forEach((t) => factors.push({ sign: "+", weight: 5, text: t, source: "Comparables €/m²" }));
  pros.slice(0, 4).forEach((t) => factors.push({ sign: "+", weight: 4, text: t, source: "Listing data" }));

  // Subscore-driven factors
  const subs: Array<[string, number | null]> = [
    ["ROI Potential", d.roi_potential],
    ["Demand Strength", d.demand_strength],
    ["Liquidity Outlook", d.liquidity_outlook],
    ["Market Stability", d.market_stability],
    ["Safety", d.risk_level],
  ];
  subs.forEach(([label, v]) => {
    if (v == null) return;
    if (v >= 75) factors.push({ sign: "+", weight: 3, text: `${label} above market: ${v}/100`, source: "RH subscore" });
    if (v <= 45) factors.push({ sign: "−", weight: 3, text: `${label} underperforms: ${v}/100`, source: "RH subscore" });
  });

  reds.slice(0, 3).forEach((t) => factors.push({ sign: "−", weight: 5, text: t, source: "Red flag detection" }));
  cons.slice(0, 4).forEach((t) => factors.push({ sign: "−", weight: 4, text: t, source: "Listing data" }));

  // why_not_90 reasons (most surgical negatives)
  const wn = (d.why_not_90 as string[]) || [];
  wn.slice(0, 3).forEach((t) => factors.push({ sign: "−", weight: 4, text: t, source: "Score ceiling check" }));

  return factors.sort((a, b) => b.weight - a.weight).slice(0, 12);
};

interface Props {
  data: AnalysisData;
  explanations: Record<string, any>;
}

const ExplainableAI = ({ data, explanations }: Props) => {
  const factors = buildFactors(data, explanations);
  if (factors.length === 0) return null;

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-6 md:p-8">
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="font-display text-[22px] text-ink">Explainable AI, what drives this score</h3>
          <p className="text-[12px] text-ink-soft mt-1">
            Ranked by impact. No black box, every factor is sourced.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-soft border border-hairline px-2 py-1 rounded-full">
          {factors.length} signals
        </span>
      </div>

      <ul className="divide-y divide-hairline">
        {factors.map((f, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className="py-3 flex items-start gap-3"
          >
            <span
              className={`flex-shrink-0 mt-0.5 inline-flex items-center justify-center h-6 w-6 rounded-full font-bold text-[14px] ${
                f.sign === "+"
                  ? "bg-good/10 text-good"
                  : "bg-bad/10 text-bad"
              }`}
            >
              {f.sign === "+" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] text-ink leading-snug">{f.text}</p>
              {f.source && (
                <p className="text-[11px] text-ink-soft mt-0.5 flex items-center gap-1">
                  <Info className="h-2.5 w-2.5" /> {f.source}
                </p>
              )}
            </div>
            {/* impact dots */}
            <div className="flex items-center gap-0.5 flex-shrink-0 mt-1.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <span
                  key={j}
                  className={`h-1.5 w-1.5 rounded-full ${
                    j < f.weight ? (f.sign === "+" ? "bg-good" : "bg-bad") : "bg-hairline"
                  }`}
                  style={{ backgroundColor: j < f.weight ? undefined : "rgba(15,17,21,0.08)" }}
                />
              ))}
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};

export default ExplainableAI;
