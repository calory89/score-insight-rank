import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Building2, Mail } from "lucide-react";

const plans = [
  {
    name: "Free",
    icon: Zap,
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Get started — no card needed",
    features: [
      "5 analyses per month",
      "Full Global Score",
      "Basic AI summary",
      "Single URL search",
    ],
    cta: "Get Started Free",
    variant: "hero-outline" as const,
    highlight: false,
  },
  {
    name: "Pro",
    icon: Crown,
    monthlyPrice: 29,
    yearlyPrice: 15,
    description: "For serious investors",
    features: [
      "300 analyses per month",
      "Advanced ROI breakdown",
      "Comparable properties",
      "Risk tier classification",
      "PDF export & comparisons",
      "Portfolio tracking",
      "Multi-URL batch search",
    ],
    cta: "Get Pro",
    variant: "hero" as const,
    highlight: true,
  },
  {
    name: "Unlimited",
    icon: Building2,
    monthlyPrice: 65,
    yearlyPrice: 33,
    description: "For funds & power users",
    features: [
      "1,000 analyses per month",
      "Everything in Pro",
      "Priority support",
      "Multi-URL batch search",
      "Dedicated account manager",
      "Custom reports",
    ],
    cta: "Get Unlimited",
    variant: "hero" as const,
    highlight: false,
  },
  {
    name: "Enterprise",
    icon: Mail,
    monthlyPrice: null,
    yearlyPrice: null,
    description: "Custom volume & API access",
    features: [
      "Unlimited analyses",
      "Everything in Unlimited",
      "API access",
      "White-label reports",
      "Dedicated support team",
      "Custom integrations",
    ],
    cta: "Contact Us",
    variant: "hero-outline" as const,
    highlight: false,
  },
];

const PricingSection = () => {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            If one bad decision costs €20,000… this pays for itself on the first search.
          </p>

          {/* Annual Toggle */}
          <div className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
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
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const price = annual ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlight
                    ? "border-primary/30 bg-card glow-primary relative scale-[1.03]"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 w-fit">
                    Most Popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  {price !== null ? (
                    <>
                      <span className={`font-bold text-foreground ${plan.highlight ? "text-4xl" : "text-3xl"}`}>
                        ${price}
                      </span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                      {annual && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                        <span className="text-xs text-muted-foreground line-through ml-1">${plan.monthlyPrice}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-2xl font-bold text-foreground">Custom</span>
                  )}
                </div>
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button variant={plan.variant} className="w-full">
                  {plan.cta}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Cancel anytime. All plans billed in USD. Annual plans save 50%.
        </p>
      </div>
    </section>
  );
};

export default PricingSection;
