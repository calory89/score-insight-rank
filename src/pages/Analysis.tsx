import { useEffect, useState, useRef } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { ADMIN_EMAIL } from "@/lib/constants";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import VerdictBanner from "@/components/analysis/VerdictBanner";
import ExplainableAI from "@/components/analysis/ExplainableAI";
import ProtectedListingFallback from "@/components/ProtectedListingFallback";
import ProGateOverlay from "@/components/ProGateOverlay";
import ReportExpiryBanner from "@/components/ReportExpiryBanner";
import BadDealAlert from "@/components/BadDealAlert";
import FreeLimitPricingModal from "@/components/FreeLimitPricingModal";
import {
  ArrowLeft, AlertTriangle, ChevronDown, ChevronUp,
  Info, DollarSign, BarChart3, Home,
  Clock, Zap, CheckCircle2, XCircle, Eye,
  Percent, ArrowUpRight, ArrowDownRight, GitCompare, Flag, X, Send, Heart, FileText, RefreshCw, Briefcase, Target, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import PropertyReviews from "@/components/PropertyReviews";
import { PropertyNotes } from "@/components/PropertyNotes";
import PriceHistoryTimeline from "@/components/PriceHistoryTimeline";
import AddToPortfolioModal from "@/components/AddToPortfolioModal";
import DueDiligenceChecklist from "@/components/DueDiligenceChecklist";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart,
} from "recharts";
import confetti from "canvas-confetti";

import { scoreColor } from "@/lib/score-utils";
import AIChatBubble from "@/components/AIChatBubble";
import SharePanel from "@/components/SharePanel";
import InvestmentCalculator from "@/components/InvestmentCalculator";
import NegotiationLetterModal from "@/components/NegotiationLetterModal";
import { WatchButton } from "@/components/Watchlist";
import InvestmentMemoModal from "@/components/InvestmentMemoModal";

// Extracted sub-components
import { FomoLoader, fomoSteps } from "@/components/analysis/AnalysisLoadingState";
import { Section, SectionHeader, MetricCard } from "@/components/analysis/AnalysisHelpers";
import AnalysisHeader from "@/components/analysis/AnalysisHeader";
import AnalysisScoreCard from "@/components/analysis/AnalysisScoreCard";
import AnalysisRadar from "@/components/analysis/AnalysisRadar";
import AnalysisProsCons from "@/components/analysis/AnalysisProsCons";
import AnalysisROISection from "@/components/analysis/AnalysisROISection";

import type { Tables } from "@/integrations/supabase/types";

type AnalysisData = Tables<"analyses">;

// --- Main Component ---
const Analysis = () => {
  const params = useParams<{ id: string; slug: string }>();
  const [searchParams] = useSearchParams();
  const urlToAnalyze = searchParams.get("url");
  const fromBulk = searchParams.get("from") === "bulk";
  const slug = params.slug;
  const [resolvedId, setResolvedId] = useState<string | undefined>(params.id);
  const id = resolvedId;
  const isLoadingMode = !id && !slug && !!urlToAnalyze;

  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [fomoStep, setFomoStep] = useState(0);
  const fomoTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [scrapeFailed, setScrapeFailed] = useState(false);
  const [submittingFallback, setSubmittingFallback] = useState(false);
  const [showReportError, setShowReportError] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportCategory, setReportCategory] = useState("wrong_data");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [readyReportId, setReadyReportId] = useState<string | null>(null);
  const [showNegotiationLetter, setShowNegotiationLetter] = useState(false);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showMemoModal, setShowMemoModal] = useState(false);
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false);
  const [userAnalysesCount, setUserAnalysesCount] = useState(0);
  const { toast } = useToast();

  // Dynamic SEO meta
  const ogImageUrl = data?.slug
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image?slug=${data.slug}`
    : data?.id
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-image?id=${data.id}`
      : undefined;

  useDocumentMeta({
    title: data ? `${data.address || data.city || "Property"} — Score ${data.global_score || ""}/100 | RealHunt` : "Analyzing Property… | RealHunt",
    description: data ? `AI analysis of ${data.address || data.city || "property"}${data.country ? ` in ${data.country}` : ""}. Score: ${data.global_score}/100. ${data.primary_insight || ""}` : "Running AI-powered real estate analysis…",
    ogImage: ogImageUrl,
  });

  // JSON-LD structured data for analysis pages
  useEffect(() => {
    if (!data) return;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": data.address || `${data.city || "Property"}${data.country ? `, ${data.country}` : ""}`,
      "description": data.primary_insight || data.ai_summary || "AI-powered property analysis",
      ...(data.image_url && { "image": data.image_url }),
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": String(((data.global_score || 0) / 20).toFixed(1)),
        "bestRating": "5",
        "worstRating": "1",
        "ratingCount": "1",
      },
      ...(data.price && {
        "offers": {
          "@type": "Offer",
          "price": data.price,
          "priceCurrency": data.currency === "GBP" ? "GBP" : data.currency === "USD" ? "USD" : "EUR",
        },
      }),
    };
    let script = document.querySelector('script[data-jsonld="analysis"]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-jsonld", "analysis");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
    return () => { script?.remove(); };
  }, [data]);

  useEffect(() => {
    if (!slug) return;
    (supabase as any).from("analyses").select("id").eq("slug", slug).single().then(({ data: row }: any) => {
      if (row) setResolvedId(row.id);
      else navigate("/");
    });
  }, [slug]);

  // Check if this analysis is favorited
  useEffect(() => {
    if (!user || !id) return;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("analysis_id", id).then(({ data: favs }) => {
      setIsFavorited(!!(favs && favs.length > 0));
    });
  }, [user, id]);

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate("/profile");
      return;
    }
    if (!id) return;
    if (isFavorited) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("analysis_id", id);
      setIsFavorited(false);
      toast({ title: "Removed from favorites" });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, analysis_id: id });
      setIsFavorited(true);
      toast({ title: "Added to favorites", description: "Property saved to your collection." });
    }
  };
  // Store the URL being analyzed for polling
  const analyzingUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!analyzing) return;
    // Request notification permission while user waits
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    fomoTimerRef.current = setInterval(() => {
      setFomoStep((prev) => Math.min(prev + 1, fomoSteps.length - 1));
    }, 3500);

    // Polling: check DB every 15s for completed analysis
    const pollInterval = setInterval(async () => {
      const pollUrl = analyzingUrlRef.current;
      if (!pollUrl || pollUrl === "manual-entry") return;
      const normalizedUrl = pollUrl.split("#")[0].replace(/\/$/, "");
      const { data: saved } = await supabase
        .from("analyses")
        .select("id, address, city, global_score")
        .ilike("url", `${normalizedUrl}%`)
        .not("global_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (saved && saved.length > 0) {
        setReadyReportId(saved[0].id);
        setAnalyzeError("");
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Your report is ready! 🏠", {
            body: `${saved[0].address || saved[0].city || "Property"} — Score: ${saved[0].global_score}/100`,
          });
        }
      }
    }, 15000);

    // Safety timeout
    const safetyTimeout = setTimeout(async () => {
      const pollUrl = analyzingUrlRef.current;
      if (pollUrl && pollUrl !== "manual-entry") {
        const normalizedUrl = pollUrl.split("#")[0].replace(/\/$/, "");
        const { data: saved } = await supabase
          .from("analyses")
          .select("id")
          .ilike("url", `${normalizedUrl}%`)
          .not("global_score", "is", null)
          .order("created_at", { ascending: false })
          .limit(1);
        if (saved && saved.length > 0) {
          setAnalyzing(false);
          navigate(`/analysis/${saved[0].id}`, { replace: true });
          return;
        }
      }
      setAnalyzeError("Analysis is taking longer than expected. The property website may be slow or protected. Please try again.");
      setAnalyzing(false);
    }, 180000);
    return () => {
      clearInterval(fomoTimerRef.current);
      clearInterval(pollInterval);
      clearTimeout(safetyTimeout);
    };
  }, [analyzing]);

  const [listingType, setListingType] = useState<string>("sale");

  const runAnalysis = async (body: any) => {
    analyzingUrlRef.current = body.url || null;
    setAnalyzing(true);
    setAnalyzeError("");
    setScrapeFailed(false);
    setFomoStep(0);
    try {
      const { data: result, error } = await supabase.functions.invoke("analyze-property", { body });
      if (error) throw error;
      if (result?.scrape_failed) { setScrapeFailed(true); setAnalyzing(false); return; }
      if (result?.error) throw new Error(result.error);
      if (result?.listing_type) setListingType(result.listing_type);
      if (result?.data?.id) navigate(`/analysis/${result.data.id}`, { replace: true });
    } catch (e: any) {
      console.error("Analysis error:", e);
      try {
        if (body.url && body.url !== "manual-entry") {
          const normalizedUrl = body.url.split("#")[0].replace(/\/$/, "");
          const { data: saved } = await supabase
            .from("analyses")
            .select("id")
            .ilike("url", `${normalizedUrl}%`)
            .not("global_score", "is", null)
            .order("created_at", { ascending: false })
            .limit(1);
          if (saved && saved.length > 0) {
            setAnalyzing(false);
            navigate(`/analysis/${saved[0].id}`, { replace: true });
            return;
          }
        }
      } catch (dbErr) {
        console.error("DB fallback check failed:", dbErr);
      }
      setAnalyzeError(e.message || "Analysis failed");
      setAnalyzing(false);
      setSubmittingFallback(false);
    }
  };

  const FREE_LIMIT = 5;
  const analysisTriggered = useRef(false);
  useEffect(() => {
    if (!isLoadingMode) return;
    if (!user) return;
    if (analysisTriggered.current) return;
    analysisTriggered.current = true;
    setLoading(false);

    const checkCache = async () => {
      if (!urlToAnalyze) return false;
      const normalizedUrl = urlToAnalyze.split("#")[0].replace(/\/$/, "");
      const { data: cached } = await supabase
        .from("analyses")
        .select("id")
        .ilike("url", `${normalizedUrl}%`)
        .not("global_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cached && cached.length > 0) {
        navigate(`/analysis/${cached[0].id}`, { replace: true });
        return true;
      }
      return false;
    };

    const checkLimitAndRun = async () => {
      const found = await checkCache();
      if (found) return;
      const isAdmin = user?.email === ADMIN_EMAIL;
      if (!isAdmin) {
        const { count } = await supabase
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        const used = count || 0;
        setUserAnalysesCount(used);
        if (used >= FREE_LIMIT) {
          try {
            const { data: subData } = await supabase.functions.invoke("check-subscription");
            if (!subData?.subscribed) {
              setShowFreeLimitModal(true);
              return;
            }
          } catch {
            setShowFreeLimitModal(true);
            return;
          }
        }
      }
      runAnalysis({ url: urlToAnalyze });
    };

    checkLimitAndRun();
  }, [isLoadingMode, user, urlToAnalyze]);

  useEffect(() => {
    if (!id) return;
    supabase.from("analyses").select("*").eq("id", id).single().then(({ data: result, error }) => {
      if (error || !result) { navigate("/"); }
      else {
        setData(result);
        setAnalyzing(false);
        setTimeout(() => {
          setRevealed(true);
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ["#0faf6e", "#4ade80", "#facc15", "#ffffff"] });
        }, 300);
      }
      setLoading(false);
    });
  }, [id, navigate]);

  const handleManualEntry = (data: any) => { setSubmittingFallback(true); runAnalysis({ url: urlToAnalyze || "manual-entry", manual_fields: data }); };
  const handlePasteContent = (content: string) => { setSubmittingFallback(true); runAnalysis({ url: urlToAnalyze || "manual-entry", manual_content: content }); };
  const handleUploadFiles = (files: File[]) => {};

  if (showFreeLimitModal) return (
    <div className="min-h-screen bg-background">
      <RHNav />
      <FreeLimitPricingModal
        open={showFreeLimitModal}
        onClose={() => { setShowFreeLimitModal(false); navigate("/dashboard"); }}
        usedCount={userAnalysesCount}
      />
    </div>
  );

  if ((analyzing || readyReportId) && !data) return (
    <FomoLoader
      step={fomoStep}
      readyReportId={readyReportId || undefined}
      onViewReady={() => {
        if (readyReportId) {
          window.location.href = `/analysis/${readyReportId}`;
        }
      }}
    />
  );

  if (scrapeFailed && !analyzing) {
    return (
      <div className="min-h-screen bg-background">
        <RHNav />
        <div className="container mx-auto px-4 pt-20 pb-16">
          <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
          <ProtectedListingFallback url={urlToAnalyze || ""} onManualEntry={handleManualEntry}
            onPasteContent={handlePasteContent} onUploadFiles={handleUploadFiles} submitting={submittingFallback} />
        </div>
      </div>
    );
  }

  if (analyzeError) {
    if (readyReportId) {
      navigate(`/analysis/${readyReportId}`, { replace: true });
      return null;
    }
    return (
      <div className="min-h-screen bg-background">
        <RHNav />
        <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl text-center">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 max-w-md mx-auto">
            <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-foreground mb-2">Analysis Failed</h2>
            <p className="text-sm text-muted-foreground mb-4">{analyzeError}</p>
            <Button variant="ghost" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-t-primary border-border animate-spin" /></div>;
  if (!data) return null;

  const d = data;
  const { isPro } = useSubscription();
  const explanations = (d.score_explanations || {}) as Record<string, any>;
  const f = (explanations.forensic || {}) as any;
  const globalScore = d.global_score;
  const confidenceLevel = d.confidence_level || "high";
  const curr = d.currency === "GBP" ? "£" : d.currency === "USD" ? "$" : d.currency === "DKK" ? "kr" : d.currency === "SEK" ? "kr" : d.currency === "NOK" ? "kr" : "€";

  // Radar chart data
  const radarData = [
    { metric: "ROI", value: d.roi_potential, market: 55 },
    { metric: "Stability", value: d.market_stability, market: 55 },
    { metric: "Demand", value: d.demand_strength, market: 55 },
    { metric: "Safety", value: d.risk_level || 50, market: 45 },
    { metric: "Liquidity", value: d.liquidity_outlook, market: 55 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <RHNav />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => {
            if (fromBulk) {
              navigate("/dashboard?bulk=true&restore=true");
            } else {
              navigate("/dashboard");
            }
          }}>
            <ArrowLeft className="h-4 w-4 mr-1" /> {fromBulk ? "Back to Bulk Results" : "Back"}
          </Button>
          <div className="flex items-center gap-1.5 flex-wrap">
            {d?.url && d.url !== "manual-entry" && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  let url = d.url;
                  if (url && !url.startsWith("http")) url = "https://" + url;
                  window.open(url, "_blank");
                }}
              >
                <Eye className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Visit Website</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={`text-xs ${isFavorited ? "text-primary border-primary/30 bg-primary/10" : ""}`}
              onClick={handleToggleFavorite}
            >
              <Heart className={`h-3.5 w-3.5 sm:mr-1 ${isFavorited ? "fill-current" : ""}`} />
              <span className="hidden sm:inline">{isFavorited ? "Saved" : "Favorite"}</span>
            </Button>
            <WatchButton analysisId={id!} url={d.url} price={d.price} score={d.global_score} />
            <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/compare?ids=${id}`)}>
              <GitCompare className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Compare</span>
            </Button>
            <SharePanel
              address={d.address || d.city || "Property"}
              score={d.global_score || 0}
              slug={d.slug}
              verdict={d.verdict}
            />
            <Button variant="outline" size="sm" className="text-xs print:hidden" onClick={() => window.print()}>
              <Eye className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Print</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={() => setShowNegotiationLetter(true)}>
              <FileText className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Negotiate</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={() => setShowPortfolioModal(true)}>
              <Briefcase className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Portfolio</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={() => setShowMemoModal(true)}>
              <Sparkles className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">AI Memo</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowReportError(true)}>
              <Flag className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Report Error</span>
            </Button>
            {d.url && d.url !== "manual-entry" && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => {
                  if (confirm("Re-analyze this property with fresh data? This will use 1 credit.")) {
                    navigate(`/analysis/loading?url=${encodeURIComponent(d.url)}`);
                  }
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Re-Analyze</span>
              </Button>
            )}
          </div>
          {d.created_at && (
            <div className="text-[10px] text-muted-foreground mt-1 sm:mt-0 sm:ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Analyzed {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
            </div>
          )}
        </div>

        {/* Modals */}
        <NegotiationLetterModal analysis={d} open={showNegotiationLetter} onClose={() => setShowNegotiationLetter(false)} />
        {id && <AddToPortfolioModal open={showPortfolioModal} onClose={() => setShowPortfolioModal(false)} analysisId={id} suggestedPrice={d.price || undefined} currency={d.currency || "€"} />}
        {id && <InvestmentMemoModal open={showMemoModal} onClose={() => setShowMemoModal(false)} analysisId={id} propertyName={d.address || d.city || "Property"} />}

        {/* Report Expiry Banner for free users */}
        {!isPro && d.created_at && <ReportExpiryBanner createdAt={d.created_at} />}

        {/* Bad Deal Alert */}
        {!isPro && d.global_score != null && (
          <BadDealAlert score={d.global_score} redFlagCount={(d.red_flags as string[])?.length || 0} />
        )}

        {/* Project Site Warning */}
        {(d.data_source === "project_website" || confidenceLevel === "low") && !d.url?.toLowerCase().includes("ecobeachcity") && (
          <Section delay={0} className="mb-6">
            <div className="rounded-xl border-2 border-score-average/40 bg-score-average/5 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-score-average flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">⚠️ Project / Developer Website — Limited Data</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This URL is not a standard property listing (like Zillow, Idealista, etc.). It appears to be a real estate company or developer website.
                    The data shown below is <strong>limited and partially estimated</strong>. Financial metrics may not be accurate.
                    For a precise analysis, paste a direct listing URL with specific property details (price, size, location).
                  </p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* Rental Listing Warning */}
        {(listingType === "rental" || listingType === "vacation_rental" || d.data_source === "rental" || d.data_source === "vacation_rental" || d.ai_summary?.includes("[RENTAL LISTING")) && (
          <Section delay={0} className="mb-6">
            <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
              <div className="flex items-start gap-3">
                <Home className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground text-sm mb-1">
                    🏠 {(listingType === "vacation_rental" || d.data_source === "vacation_rental") ? "Vacation Rental" : "Rental"} Listing — Not For Sale
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This property is listed as a <strong>{(listingType === "vacation_rental" || d.data_source === "vacation_rental") ? "short-term / vacation rental (Airbnb, Booking)" : "long-term rental"}</strong>, not for sale.
                    The price shown below is our <strong>estimated market value</strong> based on comparable sales, location data, and rental yield analysis.
                    All financial metrics are calculated using the actual rental price from the listing.
                  </p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* ===== VERDICT BANNER (score + grade + one-line verdict) ===== */}
        <Section delay={0.02} className="mb-6">
          <VerdictBanner data={d} />
        </Section>

        {/* ===== UNIFIED PROPERTY CARD ===== */}
        <Section delay={0.05} className="mb-8">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <AnalysisHeader data={d} forensic={f} globalScore={globalScore} confidenceLevel={confidenceLevel} />
            <div className="border-t border-border" />
            <AnalysisScoreCard data={d} explanations={explanations} globalScore={globalScore} />
          </div>
        </Section>

        {/* ===== EXPLAINABLE AI ===== */}
        <Section delay={0.08} className="mb-8">
          <ExplainableAI data={d} explanations={explanations} />
        </Section>

        {/* ===== RADAR CHART ===== */}
        <AnalysisRadar radarData={radarData} />

        {/* ===== PRIMARY INSIGHT + AI SUMMARY ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Section delay={0.2} className="rounded-2xl border border-primary/15 bg-primary/5 p-6">
            <p className="text-xs font-medium text-primary mb-2">Primary Insight</p>
            <p className="text-sm text-foreground leading-relaxed">{d.primary_insight}</p>
          </Section>
          <Section delay={0.22} className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-medium text-foreground mb-2">AI Summary</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{d.ai_summary}</p>
          </Section>
        </div>

        {/* ===== KEY FINDINGS ===== */}
        <AnalysisProsCons
          pros={d.pros as string[] || []}
          cons={d.cons as string[] || []}
          redFlags={d.red_flags as string[] || []}
          opportunitySignals={d.opportunity_signals as string[] || []}
        />

        {/* ===== FINANCIAL ANALYSIS (Deal Quality, Yield, Break-Even, Stress Tests, Neighborhood, Comps, Costs, Market Context) ===== */}
        <AnalysisROISection data={d} forensic={f} curr={curr} isPro={isPro} />

        {/* ===== INVESTMENT CALCULATOR ===== */}
        {d.price && (
          <Section delay={0.49} className="mb-8">
            <InvestmentCalculator
              price={parseFloat(String(d.price).replace(/[^0-9.]/g, "")) || 0}
              currency={d.currency || "EUR"}
              roiLow={d.projected_roi_low}
              roiHigh={d.projected_roi_high}
              grossYield={f.gross_yield}
            />
          </Section>
        )}

        {/* ===== 5-YEAR SCENARIO SIMULATION ===== */}
        <Section delay={0.5} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-4">5-Year Scenario Simulation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Projected ROI</p>
              <p className="text-lg font-mono font-bold text-primary">{d.projected_roi_low}% – {d.projected_roi_high}%</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Downside</p>
              <p className="text-lg font-mono font-bold text-score-poor">{d.downside_scenario != null && Math.abs(d.downside_scenario) < 100 ? `${d.downside_scenario}%` : "—"}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Upside</p>
              <p className="text-lg font-mono font-bold text-primary">{d.upside_scenario != null && d.upside_scenario < 200 ? `+${d.upside_scenario}%` : "—"}</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Verdict</p>
              <p className={`text-lg font-bold ${d.verdict === "Exceptional" ? "text-primary" : d.verdict === "Strong" ? "text-score-excellent" : d.verdict === "Moderate" ? "text-score-average" : "text-score-poor"}`}>{d.verdict}</p>
            </div>
          </div>
        </Section>

        {/* ===== CHARTS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(d.price_history as any[])?.length > 1 && (
            <Section delay={0.52}>
              <PriceHistoryTimeline priceHistory={d.price_history as any[]} currentPrice={d.price} currency={d.currency || "€"} />
            </Section>
          )}
          {(d.price_history as any[])?.length > 0 && (
            <Section delay={0.52} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Price Evolution Index</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.price_history as any[]}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 14%)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 7%)", border: "1px solid hsl(220, 14%, 14%)", borderRadius: 8, fontSize: 12 }} />
                    <Area type="monotone" dataKey="value" stroke="hsl(160, 84%, 39%)" fill="url(#priceGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}
          {(d.yield_trend as any[])?.length > 0 && (
            <Section delay={0.54} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4">Yield Trend (%)</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={d.yield_trend as any[]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 14%)" />
                    <XAxis dataKey="year" tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(220, 10%, 50%)" }} />
                    <Tooltip contentStyle={{ background: "hsl(220, 18%, 7%)", border: "1px solid hsl(220, 14%, 14%)", borderRadius: 8, fontSize: 12 }} />
                    <Line type="monotone" dataKey="value" stroke="hsl(142, 70%, 45%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(142, 70%, 45%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}
        </div>

        {/* ===== EXIT STRATEGY ===== */}
        {f.exit_strategy && (
          <Section delay={0.56} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <SectionHeader icon={ArrowUpRight} title="Exit Strategy" subtitle="Optimal exit timing & returns" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard icon={Clock} label="Best Exit" value={f.exit_strategy.best_exit_years ? `${f.exit_strategy.best_exit_years} years` : undefined} />
              <MetricCard icon={Percent} label="Selling Costs" value={f.exit_strategy.selling_costs_pct ? `${f.exit_strategy.selling_costs_pct}%` : undefined} />
              <MetricCard icon={DollarSign} label="Net Proceeds (5yr)" value={f.exit_strategy.net_proceeds_5yr} />
              <MetricCard icon={ArrowUpRight} label="IRR" value={f.exit_strategy.irr ? `${f.exit_strategy.irr}%` : undefined} positive={f.exit_strategy.irr > 8} />
            </div>
          </Section>
        )}

        {/* ===== INVESTMENT CLASSIFICATION ===== */}
        {f.investment_classification && (
          <Section delay={0.58} className="rounded-2xl border border-primary/10 bg-card p-6 mb-8">
            <SectionHeader icon={Target} title="Investment Classification" subtitle="Property investment profile" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { key: "capital_growth", label: "Capital Growth Asset" },
                { key: "yield_optimized", label: "Yield Optimized" },
                { key: "strong_liquidity", label: "Strong Liquidity" },
                { key: "low_regulatory_risk", label: "Low Regulatory Risk" },
                { key: "cash_flow_positive", label: "Cash-Flow Positive" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2 rounded-lg bg-secondary/50 border border-border px-4 py-3">
                  {f.investment_classification[key] ? (
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-score-poor/60 flex-shrink-0" />
                  )}
                  <span className={`text-xs ${f.investment_classification[key] ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ===== INVESTOR FIT ===== */}
        {(f.investor_best_for?.length > 0 || f.investor_not_for?.length > 0) && (
          <Section delay={0.6} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {f.investor_best_for?.length > 0 && (
              <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> Best For
                </h3>
                <ul className="space-y-2">
                  {(f.investor_best_for as string[]).map((t: string, i: number) => (
                    <li key={i} className="text-xs text-foreground flex items-start gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" /> {t}</li>
                  ))}
                </ul>
              </div>
            )}
            {f.investor_not_for?.length > 0 && (
              <div className="rounded-2xl border border-score-poor/10 bg-score-poor/5 p-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-score-poor" /> Not Ideal For
                </h3>
                <ul className="space-y-2">
                  {(f.investor_not_for as string[]).map((t: string, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><XCircle className="h-3.5 w-3.5 text-score-poor/60 mt-0.5 flex-shrink-0" /> {t}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}

        {/* ===== OPPORTUNITY COST + CAPITAL EFFICIENCY ===== */}
        {(f.opportunity_cost_vs_best || f.capital_efficiency_score != null) && (
          <Section delay={0.62} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {f.opportunity_cost_vs_best && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <SectionHeader icon={ArrowDownRight} title="Opportunity Cost" />
                <p className="text-sm text-muted-foreground">{f.opportunity_cost_vs_best}</p>
              </div>
            )}
            {f.capital_efficiency_score != null && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <SectionHeader icon={Zap} title="Capital Efficiency" />
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="264" strokeDashoffset={264 - (264 * f.capital_efficiency_score) / 100} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold font-mono ${scoreColor(f.capital_efficiency_score)}`}>{f.capital_efficiency_score}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Return per unit invested vs top quartile</p>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* ===== ASSUMPTIONS DISCLOSURE ===== */}
        {f.assumptions && (
          <Section delay={0.64} className="rounded-2xl border border-border/50 bg-secondary/30 p-6 mb-8">
            <SectionHeader icon={Info} title="Assumptions" subtitle="Transparent methodology disclosure" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
              {Object.entries(f.assumptions as Record<string, string>).map(([key, value]) => (
                <div key={key} className="flex justify-between py-1.5 border-b border-border/30">
                  <span className="text-[11px] text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-[11px] font-mono text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ===== ALTERNATIVES ===== */}
        {(d.alternatives as any[])?.length > 0 && (
          <Section delay={0.66} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <h3 className="text-sm font-semibold text-foreground mb-1">Users who analyzed this property ultimately invested in:</h3>
            <p className="text-xs text-muted-foreground mb-6">Higher-performing alternatives discovered by RealHunt users.</p>
            <div className="space-y-3">
              {(d.alternatives as any[]).map((alt: any, i: number) => (
                <div key={i} onClick={() => navigate(`/rankings?city=${encodeURIComponent(alt.city?.split(",")[0]?.trim() || "")}`)}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 p-4 hover:border-primary/20 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className={`font-mono text-sm font-bold ${scoreColor(alt.score)}`}>{alt.score}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{alt.city}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{alt.price}</span>
                        <span className="text-[11px] text-muted-foreground">ROI {alt.roi}</span>
                        <span className={`text-[11px] ${alt.risk === "Low" ? "text-primary" : "text-score-average"}`}>{alt.risk} Risk</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{alt.insight}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ===== COMMUNITY ===== */}
        {id && (
          <Section delay={0.65} className="mb-8">
            <PropertyNotes analysisId={id} />
          </Section>
        )}

        {id && (
          <Section delay={0.68} className="mb-8">
            <DueDiligenceChecklist analysisId={id} country={d.country} />
          </Section>
        )}

        {id && (
          <Section delay={0.7} className="mb-8">
            <PropertyReviews analysisId={id} />
          </Section>
        )}
      </div>

      {/* Report Error Modal */}
      <AnimatePresence>
        {showReportError && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setShowReportError(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Flag className="h-4 w-4 text-destructive" /> Report an Error
                </h3>
                <button onClick={() => setShowReportError(false)} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">What's wrong?</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-secondary/50 px-3 text-sm text-foreground"
                  >
                    <option value="wrong_data">Wrong price or data</option>
                    <option value="wrong_score">Score seems incorrect</option>
                    <option value="wrong_classification">Wrong site classification</option>
                    <option value="missing_data">Missing information</option>
                    <option value="other">Other issue</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Describe the issue *</label>
                  <Textarea
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    placeholder="e.g. The price shown is incorrect, the actual listing price is..."
                    rows={4}
                    className="bg-secondary/50"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Analysis: {d?.address || d?.url} · ID: {id}
                </p>
                <Button
                  variant="hero"
                  className="w-full"
                  disabled={reportSubmitting || !reportDescription.trim()}
                  onClick={async () => {
                    if (!user || !reportDescription.trim()) return;
                    setReportSubmitting(true);
                    try {
                      const { data: ticket, error } = await (supabase
                        .from("tickets" as any)
                        .insert({
                          user_id: user.id,
                          subject: `[Error Report] ${reportCategory.replace("_", " ")} — ${d?.address || d?.url || "Unknown"}`,
                          category: "error_report",
                          priority: "high",
                        })
                        .select()
                        .single() as any);
                      if (error || !ticket) throw error || new Error("Failed");
                      await (supabase.from("ticket_messages" as any).insert({
                        ticket_id: ticket.id,
                        user_id: user.id,
                        message: `**Error Type:** ${reportCategory.replace("_", " ")}\n**Analysis URL:** ${d?.url}\n**Analysis ID:** ${id}\n**Address:** ${d?.address || "N/A"}\n**Price shown:** ${d?.price || "N/A"}\n**Score:** ${d?.global_score || "N/A"}\n\n**Description:**\n${reportDescription}`,
                        is_admin: false,
                      }) as any);
                      toast({ title: "Error reported", description: `Ticket ${ticket.ticket_number} created. We'll review it shortly.` });
                      setShowReportError(false);
                      setReportDescription("");
                    } catch (e: any) {
                      toast({ title: "Error", description: e?.message || "Could not submit report", variant: "destructive" });
                    } finally {
                      setReportSubmitting(false);
                    }
                  }}
                >
                  {reportSubmitting ? "Submitting…" : "Submit Report"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Visit Property CTA */}
      {d?.url && d.url !== "manual-entry" && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1 }}
          onClick={() => {
            let url = d.url;
            if (url && !url.startsWith("http")) url = "https://" + url;
            window.open(url, "_blank");
          }}
          className="fixed bottom-20 sm:bottom-6 left-4 sm:left-6 z-40 bg-gradient-cta text-primary-foreground px-5 py-3 rounded-full shadow-xl hover:shadow-2xl hover:brightness-110 transition-all flex items-center gap-2 text-sm font-semibold"
        >
          <Eye className="h-4 w-4" /> Visit Property
        </motion.button>
      )}

      {/* AI Chat Assistant */}
      <AIChatBubble context={{
        address: d.address,
        city: d.city,
        country: d.country,
        price: d.price,
        currency: d.currency,
        global_score: d.global_score,
        roi_potential: d.roi_potential,
        demand_strength: d.demand_strength,
        risk_level: d.risk_level,
        market_stability: d.market_stability,
        liquidity_outlook: d.liquidity_outlook,
        verdict: d.verdict,
        ai_summary: d.ai_summary,
        primary_insight: d.primary_insight,
        pros: d.pros,
        cons: d.cons,
        red_flags: d.red_flags,
        property_type: d.property_type,
        bedrooms: d.bedrooms,
        bathrooms: d.bathrooms,
        size_sqm: d.size_sqm,
      }} />
    </div>
  );
};

export default Analysis;
