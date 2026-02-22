import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Search, ArrowRight, Calendar, Building2, TrendingUp, MapPin, Globe,
  Shield, BarChart3, Heart, GitCompare, Filter, Star, Crown, Zap,
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
  if (v >= 80) return { label: "Low Risk", color: "text-score-excellent" };
  if (v >= 60) return { label: "Medium Risk", color: "text-score-average" };
  return { label: "High Risk", color: "text-score-poor" };
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

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
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
    // Load analyses and favorites in parallel
    Promise.all([
      supabase.from("analyses").select("*").order("created_at", { ascending: false }),
      supabase.from("favorites").select("analysis_id").eq("user_id", user.id),
    ]).then(([{ data: analysesData }, { data: favData }]) => {
      setAnalyses(analysesData || []);
      setFavoriteIds(new Set((favData || []).map((f: any) => f.analysis_id)));
      setLoading(false);
    });
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
    // Check free limit (admin bypasses)
    const isAdmin = user?.email === "rrppspain@gmail.com";
    if (!isAdmin && analyses.length >= FREE_LIMIT) {
      setShowUpgrade(true);
      return;
    }
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  if (authLoading || !user) return null;

  const avgScore = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + (a.global_score || 0), 0) / analyses.length) : 0;
  const countriesAnalyzed = [...new Set(analyses.map(a => a.country).filter(Boolean))].length;

  const displayAnalyses = showFavoritesOnly ? analyses.filter(a => favoriteIds.has(a.id)) : analyses;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">My Analyses</h1>
          <p className="text-sm text-muted-foreground">Your property intelligence history.</p>
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
          <p className="text-[10px] text-muted-foreground mt-1.5 ml-1">
            Works with Zillow, Idealista, Airbnb, developer websites, and any real estate page.
          </p>
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
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              {showFavoritesOnly ? "No favorites yet. Click the heart icon on any property." : "No analyses yet. Paste a listing URL above to get started."}
            </p>
          </div>
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
                      <div className="sm:w-40 h-32 sm:h-auto bg-secondary overflow-hidden flex-shrink-0">
                        <img src={a.image_url} alt={a.address || "Property"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
    </div>
  );
};

export default Dashboard;
