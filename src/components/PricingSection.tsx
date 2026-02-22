import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Zap, Crown, Building2, Mail, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import LoginGateModal from "@/components/LoginGateModal";
import StripeCheckoutOverlay from "@/components/StripeCheckoutOverlay";

// Stripe price IDs
const STRIPE_PRICES = {
  pro_monthly: "price_1T3QtAJ3dZ2FxAKF5EGqk2Tq",
  pro_annual: "price_1T3R8zJ3dZ2FxAKFJFdeBD4U",
  super_pro_monthly: "price_1T3QvdJ3dZ2FxAKF0KoqJvE9",
  super_pro_annual: "price_1T3RAJJ3dZ2FxAKFxTYmp2fX",
};

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
    stripePriceMonthly: null as string | null,
    stripePriceAnnual: null as string | null,
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
    stripePriceMonthly: STRIPE_PRICES.pro_monthly,
    stripePriceAnnual: STRIPE_PRICES.pro_annual,
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
      "Weekly digest: top-rated properties in your country via email",
      "Priority support",
      "Dedicated account manager",
      "Custom reports",
      "Multi-URL batch search",
    ],
    cta: "Get Super Pro",
    highlighted: false,
    ctaVariant: "hero" as const,
    stripePriceMonthly: STRIPE_PRICES.super_pro_monthly,
    stripePriceAnnual: STRIPE_PRICES.super_pro_annual,
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
    stripePriceMonthly: null as string | null,
    stripePriceAnnual: null as string | null,
  },
];

const ALL_COUNTRIES = [
  { code: "+1", flag: "🇺🇸", name: "United States" }, { code: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "+44", flag: "🇬🇧", name: "United Kingdom" }, { code: "+353", flag: "🇮🇪", name: "Ireland" },
  { code: "+34", flag: "🇪🇸", name: "Spain" }, { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+49", flag: "🇩🇪", name: "Germany" }, { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" }, { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+32", flag: "🇧🇪", name: "Belgium" }, { code: "+41", flag: "🇨🇭", name: "Switzerland" },
  { code: "+43", flag: "🇦🇹", name: "Austria" }, { code: "+46", flag: "🇸🇪", name: "Sweden" },
  { code: "+45", flag: "🇩🇰", name: "Denmark" }, { code: "+47", flag: "🇳🇴", name: "Norway" },
  { code: "+358", flag: "🇫🇮", name: "Finland" }, { code: "+48", flag: "🇵🇱", name: "Poland" },
  { code: "+420", flag: "🇨🇿", name: "Czech Republic" }, { code: "+36", flag: "🇭🇺", name: "Hungary" },
  { code: "+30", flag: "🇬🇷", name: "Greece" }, { code: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria" }, { code: "+385", flag: "🇭🇷", name: "Croatia" },
  { code: "+386", flag: "🇸🇮", name: "Slovenia" }, { code: "+421", flag: "🇸🇰", name: "Slovakia" },
  { code: "+370", flag: "🇱🇹", name: "Lithuania" }, { code: "+371", flag: "🇱🇻", name: "Latvia" },
  { code: "+372", flag: "🇪🇪", name: "Estonia" },
  { code: "+90", flag: "🇹🇷", name: "Turkey" }, { code: "+7", flag: "🇷🇺", name: "Russia" },
  { code: "+380", flag: "🇺🇦", name: "Ukraine" },
  { code: "+971", flag: "🇦🇪", name: "UAE" }, { code: "+966", flag: "🇸🇦", name: "Saudi Arabia" },
  { code: "+974", flag: "🇶🇦", name: "Qatar" }, { code: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "+61", flag: "🇦🇺", name: "Australia" }, { code: "+64", flag: "🇳🇿", name: "New Zealand" },
  { code: "+81", flag: "🇯🇵", name: "Japan" }, { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+86", flag: "🇨🇳", name: "China" }, { code: "+852", flag: "🇭🇰", name: "Hong Kong" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" }, { code: "+60", flag: "🇲🇾", name: "Malaysia" },
  { code: "+66", flag: "🇹🇭", name: "Thailand" }, { code: "+62", flag: "🇮🇩", name: "Indonesia" },
  { code: "+63", flag: "🇵🇭", name: "Philippines" }, { code: "+84", flag: "🇻🇳", name: "Vietnam" },
  { code: "+91", flag: "🇮🇳", name: "India" }, { code: "+92", flag: "🇵🇰", name: "Pakistan" },
  { code: "+880", flag: "🇧🇩", name: "Bangladesh" },
  { code: "+55", flag: "🇧🇷", name: "Brazil" }, { code: "+52", flag: "🇲🇽", name: "Mexico" },
  { code: "+54", flag: "🇦🇷", name: "Argentina" }, { code: "+56", flag: "🇨🇱", name: "Chile" },
  { code: "+57", flag: "🇨🇴", name: "Colombia" }, { code: "+51", flag: "🇵🇪", name: "Peru" },
  { code: "+58", flag: "🇻🇪", name: "Venezuela" }, { code: "+593", flag: "🇪🇨", name: "Ecuador" },
  { code: "+27", flag: "🇿🇦", name: "South Africa" }, { code: "+234", flag: "🇳🇬", name: "Nigeria" },
  { code: "+254", flag: "🇰🇪", name: "Kenya" }, { code: "+20", flag: "🇪🇬", name: "Egypt" },
  { code: "+212", flag: "🇲🇦", name: "Morocco" }, { code: "+216", flag: "🇹🇳", name: "Tunisia" },
];

const ContactModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [countryCode, setCountryCode] = useState("+1");
  const [submitted, setSubmitted] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const selectedCountry = ALL_COUNTRIES.find(c => c.code === countryCode) || ALL_COUNTRIES[0];
  const filteredCountries = countrySearch
    ? ALL_COUNTRIES.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch))
    : ALL_COUNTRIES;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
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
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="h-10 rounded-md border border-border bg-secondary/50 px-2 text-sm text-foreground w-24 flex items-center gap-1 justify-center"
                    >
                      <span>{selectedCountry.flag}</span>
                      <span className="text-xs">{selectedCountry.code}</span>
                    </button>
                    {showCountryDropdown && (
                      <div className="absolute top-full left-0 mt-1 w-64 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-xl z-50">
                        <div className="sticky top-0 bg-card p-2 border-b border-border">
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search country…"
                            className="w-full rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                            autoFocus
                          />
                        </div>
                        {filteredCountries.map((c, i) => (
                          <button
                            key={`${c.code}-${c.name}-${i}`}
                            type="button"
                            onClick={() => { setCountryCode(c.code); setShowCountryDropdown(false); setCountrySearch(""); }}
                            className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary/50 flex items-center gap-2 transition-colors"
                          >
                            <span>{c.flag}</span>
                            <span className="flex-1">{c.name}</span>
                            <span className="text-muted-foreground text-xs">{c.code}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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
  const [loginGateOpen, setLoginGateOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<typeof plans[0] | null>(null);
  const { user } = useAuth();

  const handleCheckout = (plan: typeof plans[0]) => {
    if (plan.isContact) {
      setContactOpen(true);
      return;
    }
    if (!plan.stripePriceMonthly && !plan.stripePriceAnnual) {
      document.querySelector("input[type='url']")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!user) {
      setLoginGateOpen(true);
      return;
    }
    setCheckoutPlan(plan);
  };

  const checkoutPriceId = checkoutPlan
    ? (annual ? checkoutPlan.stripePriceAnnual : checkoutPlan.stripePriceMonthly)
    : null;

  return (
    <section id="pricing" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
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
            <button onClick={() => setAnnual(!annual)}
              className={`relative h-6 w-11 rounded-full transition-colors ${annual ? "bg-primary" : "bg-border"}`}>
              <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-card shadow transition-transform ${annual ? "translate-x-5" : ""}`} />
            </button>
            <span className={`text-xs font-medium transition-colors ${annual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual <span className="text-primary font-semibold">-50%</span>
            </span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto items-stretch">
          {plans.map((plan, i) => {
            const Icon = plan.icon;
            const price = annual ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <motion.div key={plan.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className={`rounded-2xl border p-6 flex flex-col ${
                  plan.highlighted ? "border-primary/30 bg-card glow-primary relative" : "border-border bg-card"
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
                <div className="flex items-baseline gap-1 mb-1">
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
                {annual && price !== null && price > 0 && (
                  <p className="text-[10px] text-muted-foreground mb-5">${price * 12}/year billed annually</p>
                )}
                {!annual && price !== null && price > 0 && (
                  <p className="text-[10px] text-muted-foreground mb-5">billed monthly</p>
                )}
                {(price === null || price === 0) && <div className="mb-5" />}
                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
                <Button variant={plan.ctaVariant} className="w-full mt-auto"
                  onClick={() => handleCheckout(plan)}>
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
      <LoginGateModal open={loginGateOpen} onClose={() => setLoginGateOpen(false)} onSuccess={() => setLoginGateOpen(false)} />
      {checkoutPriceId && checkoutPlan && (
        <StripeCheckoutOverlay
          open={!!checkoutPriceId}
          onClose={() => setCheckoutPlan(null)}
          priceId={checkoutPriceId}
          planName={checkoutPlan.name}
          features={checkoutPlan.features}
        />
      )}
    </section>
  );
};

export default PricingSection;
