import { useState } from "react";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import StripeCheckoutOverlay from "@/components/StripeCheckoutOverlay";
import { useAuth } from "@/contexts/AuthContext";

const PLANS = [
  {
    id: "investor",
    name: "Investor",
    priceLabel: "€19",
    cadence: "/month",
    tagline: "For solo buyers running the numbers.",
    priceId: "price_1TdzpNJ3dZ2FxAKF4TrhJCIH",
    features: [
      "Unlimited property scores after the 5 free",
      "Full forensic report (5 dimensions + verdict)",
      "Save, compare, and revisit",
      "Cancel anytime",
    ],
    highlighted: false,
  },
  {
    id: "agent_pro",
    name: "Agent Pro",
    priceLabel: "€39",
    cadence: "/month",
    tagline: "For working real-estate agents.",
    priceId: "price_1TdzqGJ3dZ2FxAKFTwNUxMYt",
    features: [
      "Everything in Investor",
      "Branded send-to-client PDF dossier",
      "“Verified by RealHunt” badge for your listings",
      "WhatsApp short-link sharing",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    id: "developer",
    name: "Developer",
    priceLabel: "€390",
    cadence: "/month",
    tagline: "For developers placing projects.",
    priceId: "price_1TdzqcJ3dZ2FxAKF8lTFnAKL",
    features: [
      "Your projects independently analyzed",
      "Featured placement in /rankings",
      "Conflict-of-interest disclosure built-in",
      "Lead notifications from agents",
    ],
    highlighted: false,
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checkoutPlan, setCheckoutPlan] = useState<typeof PLANS[0] | null>(null);

  useDocumentMeta({
    title: "Pricing — RealHunt",
    description: "Three plans. Independent scoring, branded reports for agents, and featured placement for developers.",
    canonicalUrl: "https://realhunt.co/pricing",
  });

  const start = (plan: typeof PLANS[0]) => {
    if (!user) {
      navigate(`/auth/sign-up?redirect=${encodeURIComponent("/pricing")}`);
      return;
    }
    setCheckoutPlan(plan);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[1140px] mx-auto px-6 py-12 md:py-20">
        <div className="text-[12px] uppercase tracking-[0.2em] text-ink-soft">Pricing</div>
        <h1 className="font-display text-[40px] md:text-[56px] leading-[1.05] mt-2">
          Pick the plan that fits how you buy<span className="text-accent-gold">.</span>
        </h1>
        <p className="reading text-ink-muted mt-3 max-w-[640px]">
          Independent. No paid placement in rankings — ever. The 5 free scores stay free for everyone.
        </p>

        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 flex flex-col bg-surface ${
                p.highlighted ? "border-accent-gold shadow-[0_4px_30px_-12px_rgba(184,146,74,0.35)]" : "border-hairline"
              }`}
            >
              {p.highlighted && (
                <span className="text-[10px] uppercase tracking-[0.18em] text-accent-gold font-medium mb-2">
                  Most chosen
                </span>
              )}
              <h3 className="font-display text-[24px] text-ink">{p.name}</h3>
              <p className="text-[13px] text-ink-muted mt-1">{p.tagline}</p>
              <div className="flex items-baseline gap-1 mt-5">
                <span className="font-display text-[42px] text-ink">{p.priceLabel}</span>
                <span className="text-[13px] text-ink-soft">{p.cadence}</span>
              </div>
              <ul className="mt-5 space-y-2.5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[13px] text-ink-muted">
                    <Check className="h-4 w-4 text-accent-gold flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => start(p)}
                className={`mt-6 inline-flex items-center justify-center gap-1 rounded-full px-5 py-3 text-[14px] transition-colors ${
                  p.highlighted
                    ? "bg-ink text-paper hover:bg-ink/90"
                    : "border border-hairline text-ink hover:bg-[#FBF8F1]"
                }`}
              >
                Choose {p.name} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-10 text-[12px] text-ink-soft">
          Secure checkout by Stripe · Cancel anytime · VAT added where applicable
        </div>
      </main>
      <RHFooter />

      {checkoutPlan && (
        <StripeCheckoutOverlay
          open={!!checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          priceId={checkoutPlan.priceId}
          planName={checkoutPlan.name}
          features={checkoutPlan.features}
        />
      )}
    </div>
  );
};

export default Pricing;
