import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "€0",
    period: "forever",
    description: "Try before you commit",
    features: [
      "3 analyses per month",
      "Full Global Score",
      "Basic AI summary",
    ],
    cta: "Get Started Free",
    variant: "hero-outline" as const,
    highlight: false,
  },
  {
    name: "Pro",
    price: "€29",
    period: "/month",
    description: "For serious investors",
    features: [
      "Unlimited analyses",
      "Advanced ROI breakdown",
      "Comparable properties",
      "Risk tier classification",
      "PDF export",
      "Portfolio tracking",
      "Opportunity alerts",
    ],
    cta: "Start Pro Trial",
    variant: "hero" as const,
    highlight: true,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            If one bad decision costs €20,000… €29 is not expensive.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-2xl border p-6 md:p-8 ${
                plan.highlight
                  ? "border-primary/30 bg-card glow-primary relative scale-[1.04]"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlight && (
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-4">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className={`font-bold text-foreground ${plan.highlight ? "text-5xl" : "text-4xl"}`}>{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant={plan.variant} className="w-full">
                {plan.cta}
              </Button>
              {plan.highlight && (
                <p className="text-[11px] text-muted-foreground text-center mt-4">
                  Cancel anytime. Less than 0.1% of the average property price.
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
