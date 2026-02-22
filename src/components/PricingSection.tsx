import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Building2, Mail, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
    highlighted: false,
    ctaVariant: "hero-outline" as const,
  },
  {
    name: "Pro",
    icon: Crown,
    monthlyPrice: 29,
    yearlyPrice: 15,
    description: "For serious investors",
    features: [
      "300 analyses per month",
      "Everything in Free",
      "Advanced ROI breakdown",
      "Comparable properties",
      "Risk tier classification",
      "PDF export & comparisons",
      "Portfolio tracking",
      "Multi-URL batch search",
    ],
    cta: "Get Pro",
    highlighted: true,
    ctaVariant: "hero" as const,
  },
  {
    name: "Super Pro",
    icon: Building2,
    monthlyPrice: 65,
    yearlyPrice: 33,
    description: "For funds & power users",
    features: [
      "1,000 analyses per month",
      "Everything in Pro",
      "Priority support",
      "Dedicated account manager",
      "Custom reports",
      "Multi-URL batch search",
    ],
    cta: "Get Super Pro",
    highlighted: false,
    ctaVariant: "hero" as const,
  },
  {
    name: "Enterprise",
    icon: Mail,
    monthlyPrice: null,
    yearlyPrice: null,
    description: "Custom volume & API access",
    features: [
      "Unlimited analyses",
      "Everything in Super Pro",
      "API access",
      "White-label reports",
      "Dedicated support team",
      "Custom integrations",
    ],
    cta: "Contact Us",
    highlighted: false,
    ctaVariant: "hero-outline" as const,
    isContact: true,
  },
];

const COUNTRY_CODES = [
  { code: "+1", flag: "🇺🇸", name: "US" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+34", flag: "🇪🇸", name: "ES" },
  { code: "+33", flag: "🇫🇷", name: "FR" },
  { code: "+49", flag: "🇩🇪", name: "DE" },
  { code: "+39", flag: "🇮🇹", name: "IT" },
  { code: "+351", flag: "🇵🇹", name: "PT" },
  { code: "+31", flag: "🇳🇱", name: "NL" },
  { code: "+46", flag: "🇸🇪", name: "SE" },
  { code: "+45", flag: "🇩🇰", name: "DK" },
  { code: "+47", flag: "🇳🇴", name: "NO" },
  { code: "+62", flag: "🇮🇩", name: "ID" },
  { code: "+971", flag: "🇦🇪", name: "AE" },
  { code: "+61", flag: "🇦🇺", name: "AU" },
  { code: "+81", flag: "🇯🇵", name: "JP" },
  { code: "+86", flag: "🇨🇳", name: "CN" },
  { code: "+91", flag: "🇮🇳", name: "IN" },
  { code: "+55", flag: "🇧🇷", name: "BR" },
  { code: "+52", flag: "🇲🇽", name: "MX" },
];

const ContactModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [countryCode, setCountryCode] = useState("+1");
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-foreground">Contact Sales</h3>
            <button onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-8">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Check className="h-6 w-6 text-primary" />
              </div>
              <h4 className="text-base font-semibold text-foreground mb-1">Request Sent!</h4>
              <p className="text-sm text-muted-foreground">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
                <Input type="email" required placeholder="your@company.com" className="bg-secondary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="h-10 rounded-md border border-border bg-secondary/50 px-2 text-sm text-foreground w-24"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                    ))}
                  </select>
                  <Input type="tel" placeholder="Phone number" className="bg-secondary/50 flex-1" />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Company Name</label>
                <Input placeholder="Your company" className="bg-secondary/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Estimated Monthly Searches</label>
                <select className="h-10 w-full rounded-md border border-border bg-secondary/50 px-3 text-sm text-foreground">
                  <option>1,000 – 5,000</option>
                  <option>5,000 – 10,000</option>
                  <option>10,000 – 50,000</option>
                  <option>50,000+</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Message</label>
                <Textarea placeholder="Tell us about your needs..." rows={3} className="bg-secondary/50" />
              </div>
              <Button type="submit" variant="hero" className="w-full">Send Request</Button>
            </form>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const PricingSection = () => {
  const [annual, setAnnual] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto items-start">
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
                className={`rounded-2xl border p-6 flex flex-col h-full ${
                  plan.highlighted
                    ? "border-primary/30 bg-card glow-primary relative"
                    : "border-border bg-card"
                }`}
              >
                {plan.highlighted && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full mb-3 w-fit">
                    Most Popular
                  </span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-5">{plan.description}</p>

                <div className="flex items-baseline gap-1 mb-6">
                  {price !== null ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">${price}</span>
                      <span className="text-xs text-muted-foreground">/mo</span>
                      {annual && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                        <span className="text-xs text-muted-foreground line-through ml-1">${plan.monthlyPrice}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-foreground">Custom</span>
                  )}
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.ctaVariant}
                  className="w-full mt-auto"
                  onClick={() => {
                    if (plan.isContact) setContactOpen(true);
                  }}
                >
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

      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </section>
  );
};

export default PricingSection;
