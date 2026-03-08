import { TrendingUp, TrendingDown, AlertTriangle, Sparkles } from "lucide-react";
import { Section } from "./AnalysisHelpers";

interface AnalysisProsConsProps {
  pros: string[];
  cons: string[];
  redFlags: string[];
  opportunitySignals: string[];
}

const AnalysisProsCons = ({ pros, cons, redFlags, opportunitySignals }: AnalysisProsConsProps) => {
  return (
    <Section delay={0.23} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Pros</h3>
        <ul className="space-y-2">
          {pros?.map((p: string, i: number) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">+</span> {p}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-score-average" /> Cons</h3>
        <ul className="space-y-2">
          {cons?.map((c: string, i: number) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-score-average mt-0.5">−</span> {c}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-score-poor" /> Red Flags</h3>
        <ul className="space-y-2">
          {redFlags?.map((r: string, i: number) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-score-poor mt-0.5">⚠</span> {r}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Opportunity Signals</h3>
        <ul className="space-y-2">
          {opportunitySignals?.map((o: string, i: number) => (
            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">★</span> {o}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
};

export default AnalysisProsCons;
