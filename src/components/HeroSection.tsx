import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search, Layers } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoginGateModal from "@/components/LoginGateModal";
import ScorePreview from "@/components/ScorePreview";
import ExampleReportsCarousel from "@/components/ExampleReportsCarousel";

const HeroSection = () => {
  const [url, setUrl] = useState("");
  const [showLoginGate, setShowLoginGate] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Store pending URL so we can navigate after auth state updates
  const pendingUrlRef = useRef<string | null>(null);

  const handleAnalyze = () => {
    if (!url.trim()) return;
    if (!user) {
      pendingUrlRef.current = url.trim();
      setShowLoginGate(true);
      return;
    }
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  const handleLoginClose = () => {
    setShowLoginGate(false);
  };

  const handleLoginSuccess = () => {
    setShowLoginGate(false);
    // Store the URL, will navigate once auth state updates via useEffect
  };

  // Watch for auth state changes — if user just logged in and has a pending URL, navigate
  useEffect(() => {
    if (user && pendingUrlRef.current) {
      const pendingUrl = pendingUrlRef.current;
      pendingUrlRef.current = null;
      navigate(`/analysis/loading?url=${encodeURIComponent(pendingUrl)}`);
    }
  }, [user, navigate]);



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
                    placeholder="Paste any Zillow, Rightmove, Redfin, or Airbnb URL…"
                    className="flex-1 bg-transparent px-3 sm:px-4 py-4 sm:py-5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                  />
                </div>
                <Button variant="hero" size="lg" className="rounded-lg h-12 sm:h-14 px-4 sm:px-6 text-sm sm:text-base flex-shrink-0" onClick={handleAnalyze}>
                  Analyze Property — Free <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline" />
                </Button>
              </div>
            </div>
          </motion.div>

          <p className="text-xs text-muted-foreground mb-2">
            5 free analyses · No credit card · 50+ platforms supported
          </p>

          {/* Bulk Analyze CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mb-4"
          >
            <button
              onClick={() => {
                if (!user) {
                  setShowLoginGate(true);
                  return;
                }
                navigate("/dashboard?bulk=true");
              }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 px-4 py-2 transition-colors group"
            >
              <Layers className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Bulk Analyze — Paste Multiple Links at Once</span>
              <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </motion.div>
        </motion.div>

        {/* Example Reports Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="max-w-5xl mx-auto mt-16 sm:mt-20" id="example-reports"
        >
          <div className="text-center mb-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Reports Searched by Real Users</p>
          </div>
          <ExampleReportsCarousel />
        </motion.div>
      </div>

      <LoginGateModal open={showLoginGate} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />
    </section>
  );
};

export default HeroSection;
