import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const subscores = [
  {
    label: "ROI Potential",
    value: 82,
    color: "bg-score-excellent",
    positive: "Above-average rental yield for this region. Strong historical appreciation trend.",
    negative: "Slightly overpriced relative to comparable properties. Entry cost reduces short-term ROI.",
  },
  {
    label: "Market Stability",
    value: 74,
    color: "bg-score-good",
    positive: "Steady demand growth over the past 3 years. Low vacancy rates in the area.",
    negative: "Recent regulatory changes could impact future rental income. Market cooling signs detected.",
  },
  {
    label: "Demand Strength",
    value: 91,
    color: "bg-score-excellent",
    positive: "High search volume and buyer interest. Area is trending upward in popularity.",
    negative: "Increased competition among investors may drive up prices further.",
  },
  {
    label: "Risk Level",
    value: 68,
    color: "bg-score-average",
    positive: "Diversified local economy reduces single-sector dependency.",
    negative: "Property age introduces potential maintenance costs. Flood zone proximity adds insurance overhead.",
  },
  {
    label: "Liquidity Outlook",
    value: 77,
    color: "bg-score-good",
    positive: "Average days-on-market below regional median. High transaction volume in the area.",
    negative: "Premium pricing may extend time to sell. Limited buyer pool at this price tier.",
  },
];

const ScorePreview = () => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const toggleTooltip = (label: string) => {
    setActiveTooltip(activeTooltip === label ? null : label);
  };

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 sm:p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-center">
        {/* Score Circle */}
        <div className="relative flex-shrink-0">
          <svg className="w-36 h-36 sm:w-44 sm:h-44 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="264"
              strokeDashoffset="50"
              className="animate-score-fill"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl sm:text-[3.5rem] font-bold text-foreground font-mono leading-none">81</span>
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Global Score</span>
          </div>
        </div>

        {/* Subscores */}
        <div className="flex-1 w-full space-y-2">
          {subscores.map((s) => (
            <div key={s.label} className="relative">
              <div
                className="flex items-center gap-3 cursor-pointer group py-1"
                onClick={() => toggleTooltip(s.label)}
                onMouseEnter={() => setActiveTooltip(s.label)}
                onMouseLeave={() => setActiveTooltip(null)}
              >
                <span className="text-xs text-muted-foreground w-28 sm:w-32 flex-shrink-0 group-hover:text-foreground transition-colors">{s.label}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.value}%` }}
                    transition={{ delay: 1, duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${s.color}`}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-8 text-right">{s.value}</span>
              </div>

              {/* Tooltip */}
              <AnimatePresence>
                {activeTooltip === s.label && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-card p-3 shadow-lg"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-primary font-medium flex-shrink-0">+</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.positive}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-score-average font-medium flex-shrink-0">−</span>
                        <p className="text-xs text-muted-foreground leading-relaxed">{s.negative}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* Insight line */}
      <div className="mt-5 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Performs better than</span>
        <span className="text-xs font-mono font-semibold text-primary">72%</span>
        <span className="text-xs text-muted-foreground">of comparable listings in this market.</span>
      </div>

      <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-4">
        <p className="text-xs font-medium text-primary mb-1">Primary Insight</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Slightly overpriced relative to local comparables. ROI remains above regional average.
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">AI Summary:</span> Strong demand signals in a stabilizing market. Liquidity remains favorable. Pricing is 6% above median market value.
        </p>
      </div>
    </div>
  );
};

export default ScorePreview;
