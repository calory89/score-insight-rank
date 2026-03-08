import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Building2, X, Shield, TrendingUp, GitCompare, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import StripeCheckoutOverlay from "@/components/StripeCheckoutOverlay";

const STRIPE_PRICES = {
  pro_monthly: "price_1T3QtAJ3dZ2FxAKF5EGqk2Tq",
  pro_annual: "price_1T3R8zJ3dZ2FxAKFJFdeBD4U",
  super_pro_monthly: "price_1T3QvdJ3dZ2FxAKF0KoqJvE9",
  super_pro_annual: "price_1T3RAJJ3dZ2FxAKFxTYmp2fX",
};

const plans = [
  {
    name: "Pro",
    icon: Crown,
    monthlyPrice: 29,
    yearlyPrice: 15,
    features: [
      "300 analyses per month",
      "Advanced ROI breakdown",
      "Comparable properties",
      "Risk tier classification",
      "PDF export & comparisons",
      "Multi-URL batch search",
    ],
    cta: "Get Pro",
    highlighted: true,
    stripePriceMonthly: STRIPE_PRICES.pro_monthly,
    stripePriceAnnual: STRIPE_PRICES.pro_annual,
  },
  {
    name: "Super Pro",
    icon: Building2,
    monthlyPrice: 65,
    yearlyPrice: 33,
    features: [
      "1,000 analyses per month",
      "Everything in Pro",
      "Weekly digest of top properties",
      "Priority support",
      "Custom reports",
    ],
    cta: "Get Super Pro",
    highlighted: false,
    stripePriceMonthly: STRIPE_PRICES.super_pro_monthly,
    stripePriceAnnual: STRIPE_PRICES.super_pro_annual,
  },
];

interface FreeLimitPricingModalProps {
  open: boolean;
  onClose: () => void;
  usedCount?: number;
}

const FreeLimitPricingModal = ({ open, onClose, usedCount = 5 }: FreeLimitPricingModalProps) => {
  const [annual, setAnnual] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<typeof plans[0] | null>(null);
  const { user } = useAuth();

  // 24h countdown timer
  const [timeLeft, setTimeLeft] = useState(() => {
    const stored = localStorage.getItem("realhunt_upgrade_deadline");
    if (stored) return Math.max(0, parseInt(stored) - Date.now());
    const deadline = Date.now() + 24 * 60 * 60 * 1000;
    localStorage.setItem("realhunt_upgrade_deadline", deadline.toString());
    return 24 * 60 * 60 * 1000;
  });

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      const stored = localStorage.getItem("realhunt_upgrade_deadline");
      if (stored) setTimeLeft(Math.max(0, parseInt(stored) - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const hours = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  if (!open) return null;

  const checkoutPriceId = checkoutPlan
    ? (annual ? checkoutPlan.stripePriceAnnual : checkoutPlan.stripePriceMonthly)
    : null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 pb-4 border-b border-border bg-secondary/30">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground">
                You've used all {usedCount} free analyses
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upgrade to keep analyzing properties and never miss a deal.
              </p>

              {/* Countdown timer */}
              {timeLeft > 0 && (
                <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">20% off</span> if you upgrade in{" "}
                    <span className="font-mono font-bold text-primary">
                      {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                  </p>
                </div>
              )}

              {/* Benefits strip */}
              <div className="flex flex-wrap gap-3 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" /> Up to 1,000 analyses/mo
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-3.5 w-3.5 text-primary" /> Risk classification
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" /> Advanced ROI
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GitCompare className="h-3.5 w-3.5 text-primary" /> Compare properties
                </div>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex justify-center py-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-border bg-secondary/50 px-4 py-2">
                <span className={`text-xs font-medium transition-colors ${!annual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
                <button
                  onClick={() => setAnnual(!annual)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${annual ? "bg-primary" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${annual ? "translate-x-5" : ""}`} />
                </button>
                <span className={`text-xs font-medium transition-colors ${annual ? "text-foreground" : "text-muted-foreground"}`}>
                  Annual <span className="text-primary font-semibold">-50%</span>
                </span>
              </div>
            </div>

            {/* Plans */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-6 pb-6">
              {plans.map((plan) => {
                const Icon = plan.icon;
                const price = annual ? plan.yearlyPrice : plan.monthlyPrice;
                return (
                  <div
                    key={plan.name}
                    className={`rounded-xl border p-5 flex flex-col ${
                      plan.highlighted
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-card"
                    }`}
                  >
                    {plan.highlighted && (
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-full mb-2 w-fit">
                        Most Popular
                      </span>
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-primary" />
                      <h4 className="text-sm font-semibold text-foreground">{plan.name}</h4>
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-3xl font-bold text-foreground">${price}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                      {annual && (
                        <span className="text-xs text-muted-foreground line-through ml-1">${plan.monthlyPrice}</span>
                      )}
                    </div>
                    <ul className="space-y-1.5 mb-4 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button
                      variant={plan.highlighted ? "hero" : "hero-outline" as any}
                      className="w-full"
                      onClick={() => setCheckoutPlan(plan)}
                    >
                      {plan.cta}
                    </Button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[10px] text-muted-foreground pb-4">
              Cancel anytime · All plans in USD · Annual saves 50%
            </p>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {checkoutPriceId && checkoutPlan && (
        <StripeCheckoutOverlay
          open={!!checkoutPriceId}
          onClose={() => setCheckoutPlan(null)}
          priceId={checkoutPriceId}
          planName={checkoutPlan.name}
          features={checkoutPlan.features}
        />
      )}
    </>
  );
};

export default FreeLimitPricingModal;
