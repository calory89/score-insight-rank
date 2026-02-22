import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const stripePromise = loadStripe(
  "pk_live_51T3QY3J3dZ2FxAKFOiVODIPVwu98lFrMTm3xOxA0R2u2Vy3VrxVHv2CaOcW9n9EsJxwCgHjLK1sUdOxS2Oc5j6Y00wjJAH0yc"
);

interface Props {
  open: boolean;
  onClose: () => void;
  priceId: string;
  planName: string;
  features: string[];
}

const StripeCheckoutOverlay = ({ open, onClose, priceId, planName, features }: Props) => {
  const fetchClientSecret = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { priceId },
    });
    if (error || !data?.clientSecret) throw new Error("Could not start checkout");
    return data.clientSecret;
  }, [priceId]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl flex flex-col lg:flex-row"
        >
          {/* Left: Benefits panel */}
          <div className="hidden lg:flex flex-col justify-center w-80 flex-shrink-0 p-8 bg-secondary/30 border-r border-border">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Upgrading to {planName}
            </h3>
            <p className="text-xs text-muted-foreground mb-6">
              Unlock powerful features to make smarter investments.
            </p>
            <ul className="space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2 mt-8 text-[10px] text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              Secured by Stripe. Cancel anytime.
            </div>
          </div>

          {/* Right: Stripe Embedded Checkout */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <span className="text-sm font-medium text-foreground lg:hidden">
                Upgrade to {planName}
              </span>
              <span className="text-sm font-medium text-foreground hidden lg:block">
                Complete your purchase
              </span>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              <EmbeddedCheckoutProvider
                stripe={stripePromise}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StripeCheckoutOverlay;
