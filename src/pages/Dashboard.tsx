import { useEffect, useState } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Search, ArrowRight, Calendar, Building2, TrendingUp, MapPin, Globe,
  Shield, BarChart3, Heart, GitCompare, Filter, Star, Crown, Zap, Layers, X, Lock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";

const verdictColor = (v: string) => {
  if (v === "Exceptional") return "text-score-excellent bg-score-excellent/10";
  if (v === "Strong") return "text-score-good bg-score-good/10";
  if (v === "Moderate") return "text-score-average bg-score-average/10";
  return "text-score-poor bg-score-poor/10";
};

const scoreColor = (v: number) => {
  if (v >= 80) return "text-score-excellent";
  if (v >= 65) return "text-score-good";
  if (v >= 50) return "text-score-average";
  return "text-score-poor";
};

const riskLabel = (v: number) => {
  if (v >= 80) return { label: "Very Safe", color: "text-score-excellent" };
  if (v >= 60) return { label: "Safe", color: "text-score-average" };
  return { label: "Caution", color: "text-score-poor" };
};

const FREE_LIMIT = 5;

const UpgradeModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const navigate = useNavigate();
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border border-primary/30 bg-card p-8 shadow-xl text-center">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">You've hit your free limit</h3>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
            You've used all <strong>{FREE_LIMIT} free analyses</strong> this month. Upgrade to Pro to unlock <strong>300 analyses/month</strong>, advanced ROI breakdowns, risk classification, PDF exports, and more.
          </p>
          <div className="space-y-3 text-left mb-6">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Zap className="h-3.5 w-3.5 text-primary" /> Save time — analyze 300 properties/month</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="h-3.5 w-3.5 text-primary" /> Never miss a deal — risk classification & red flags</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Make money — advanced ROI & financial breakdowns</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><GitCompare className="h-3.5 w-3.5 text-primary" /> Compare up to 4 properties side-by-side</div>
          </div>
          <Button variant="hero" className="w-full mb-3" onClick={() => { onClose(); navigate("/#pricing"); }}>
            Upgrade to Pro — $29/mo
          </Button>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Maybe later</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Bulk Analyze Modal
// Bulk analyze loading steps (similar to single analysis FOMO loader)
const bulkSteps = [
  { text: "Accessing listing page…", sub: "Extracting real property data" },
  { text: "Reading price, size & features…", sub: "Parsing listing content" },
  { text: "Analyzing market signals…", sub: "Comparing 450+ listings in the area" },
  { text: "Running neighborhood intelligence…", sub: "Walk score, transit, safety analysis" },
  { text: "Computing financial models…", sub: "Mortgage scenarios, IRR, break-even" },
  { text: "Building comparable database…", sub: "Finding similar sales & rentals" },
  { text: "Calculating risk exposure…", sub: "Stress tests & exit strategy" },
  { text: "Generating forensic report…", sub: "Final score calibration" },
];

const BulkAnalyzeModal = ({ open, onClose, isPro, onUpgrade, user }: { open: boolean; onClose: () => void; isPro: boolean; onUpgrade: () => void; user: any }) => {
  const navigate = useNavigate();
  const [urls, setUrls] = useState("");
  const [bulkResults, setBulkResults] = useState<any[]>(() => {
    try {
      const stored = sessionStorage.getItem("bulkResults");
      if (stored) {
        sessionStorage.removeItem("bulkResults");
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  });
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentUrl, setCurrentUrl] = useState("");
  const { toast } = useToast();

  if (!open) return null;

  const parseUrls = (text: string): string[] => {
    return text
      .split(/[\n\r,\t ]+/)
      .map(l => l.trim())
      .filter(l => l.length > 8 && (l.startsWith("http") || l.includes(".")));
  };

  const detectedUrls = parseUrls(urls);

  const handleBulk = async () => {
    if (!isPro) {
      onUpgrade();
      return;
    }
    if (detectedUrls.length === 0) return;

    setBulkRunning(true);
    setBulkResults([]);
    setBulkProgress(0);
    setBulkTotal(detectedUrls.length);
    setCurrentStep(0);

    const results: any[] = [];
    for (let i = 0; i < detectedUrls.length; i++) {
      setBulkProgress(i + 1);
      setCurrentUrl(detectedUrls[i]);
      setCurrentStep(0);

      // Simulate step progression for each URL
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => Math.min(prev + 1, bulkSteps.length - 1));
      }, 3000);

      try {
        const { data: result, error } = await supabase.functions.invoke("analyze-property", {
          body: { url: detectedUrls[i] },
        });
        clearInterval(stepInterval);
        if (error) throw error;
        if (result?.data) {
          results.push(result.data);
        }
      } catch (e: any) {
        clearInterval(stepInterval);
        results.push({ url: detectedUrls[i], error: true, address: detectedUrls[i] });
      }
      setBulkResults([...results]);
    }

    setBulkRunning(false);
    toast({ title: `✅ ${results.filter(r => !r.error).length} of ${detectedUrls.length} analyzed successfully` });
  };

    // Only show 100% when bulk is truly finished
    const rawPercent = bulkTotal > 0 ? Math.round(((bulkProgress - 1 + (currentStep + 1) / bulkSteps.length) / bulkTotal) * 100) : 0;
    const overallPercent = bulkRunning ? Math.min(rawPercent, 99) : (bulkResults.length > 0 ? 100 : 0);

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={bulkRunning ? undefined : onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-2xl border border-primary/30 bg-card p-6 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Bulk Analyze</h3>
            </div>
            {!bulkRunning && <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>}
          </div>

          {bulkRunning ? (
            /* FOMO-style loading view */
            <div className="space-y-6">
              {/* Overall progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Overall Progress</span>
                  <span className="text-sm font-mono font-bold text-primary">{overallPercent}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-cta"
                    animate={{ width: `${overallPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Property {bulkProgress} of {bulkTotal}
                </p>
              </div>

              {/* Current analysis loader */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mx-auto mb-4 h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-2 border-border" />
                    <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" style={{ animationDuration: "1.5s" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={currentStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.3 }}>
                      <p className="text-sm font-semibold text-foreground mb-0.5">{bulkSteps[currentStep]?.text}</p>
                      <p className="text-[10px] text-muted-foreground">{bulkSteps[currentStep]?.sub}</p>
                    </motion.div>
                  </AnimatePresence>
                  <p className="text-[10px] text-muted-foreground mt-3 truncate max-w-[280px]">{currentUrl}</p>
                  {/* Step dots */}
                  <div className="flex items-center gap-1 mt-3">
                    {bulkSteps.map((_, idx) => (
                      <div key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx <= currentStep ? "w-4 bg-primary" : "w-2 bg-border"}`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Already completed results */}
              {bulkResults.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">✅ Completed ({bulkResults.length})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {bulkResults.map((r, i) => (
                      <div key={i} className={`rounded-lg border p-2.5 text-xs ${r.error ? "border-destructive/20 bg-destructive/5" : "border-border bg-secondary/30"}`}>
                        {r.error ? (
                          <span className="text-destructive">Failed</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold ${scoreColor(r.global_score || 0)}`}>{r.global_score}</span>
                            <span className="text-muted-foreground truncate">{r.address || r.city || "Property"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : bulkResults.length > 0 ? (
            /* Results view */
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {bulkResults.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      if (r.id && !r.error) {
                        // Store bulk results in sessionStorage so we can return here
                        sessionStorage.setItem("bulkResults", JSON.stringify(bulkResults));
                        onClose();
                        navigate(`/analysis/${r.id}?from=bulk`);
                      }
                    }}
                    className={`rounded-xl border p-4 transition-all ${
                      r.error
                        ? "border-destructive/30 bg-destructive/5 cursor-default"
                        : "border-border bg-card hover:border-primary/30 cursor-pointer group"
                    }`}
                  >
                    {r.error ? (
                      <div>
                        <p className="text-xs text-destructive font-medium mb-1">Failed</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.address}</p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-2xl font-bold font-mono ${scoreColor(r.global_score || 0)}`}>
                            {r.global_score || "—"}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${verdictColor(r.verdict || "")}`}>
                            {r.verdict || "—"}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-foreground truncate">{r.address || r.city || "Property"}</p>
                        <p className="text-[10px] text-muted-foreground">{r.city}{r.city && r.country ? ", " : ""}{r.country}</p>
                        {r.price && <p className="text-xs font-mono text-foreground mt-1">{r.price}</p>}
                        <p className="text-[10px] text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          View full report <ArrowRight className="h-2.5 w-2.5" />
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => { setBulkResults([]); setUrls(""); }}>
                Analyze More
              </Button>
            </div>
          ) : (
            /* Input view */
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Paste multiple property URLs — separated by new lines, spaces, or commas.
              </p>
              {!isPro && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary flex-shrink-0" />
                  <p className="text-xs text-primary">Bulk Analyze is a <strong>Pro feature</strong>. Upgrade to analyze multiple properties at once.</p>
                </div>
              )}
              <Textarea
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={"https://www.zillow.com/homedetails/...\nhttps://www.rightmove.co.uk/properties/...\nhttps://www.redfin.com/...\nhttps://www.airbnb.com/rooms/...\n\nPaste as many URLs as you want — one per line, separated by spaces or commas."}
                className={`text-sm font-mono mb-4 transition-all duration-300 ${detectedUrls.length > 0 ? "min-h-[220px]" : "min-h-[160px]"}`}
                disabled={!isPro}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {detectedUrls.length} URL{detectedUrls.length !== 1 ? "s" : ""} detected
                </span>
                <Button variant="hero" size="sm" onClick={handleBulk} disabled={bulkRunning}>
                  {isPro ? (
                    <>Analyze All ({detectedUrls.length}) <ArrowRight className="ml-1 h-3.5 w-3.5" /></>
                  ) : (
                    <>Upgrade to Pro <Crown className="ml-1 h-3.5 w-3.5" /></>
                  )}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Dashboard = () => {
  useDocumentMeta({ title: "My Dashboard | RealHunt", description: "View and manage your property analyses, favorites, and investment insights." });
  const { user, loading: authLoading } = useAuth();
  const { isPro, creditsUsed, creditsTotal } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [sortBy, setSortBy] = useState<"date" | "score">("date");

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  // Subscription success celebration
  useEffect(() => {
    if (searchParams.get("subscription") === "success") {
      setTimeout(() => {
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ["#0faf6e", "#4ade80", "#facc15", "#ffffff"] });
        toast({ title: "🎉 Welcome to Pro!", description: "Your subscription is active. Start analyzing unlimited properties!" });
      }, 500);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    // Load analyses and favorites in parallel (subscription comes from context)
    Promise.all([
      supabase.from("analyses").select("*").order("created_at", { ascending: false }),
      supabase.from("favorites").select("analysis_id").eq("user_id", user.id),
    ]).then(([{ data: analysesData }, { data: favData }]) => {
      setAnalyses(analysesData || []);
      setFavoriteIds(new Set((favData || []).map((f: any) => f.analysis_id)));
      setLoading(false);
    });
    // Open bulk modal if came from hero CTA or returning from bulk analysis
    if (searchParams.get("bulk") === "true") {
      setShowBulk(true);
      window.history.replaceState({}, "", "/dashboard");
    }
  }, [user]);

  const toggleFavorite = async (e: React.MouseEvent, analysisId: string) => {
    e.stopPropagation();
    if (!user) return;
    const isFav = favoriteIds.has(analysisId);
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("analysis_id", analysisId);
      setFavoriteIds(prev => { const n = new Set(prev); n.delete(analysisId); return n; });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, analysis_id: analysisId });
      setFavoriteIds(prev => new Set(prev).add(analysisId));
      toast({ title: "Added to favorites", description: "Property saved to your collection." });
    }
  };

  const toggleCompare = (e: React.MouseEvent, analysisId: string) => {
    e.stopPropagation();
    setCompareIds(prev => {
      const n = new Set(prev);
      if (n.has(analysisId)) n.delete(analysisId);
      else if (n.size < 4) n.add(analysisId);
      else toast({ title: "Max 4 properties", description: "Remove one to add another.", variant: "destructive" });
      return n;
    });
  };

  const handleAnalyze = () => {
    if (!url.trim() || analyzing) return;
    // Basic URL validation
    try {
      const parsed = new URL(url.trim().startsWith("http") ? url.trim() : `https://${url.trim()}`);
      if (!parsed.hostname.includes(".")) throw new Error();
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid property listing URL (e.g. https://idealista.com/...)", variant: "destructive" });
      return;
    }
    // Check free limit using subscription credits (admin bypasses)
    const isAdmin = user?.email === "rrppspain@gmail.com";
    if (!isAdmin && !isPro && creditsUsed >= creditsTotal) {
      setShowUpgrade(true);
      return;
    }
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  if (authLoading || !user) return null;

  const avgScore = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + (a.global_score || 0), 0) / analyses.length) : 0;
  const countriesAnalyzed = [...new Set(analyses.map(a => a.country).filter(Boolean))].length;

    const sortedAnalyses = [...analyses].sort((a, b) => {
      if (sortBy === "score") return (b.global_score || 0) - (a.global_score || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const displayAnalyses = showFavoritesOnly ? sortedAnalyses.filter(a => favoriteIds.has(a.id)) : sortedAnalyses;

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your property intelligence hub.</p>
        </div>

        {/* Stats bar */}
        {analyses.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total Analyses</p>
              <p className="text-2xl font-bold font-mono text-foreground">{analyses.length}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Avg. Score</p>
              <p className={`text-2xl font-bold font-mono ${scoreColor(avgScore)}`}>{avgScore}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Countries</p>
              <p className="text-2xl font-bold font-mono text-foreground">{countriesAnalyzed}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Favorites</p>
              <p className="text-2xl font-bold font-mono text-primary">{favoriteIds.size}</p>
            </div>
          </div>
        )}

        {/* New analysis input */}
        <div className="mb-6">
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-xl border border-border p-2">
            <div className="flex items-center flex-1 min-w-0">
              <Search className="ml-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="Paste any real estate URL to analyze…"
                className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
              />
            </div>
            <Button variant="hero" size="sm" className="rounded-lg px-4 flex-shrink-0" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "Analyzing…" : "Analyze"} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-muted-foreground ml-1">
              Works with Zillow, Airbnb, developer websites, and any real estate page.
            </p>
            <button
              onClick={() => setShowBulk(true)}
              className="text-[10px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
            >
              <Layers className="h-3 w-3" /> Bulk Analyze
            </button>
          </div>
          {analyzeError && <p className="text-xs text-destructive mt-2">{analyzeError}</p>}
        </div>

        {/* Filter + Compare bar */}
        {analyses.length > 0 && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-colors ${
                  showFavoritesOnly ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className="h-3 w-3" /> Favorites{showFavoritesOnly ? ` (${displayAnalyses.length})` : ""}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "date" | "score")}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-card text-muted-foreground focus:outline-none focus:border-primary/40"
              >
                <option value="date">Newest First</option>
                <option value="score">Best Score</option>
              </select>
            </div>
            <AnimatePresence>
              {compareIds.size >= 2 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
                  <Button variant="hero" size="sm" onClick={() => navigate(`/compare?ids=${[...compareIds].join(",")}`)}>
                    <GitCompare className="h-3.5 w-3.5 mr-1" /> Compare {compareIds.size} Properties
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Analyses list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-t-primary border-border animate-spin" />
          </div>
        ) : displayAnalyses.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 rounded-2xl border border-dashed border-border bg-secondary/20"
          >
            {showFavoritesOnly ? (
              <>
                <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm font-medium mb-1">No favorites yet</p>
                <p className="text-xs text-muted-foreground">Click the heart icon on any property to save it here.</p>
              </>
            ) : (
              <>
                <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Analyze your first property</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Paste any real estate listing URL above — from Zillow, Idealista, Rightmove, Airbnb, or any other platform. Get a full AI-powered investment report in seconds.
                </p>
                <Button variant="hero" size="lg" onClick={() => document.querySelector<HTMLInputElement>("input[type='url']")?.focus()}>
                  <Search className="h-4 w-4 mr-2" /> Paste a URL to Start
                </Button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayAnalyses.map((a, i) => {
              const risk = riskLabel(a.risk_level || 0);
              const isFav = favoriteIds.has(a.id);
              const isCompare = compareIds.has(a.id);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/analysis/${a.id}`)}
                  className={`rounded-xl border bg-card overflow-hidden hover:border-primary/20 transition-all cursor-pointer group ${
                    isCompare ? "border-primary/30 ring-1 ring-primary/20" : "border-border"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    {a.image_url ? (
                      <div className="sm:w-40 h-32 sm:h-auto bg-secondary overflow-hidden flex-shrink-0 relative">
                        <img src={a.image_url} alt={a.address || "Property"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 absolute inset-0" />
                      </div>
                    ) : (
                      <div className="sm:w-40 h-20 sm:h-auto bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}

                    <div className="flex-1 p-5">
                      {/* Top row: title + actions + score */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {a.address || `${a.city}, ${a.country}`}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {a.city}, {a.country} · {a.price} · {a.property_type}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Favorite button */}
                          <button
                            onClick={(e) => toggleFavorite(e, a.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isFav ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                            title={isFav ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                          </button>
                          {/* Compare checkbox */}
                          <button
                            onClick={(e) => toggleCompare(e, a.id)}
                            className={`p-1.5 rounded-lg transition-colors ${isCompare ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                            title={isCompare ? "Remove from comparison" : "Add to comparison"}
                          >
                            <GitCompare className="h-4 w-4" />
                          </button>
                          {/* Score */}
                          <div className="h-14 w-14 rounded-lg bg-secondary flex flex-col items-center justify-center">
                            <span className={`font-mono text-xl font-bold ${scoreColor(a.global_score)}`}>{a.global_score}</span>
                            <span className="text-[8px] text-muted-foreground uppercase">score</span>
                          </div>
                        </div>
                      </div>

                      {/* Metrics row */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-3">
                        {a.projected_roi_low != null && a.projected_roi_high != null && (
                          <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <TrendingUp className="h-3 w-3 text-primary" />
                            <span className="text-foreground font-mono font-medium">{a.projected_roi_low}% – {a.projected_roi_high}%</span> ROI (5yr)
                          </span>
                        )}
                        {a.risk_level != null && (
                          <span className={`text-xs flex items-center gap-1 ${risk.color}`}>
                            <Shield className="h-3 w-3" /> {risk.label}
                          </span>
                        )}
                        {a.market_classification && (
                          <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <BarChart3 className="h-3 w-3" /> {a.market_classification}
                          </span>
                        )}
                        {a.data_source === "project_website" && (
                          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-score-average/10 text-score-average border border-score-average/20">
                            Project Site
                          </span>
                        )}
                      </div>

                      {/* AI Summary preview */}
                      {a.ai_summary && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{a.ai_summary}</p>
                      )}

                      {/* Bottom row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${verdictColor(a.verdict)}`}>
                            {a.verdict}
                          </span>
                          {a.confidence_level && (
                            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              a.confidence_level === "high" ? "text-score-excellent bg-score-excellent/10" :
                              a.confidence_level === "medium" ? "text-score-average bg-score-average/10" :
                              "text-score-poor bg-score-poor/10"
                            }`}>
                              {a.confidence_level} conf.
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> {new Date(a.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {a.url && a.url !== "manual-entry" && (
                            <button onClick={(e) => { e.stopPropagation(); window.open(a.url, "_blank"); }}
                              className="text-[10px] text-primary hover:underline flex items-center gap-1">
                              See Property ↗
                            </button>
                          )}
                          <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                            View Report →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      <BulkAnalyzeModal open={showBulk} onClose={() => setShowBulk(false)} isPro={isPro} onUpgrade={() => { setShowBulk(false); setShowUpgrade(true); }} user={user} />
      <BottomNav />
    </div>
  );
};

export default Dashboard;
