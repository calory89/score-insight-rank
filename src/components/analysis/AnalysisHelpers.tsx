import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Shield, Info } from "lucide-react";
import { scoreColor, scoreBg, confidenceColor } from "@/lib/score-utils";

export const SubscoreBar = ({ label, value, explanation }: { label: string; value: number; explanation?: { positive: string; negative: string } }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-3 cursor-pointer group py-1.5" onClick={() => setOpen(!open)}>
        <span className="text-xs text-muted-foreground w-32 flex-shrink-0 group-hover:text-foreground transition-colors">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${scoreBg(value)}`} />
        </div>
        <span className={`text-xs font-mono w-8 text-right font-medium ${scoreColor(value)}`}>{value}</span>
        {explanation && (open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />)}
      </div>
      <AnimatePresence>
        {open && explanation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="ml-32 pl-3 border-l border-border mb-2 overflow-hidden">
            <div className="py-2 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-xs text-primary font-medium flex-shrink-0">+</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{explanation.positive}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-score-average font-medium flex-shrink-0">−</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{explanation.negative}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ConfidenceBadge = ({ level }: { level: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  const explanation = level === "high" ? "Analysis based on complete listing data."
    : level === "medium" ? "Analysis based on partial data. Some metrics are estimated."
    : "Limited data available. Scores are approximations.";
  return (
    <div className="relative inline-flex">
      <button onClick={() => setShowTooltip(!showTooltip)}
        className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${confidenceColor(level)}`}>
        <Shield className="h-3 w-3" /> Confidence: {label} <Info className="h-2.5 w-2.5 opacity-60" />
      </button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 mt-1 z-20 rounded-lg border border-border bg-card p-3 shadow-lg min-w-[220px]">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MetricCard = ({ icon: Icon, label, value, sub, positive }: { icon: any; label: string; value: string | number | undefined; sub?: string; positive?: boolean | null }) => {
  if (value === undefined || value === null) return null;
  return (
    <div className="rounded-xl bg-secondary/50 border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-mono font-bold ${positive === true ? "text-primary" : positive === false ? "text-score-poor" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
};

export const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="h-4 w-4 text-primary" />
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
);

export const Section = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay }}
      className={className}>
      {children}
    </motion.div>
  );
};
