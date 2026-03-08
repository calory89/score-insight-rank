import { DollarSign, Crown, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useState } from "react";
import FreeLimitPricingModal from "@/components/FreeLimitPricingModal";

interface SavingsCalculatorProps {
  analyses: any[];
}

const SavingsCalculator = ({ analyses }: SavingsCalculatorProps) => {
  const [showPricing, setShowPricing] = useState(false);

  // Calculate savings from bad deals (score < 50)
  const badDeals = analyses.filter(a => a.global_score != null && a.global_score < 50);
  if (badDeals.length === 0) return null;

  // Estimate avg loss from bad deals based on price
  const totalSavings = badDeals.reduce((sum, a) => {
    const price = parseFloat((a.price || "0").replace(/[^0-9.]/g, ""));
    // Estimate 5-15% loss based on score (lower score = higher loss)
    const lossPct = Math.max(0.05, (50 - (a.global_score || 0)) / 200);
    return sum + (price * lossPct);
  }, 0);

  const formattedSavings = totalSavings >= 1000
    ? `$${Math.round(totalSavings / 1000).toLocaleString()},000`
    : `$${Math.round(totalSavings).toLocaleString()}`;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent p-5 mb-6"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <TrendingDown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                You could have saved ~{formattedSavings}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on {badDeals.length} risky propert{badDeals.length === 1 ? "y" : "ies"} you analyzed. Pro flags these with full risk reports.
              </p>
            </div>
          </div>
          <Button variant="hero" size="sm" onClick={() => setShowPricing(true)} className="flex-shrink-0 gap-1">
            <Crown className="h-3.5 w-3.5" /> Upgrade
          </Button>
        </div>
      </motion.div>
      <FreeLimitPricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
};

export default SavingsCalculator;
