import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import AnimatedScoreRing from "@/components/AnimatedScoreRing";
import { SubscoreBar } from "./AnalysisHelpers";
import type { Tables } from "@/integrations/supabase/types";

type AnalysisData = Tables<"analyses">;

interface AnalysisScoreCardProps {
  data: AnalysisData;
  explanations: Record<string, any>;
  globalScore: number | null;
}

const AnalysisScoreCard = ({ data: d, explanations, globalScore }: AnalysisScoreCardProps) => {
  const [showWhyNot90, setShowWhyNot90] = useState(false);

  return (
    <div className="p-5 md:p-6">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <AnimatedScoreRing score={globalScore} size={160} />

        <div className="flex-1 w-full">
          <h3 className="text-sm font-semibold text-foreground mb-3">Subscore Breakdown</h3>
          <div className="space-y-1">
            <SubscoreBar label="ROI Potential" value={d.roi_potential} explanation={explanations.roi_potential} />
            <SubscoreBar label="Market Stability" value={d.market_stability} explanation={explanations.market_stability} />
            <SubscoreBar label="Demand Strength" value={d.demand_strength} explanation={explanations.demand_strength} />
            <SubscoreBar label="Safety Score" value={d.risk_level} explanation={explanations.risk_level} />
            <SubscoreBar label="Liquidity Outlook" value={d.liquidity_outlook} explanation={explanations.liquidity_outlook} />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Better than <span className="font-mono font-semibold text-primary">{d.percentile}%</span> of comparable listings.
            {d.market_rank && d.market_rank <= d.market_total && <span className="ml-2">Rank: <span className="font-mono text-foreground">#{d.market_rank}</span> of {d.market_total}</span>}
          </p>
          {d.why_not_90 && (d.why_not_90 as string[]).length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <button onClick={() => setShowWhyNot90(!showWhyNot90)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                Why not 90+? {showWhyNot90 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              <AnimatePresence>
                {showWhyNot90 && (
                  <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1 overflow-hidden">
                    {(d.why_not_90 as string[]).map((r: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-score-average mt-0.5">•</span> {r}</li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisScoreCard;
