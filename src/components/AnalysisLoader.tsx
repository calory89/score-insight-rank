import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const steps = [
  "Analyzing market signals…",
  "Comparing with regional data…",
  "Calculating risk exposure…",
];

interface AnalysisLoaderProps {
  active: boolean;
  onComplete: () => void;
}

const AnalysisLoader = ({ active, onComplete }: AnalysisLoaderProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!active) {
      setCurrentStep(0);
      return;
    }

    const timers = steps.map((_, i) =>
      setTimeout(() => {
        setCurrentStep(i);
        if (i === steps.length - 1) {
          setTimeout(onComplete, 1200);
        }
      }, i * 1400)
    );

    return () => timers.forEach(clearTimeout);
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-background/90 backdrop-blur-sm"
    >
      <div className="text-center">
        <div className="relative mx-auto mb-8 h-16 w-16">
          <div className="absolute inset-0 rounded-full border-2 border-border" />
          <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" />
          <div className="absolute inset-2 rounded-full border border-primary/20" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground font-medium"
          >
            {steps[currentStep]}
          </motion.p>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-1.5 mt-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? "w-8 bg-primary" : "w-4 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default AnalysisLoader;
