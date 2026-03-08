import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Search, Layers, Brain, Database, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoginGateModal from "@/components/LoginGateModal";
import { supabase } from "@/integrations/supabase/client";

const HeroSection = () => {
  const [url, setUrl] = useState("");
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [totalAnalyses, setTotalAnalyses] = useState<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const pendingUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K shortcut to focus input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch real total analyses count
  useEffect(() => {
    const cached = sessionStorage.getItem("rh_total_analyses");
    if (cached) { setTotalAnalyses(parseInt(cached, 10)); return; }
    supabase.from("analyses").select("id", { count: "exact", head: true }).then(({ count }) => {
      const total = count || 0;
      setTotalAnalyses(total);
      sessionStorage.setItem("rh_total_analyses", String(total));
    });
  }, []);

  const handleAnalyze = () => {
    if (!url.trim()) return;
    if (!user) {
      pendingUrlRef.current = url.trim();
      setShowLoginGate(true);
      return;
    }
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  const handleLoginClose = () => setShowLoginGate(false);
  const handleLoginSuccess = () => setShowLoginGate(false);

  useEffect(() => {
    if (user && pendingUrlRef.current) {
      const pendingUrl = pendingUrlRef.current;
      pendingUrlRef.current = null;
      navigate(`/analysis/loading?url=${encodeURIComponent(pendingUrl)}`);
    }
  }, [user, navigate]);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-16">
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

          <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed">
            We analyze risk, ROI, demand, liquidity, and market strength — so you don't buy blind.
          </p>

          {totalAnalyses !== null && totalAnalyses > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="text-sm font-medium text-muted-foreground mb-10"
            >
              <span className="text-foreground font-semibold">{totalAnalyses.toLocaleString()}+</span> properties analyzed worldwide
            </motion.p>
          )}

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-2xl mx-auto mb-4"
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-cta rounded-2xl opacity-10 group-focus-within:opacity-40 blur transition-opacity duration-300" />
              <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-xl border border-border p-2 sm:p-3">
                <div className="flex items-center flex-1 min-w-0">
                  <Search className="ml-2 sm:ml-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <input
                    ref={inputRef}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    placeholder="Paste any property listing URL…"
                    className="flex-1 bg-transparent px-3 sm:px-4 py-4 sm:py-5 text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
                  />
                  <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground mr-2">⌘K</kbd>
                </div>
                <Button variant="hero" size="lg" className="rounded-lg h-12 sm:h-14 px-4 sm:px-6 text-sm sm:text-base flex-shrink-0 group" onClick={handleAnalyze}>
                  Analyze Property — Free <ArrowRight className="ml-1 h-4 w-4 hidden sm:inline transition-transform group-hover:translate-x-0.5" />
                </Button>
              </div>
            </div>
          </motion.div>

          <p className="text-xs text-muted-foreground mb-3">
            5 free analyses · No credit card · 50+ platforms supported
          </p>

          {/* AI Trust Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex items-center justify-center gap-4 sm:gap-6 mb-4 flex-wrap"
          >
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Brain className="h-3.5 w-3.5 text-primary" /> AI-Powered Analysis
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Database className="h-3.5 w-3.5 text-primary" /> 50+ Data Sources
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" /> 30-Second Reports
            </span>
          </motion.div>

          {/* Real social proof counter */}
          {totalAnalyses !== null && totalAnalyses > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-score-excellent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-score-excellent" />
              </span>
              <span className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{totalAnalyses.toLocaleString()}</span>{" "}
                properties analyzed worldwide
              </span>
            </motion.div>
          )}

          {/* Bulk Analyze CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <button
              onClick={() => {
                if (!user) { setShowLoginGate(true); return; }
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
      </div>

      <LoginGateModal open={showLoginGate} onClose={handleLoginClose} onSuccess={handleLoginSuccess} />
    </section>
  );
};

export default HeroSection;
