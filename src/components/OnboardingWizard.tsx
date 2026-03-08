import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  Search,
  BarChart3,
  Trophy,
  Gamepad2,
  ArrowRight,
  X,
  Sparkles,
} from "lucide-react";

const ONBOARDING_KEY = "realhunt_onboarding_done";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to RealHunt! 🎯",
    description:
      "Your AI-powered real estate intelligence platform. Analyze any property listing worldwide and get an instant investment score.",
    color: "text-primary",
  },
  {
    icon: Search,
    title: "Paste Any Listing URL",
    description:
      "Go to your Dashboard, paste a property URL from any site (Idealista, Zillow, Rightmove...) and our AI will analyze risk, ROI, demand & liquidity in seconds.",
    color: "text-primary",
  },
  {
    icon: BarChart3,
    title: "Get Your Forensic Report",
    description:
      "Each report includes a global score out of 100, pros & cons, red flags, alternatives, and an AI investment narrative. Share it or save it.",
    color: "text-primary",
  },
  {
    icon: Trophy,
    title: "Explore Rankings & Game",
    description:
      "Check the global property Rankings to discover top-rated deals, or play Deal or No Deal to test your investment instincts!",
    color: "text-primary",
  },
];

const OnboardingWizard = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      finish();
      navigate("/dashboard");
    }
  };

  if (!show) return null;

  const current = steps[step];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) finish();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-secondary">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={finish}
            className="absolute top-4 right-4 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Content */}
          <div className="p-8 pt-10 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                  <current.icon className={`h-8 w-8 ${current.color}`} />
                </div>

                <h2 className="text-xl font-bold text-foreground mb-3">
                  {current.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {current.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 pb-8 flex items-center justify-between">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step
                      ? "w-6 bg-primary"
                      : i < step
                      ? "w-1.5 bg-primary/40"
                      : "w-1.5 bg-secondary"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {step < steps.length - 1 && (
                <Button variant="ghost" size="sm" onClick={finish}>
                  Skip
                </Button>
              )}
              <Button variant="hero" size="sm" onClick={next}>
                {step < steps.length - 1 ? (
                  <>
                    Next <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                ) : (
                  <>
                    Go to Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OnboardingWizard;
