import { Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import FreeLimitPricingModal from "@/components/FreeLimitPricingModal";

interface ReportExpiryBannerProps {
  createdAt: string;
}

const ReportExpiryBanner = ({ createdAt }: ReportExpiryBannerProps) => {
  const [showPricing, setShowPricing] = useState(false);
  const created = new Date(createdAt);
  const expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  return (
    <>
      <div className="rounded-xl border border-score-average/30 bg-score-average/5 p-4 flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-score-average flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              This report expires in {daysLeft} day{daysLeft !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Free reports are deleted after 7 days. Upgrade to keep them forever.
            </p>
          </div>
        </div>
        <Button variant="hero" size="sm" onClick={() => setShowPricing(true)} className="flex-shrink-0 gap-1">
          <Crown className="h-3.5 w-3.5" /> Keep Forever
        </Button>
      </div>
      <FreeLimitPricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
};

export default ReportExpiryBanner;
