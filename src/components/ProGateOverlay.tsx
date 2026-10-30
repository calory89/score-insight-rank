import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import FreeLimitPricingModal from "@/components/FreeLimitPricingModal";

interface ProGateOverlayProps {
  children: React.ReactNode;
  isPro: boolean;
  label?: string;
}

const ProGateOverlay = ({ children, isPro, label = "Unlock with Pro" }: ProGateOverlayProps) => {
  const [showPricing, setShowPricing] = useState(false);

  if (isPro) return <>{children}</>;

  return (
    <>
      <div className="relative">
        <div className="blur-[6px] pointer-events-none select-none" aria-hidden="true">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-2xl z-10">
          <div className="flex flex-col items-center gap-3 p-6">
            <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{label}</p>
            <p className="text-xs text-muted-foreground text-center max-w-[240px]">
              Upgrade to Pro to access advanced financial data and risk reports.
            </p>
            <Button variant="hero" size="sm" onClick={() => setShowPricing(true)} className="gap-1.5">
              <Crown className="h-3.5 w-3.5" /> Upgrade Now
            </Button>
          </div>
        </div>
      </div>
      <FreeLimitPricingModal open={showPricing} onClose={() => setShowPricing(false)} />
    </>
  );
};

export default ProGateOverlay;
