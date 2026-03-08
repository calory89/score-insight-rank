import { AlertTriangle, Crown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import FreeLimitPricingModal from "@/components/FreeLimitPricingModal";

interface BadDealAlertProps {
  score: number;
  redFlagCount: number;
}

const BadDealAlert = ({ score, redFlagCount }: BadDealAlertProps) => {
  const [showPricing, setShowPricing] = useState(false);

  if (score >= 40) return null;

  return (
    <>
      <div className="rounded-2xl border-2 border-destructive/40 bg-destructive/5 p-6 mb-8 animate-fade-in">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-destructive mb-1">⚠️ Bad Deal Detected</h3>
            <p className="text-sm text-muted-foreground mb-3">
              This property scored <span className="font-bold text-destructive">{score}/100</span> and has{" "}
              <span className="font-bold text-destructive">{redFlagCount} red flag{redFlagCount !== 1 ? "s" : ""}</span>.
              Pro users get the full risk report to understand exactly why — and avoid losing money.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="hero" size="sm" onClick={() => setShowPricing(true)} className="gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Get Full Risk Report
              </Button>
              <span className="text-[10px] text-muted-foreground">Pro users save an avg. of $12,400/year</span>
            </div>
          </div>
        </div>
      </div>
      <FreeLimitPricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
};

export default BadDealAlert;
