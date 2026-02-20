import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AnalysisLoader from "@/components/AnalysisLoader";
import LoginGateModal from "@/components/LoginGateModal";
import ScorePreview from "@/components/ScorePreview";

const HeroSection = () => {
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  const runAnalysis = useCallback(async (listingUrl: string) => {
    setAnalyzeError("");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-property", {
        body: { url: listingUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.data?.id) {
        navigate(`/analysis/${data.data.id}`);
      }
    } catch (e: any) {
      setAnalyzeError(e.message || "Analysis failed.");
      setShowResults(false);
    }
  }, [navigate]);

  const handleAnalyze = () => {
    if (!url.trim()) return;
    setAnalyzing(true);
    setShowResults(false);
    setAnalyzeError("");
  };

  const handleAnalysisComplete = useCallback(() => {
    setAnalyzing(false);
    if (!user) {
      setShowResults(true);
      setShowLoginGate(true);
    } else {
      runAnalysis(url);
    }
  }, [user, url, runAnalysis]);

  const handleLoginClose = () => {
    setShowLoginGate(false);
    // After login, if user is now authenticated, run the analysis
    if (user && url.trim()) {
      runAnalysis(url);
    }
  };

  // Re-check after auth state changes
  const handleLoginSuccess = () => {
    setShowLoginGate(false);
    setShowResults(false);
    // Small delay for auth state to propagate
    setTimeout(() => {
      if (url.trim()) runAnalysis(url);
    }, 500);
  };

  const isBlurred = showResults && !user;

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      <div className="absolute inset-0 bg-gradient-hero opacity-60" />
      <div className="absolute inset-0 grid-pattern opacity-15" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/2 blur-[160px]" />

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
            className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 mb-8"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-xs font-medium text-primary">AI-Powered Real Estate Intelligence</span>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] mb-6">
            Paste Any Listing.{" "}
            <span className="text-gradient-primary">Know If It's a Good Deal — Instantly.</span>
          </h1>

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            We analyze risk, ROI, demand, liquidity, and market strength — so you don't buy blind.
          </p>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-2xl mx-auto mb-4"
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-cta rounded-2xl opacity-10 group-focus-within:opacity-20 blur transition-opacity duration-300" />
              <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-xl border border-border p-2 sm:p-3">
                <div className="flex items-center flex-1 min-w-0">
                  <Search className="ml-2 sm:ml-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="Paste any Zillow, Idealista, Rightmove, or Airbnb URL…"
                    className="flex-1 bg-transparent px-3 sm:px-4 py-4 sm:py-5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                  />
                </div>
                <Button variant="hero" size="lg" className="rounded-lg h-12 sm:h-14 px-4 sm:px-6 text-sm sm:text-base flex-shrink-0" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing ? "Analyzing…" : "Analyze Property — Free"} <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline" />
                </Button>
              </div>
            </div>
          </motion.div>

          {analyzeError && <p className="text-xs text-destructive mb-4">{analyzeError}</p>}

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
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className={`max-w-4xl mx-auto mt-16 sm:mt-20 relative ${isBlurred ? "select-none" : ""}`}
            >
              {isBlurred && (
                <div className="absolute inset-0 z-10 backdrop-blur-md rounded-2xl" />
              )}
              <ScorePreview />
            </motion.div>
          )}
        </AnimatePresence>

        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="max-w-4xl mx-auto mt-16 sm:mt-20"
          >
            <ScorePreview />
          </motion.div>
        )}
      </div>

      <AnalysisLoader active={analyzing} onComplete={handleAnalysisComplete} />
      <LoginGateModal open={showLoginGate} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />
    </section>
  );
};

export default HeroSection;
