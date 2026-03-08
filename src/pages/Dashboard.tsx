import { useEffect, useState, useMemo } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ADMIN_EMAIL } from "@/lib/constants";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import {
  Search, ArrowRight, Calendar, Building2, TrendingUp, MapPin, Globe,
  Shield, BarChart3, Heart, GitCompare, Filter, Star, Crown, Zap, Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import confetti from "canvas-confetti";
import PropertyOfTheDay from "@/components/PropertyOfTheDay";
import SavingsCalculator from "@/components/SavingsCalculator";
import { WatchlistSection } from "@/components/Watchlist";
import ScoutAlertSetup from "@/components/ScoutAlertSetup";
import { DashboardCardSkeleton } from "@/components/SkeletonCards";
import DashboardPropertyCard from "@/components/dashboard/DashboardPropertyCard";
import { usePropertyNotes } from "@/components/PropertyNotes";
import { SavedFilters, type DashboardFilter } from "@/components/SavedFilters";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import BulkAnalyzeModal from "@/components/dashboard/BulkAnalyzeModal";

import { scoreColor, verdictColorSimple as verdictColor, riskLabel } from "@/lib/score-utils";

const FREE_LIMIT = 5;

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

  // Cmd/Ctrl+K shortcut to focus URL input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document.getElementById("dashboard-url-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
      supabase.from("analyses").select("id, url, address, city, country, price, global_score, verdict, risk_level, projected_roi_low, projected_roi_high, market_classification, property_type, image_url, ai_summary, confidence_level, data_source, created_at, currency, slug").order("created_at", { ascending: false }),
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
    const isAdmin = user?.email === ADMIN_EMAIL;
    if (!isAdmin && !isPro && creditsUsed >= creditsTotal) {
      setShowUpgrade(true);
      return;
    }
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  const avgScore = useMemo(() => analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + (a.global_score || 0), 0) / analyses.length) : 0, [analyses]);
  const countriesAnalyzed = useMemo(() => [...new Set(analyses.map(a => a.country).filter(Boolean))].length, [analyses]);

  const sortedAnalyses = useMemo(() => [...analyses].sort((a, b) => {
    if (sortBy === "score") return (b.global_score || 0) - (a.global_score || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  }), [analyses, sortBy]);

  const displayAnalyses = useMemo(() => showFavoritesOnly ? sortedAnalyses.filter(a => favoriteIds.has(a.id)) : sortedAnalyses, [sortedAnalyses, showFavoritesOnly, favoriteIds]);

  const notesMap = usePropertyNotes(useMemo(() => analyses.map(a => a.id), [analyses]));

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background pb-16 sm:pb-0">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your property intelligence hub.</p>
        </div>

        <PropertyOfTheDay />
        <WatchlistSection />
        <ScoutAlertSetup />
        {!isPro && analyses.length > 0 && <SavingsCalculator analyses={analyses} />}

        {/* Stats bar */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="h-4 w-4 rounded bg-muted animate-pulse mx-auto mb-2" />
                <div className="h-6 w-10 rounded bg-muted animate-pulse mx-auto mb-1" />
                <div className="h-2.5 w-16 rounded bg-muted animate-pulse mx-auto" />
              </div>
            ))}
          </div>
        ) : analyses.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { icon: BarChart3, label: "Total Analyses", value: analyses.length, color: "text-foreground" },
              { icon: TrendingUp, label: "Avg. Score", value: avgScore, color: scoreColor(avgScore) },
              { icon: Globe, label: "Countries", value: countriesAnalyzed, color: "text-foreground" },
              { icon: Heart, label: "Favorites", value: favoriteIds.size, color: "text-primary" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-4 text-center hover:shadow-md transition-shadow"
              >
                <stat.icon className="h-4 w-4 text-primary mx-auto mb-2" />
                <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        ) : null}

        {/* New analysis input */}
        <div className="mb-6">
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-xl border border-border p-2">
            <div className="flex items-center flex-1 min-w-0">
              <Search className="ml-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                id="dashboard-url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="Paste any real estate URL to analyze… (⌘K)"
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
              <SavedFilters
                currentFilter={{ sortBy, favoritesOnly: showFavoritesOnly }}
                onApply={(f) => { setSortBy(f.sortBy); setShowFavoritesOnly(f.favoritesOnly); }}
              />
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
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => <DashboardCardSkeleton key={i} />)}
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
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Analyze your first property</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Get a full AI-powered investment report in seconds.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-8 text-left max-w-sm mx-auto">
                  <div className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <div><p className="text-xs font-medium text-foreground">Paste a URL</p><p className="text-[10px] text-muted-foreground">Zillow, Idealista, Airbnb…</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <div><p className="text-xs font-medium text-foreground">Get AI analysis</p><p className="text-[10px] text-muted-foreground">Score, ROI, risks & more</p></div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <div><p className="text-xs font-medium text-foreground">Make better decisions</p><p className="text-[10px] text-muted-foreground">Compare & invest smarter</p></div>
                  </div>
                </div>
                <Button variant="hero" size="lg" onClick={() => document.querySelector<HTMLInputElement>("input[type='url']")?.focus()}>
                  <Search className="h-4 w-4 mr-2" /> Paste a URL to Start
                </Button>
              </>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {displayAnalyses.map((a, i) => (
              <DashboardPropertyCard
                key={a.id}
                analysis={a}
                index={i}
                isFavorite={favoriteIds.has(a.id)}
                isCompare={compareIds.has(a.id)}
                noteData={notesMap[a.id]}
                onToggleFavorite={toggleFavorite}
                onToggleCompare={toggleCompare}
              />
            ))}
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
