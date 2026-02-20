import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AnalysisLoader from "@/components/AnalysisLoader";
import LoginGateModal from "@/components/LoginGateModal";

const HeroSection = () => {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const { user } = useAuth();

  const handleAnalyze = () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setShowResults(false);
  };

  const handleAnalysisComplete = useCallback(() => {
    setAnalyzing(false);
    setShowResults(true);
    if (!user) {
      setShowLoginGate(true);
    }
  }, [user]);

  const handleLoginClose = () => {
    setShowLoginGate(false);
  };

  const isBlurred = showResults && !user;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-hero opacity-80" />
      <div className="absolute inset-0 grid-pattern opacity-20" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[140px]" />

      <div className="container relative mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-xs font-medium text-primary">AI-Powered Real Estate Intelligence</span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6">
            Paste Any Listing.{" "}
            <span className="text-gradient-primary">Know If It's a Good Deal.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            We analyze risk, ROI, demand, liquidity, and market strength — so you don't buy blind.
          </p>

          {/* URL Input — 15% larger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-2xl mx-auto mb-4"
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-cta rounded-2xl opacity-15 group-focus-within:opacity-30 blur transition-opacity duration-300" />
              <div className="relative flex items-center bg-card rounded-xl border border-border p-2.5">
                <Search className="ml-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  placeholder="Paste any Zillow, Idealista, Rightmove, or Airbnb URL…"
                  className="flex-1 bg-transparent px-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <Button variant="hero" size="lg" className="rounded-lg h-12 px-6" onClick={handleAnalyze}>
                  Analyze Property — Free <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          <p className="text-xs text-muted-foreground mb-8">
            3 free analyses · No credit card · 50+ platforms supported
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-center justify-center gap-4"
          >
            <Button variant="hero-outline" size="sm" onClick={() => { setShowResults(true); }}>
              See Example Report
            </Button>
          </motion.div>
        </motion.div>

        {/* Score Preview */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className={`max-w-4xl mx-auto mt-20 relative ${isBlurred ? "select-none" : ""}`}
          >
            {isBlurred && (
              <div className="absolute inset-0 z-10 backdrop-blur-md rounded-2xl" />
            )}
            <ScorePreview />
          </motion.div>
        )}

        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="max-w-4xl mx-auto mt-20"
          >
            <ScorePreview />
          </motion.div>
        )}
      </div>

      <AnalysisLoader active={analyzing} onComplete={handleAnalysisComplete} />
      <LoginGateModal open={showLoginGate} onClose={handleLoginClose} />
    </section>
  );
};

const ScorePreview = () => {
  const subscores = [
    { label: "ROI Potential", value: 82, color: "bg-score-excellent" },
    { label: "Market Stability", value: 74, color: "bg-score-good" },
    { label: "Demand Strength", value: 91, color: "bg-score-excellent" },
    { label: "Risk Level", value: 68, color: "bg-score-average" },
    { label: "Liquidity Outlook", value: 77, color: "bg-score-good" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Score Circle */}
        <div className="relative flex-shrink-0">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="264"
              strokeDashoffset="50"
              className="animate-score-fill"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground font-mono">81</span>
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Global Score</span>
          </div>
        </div>

        {/* Subscores */}
        <div className="flex-1 w-full space-y-3">
          {subscores.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{s.label}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.value}%` }}
                  transition={{ delay: 1, duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${s.color}`}
                />
              </div>
              <span className="text-xs font-mono text-foreground w-8 text-right">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Insight line */}
      <div className="mt-5 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Performs better than</span>
        <span className="text-xs font-mono font-semibold text-primary">72%</span>
        <span className="text-xs text-muted-foreground">of listings in this area.</span>
      </div>

      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="text-xs font-medium text-primary mb-1">Primary Insight</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This property is slightly overpriced relative to comparable listings. ROI potential is above average for this region, though moderate risk exists due to recent regulatory changes.
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-primary font-medium">AI Summary:</span> Strong demand signals in a stabilizing market. Liquidity is favorable with average days-on-market below the regional median. Priced 6% above median market value.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;
