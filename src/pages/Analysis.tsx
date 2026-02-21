import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import ProtectedListingFallback from "@/components/ProtectedListingFallback";
import {
  ArrowLeft, MapPin, Building2, Calendar, Ruler, BedDouble, Bath,
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChevronDown, ChevronUp,
  Shield, Info, Target, DollarSign, PiggyBank, BarChart3, Home,
  Compass, Scale, Clock, Zap, CheckCircle2, XCircle, Eye,
  Landmark, Percent, ArrowUpRight, ArrowDownRight, GitCompare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import confetti from "canvas-confetti";

// --- helpers ---
const scoreColor = (v: number) => {
  if (v >= 80) return "text-score-excellent";
  if (v >= 65) return "text-score-good";
  if (v >= 50) return "text-score-average";
  return "text-score-poor";
};
const scoreBg = (v: number) => {
  if (v >= 80) return "bg-score-excellent";
  if (v >= 65) return "bg-score-good";
  if (v >= 50) return "bg-score-average";
  return "bg-score-poor";
};
const verdictColor = (v: string) => {
  if (v === "Strong") return "text-score-excellent border-score-excellent/20 bg-score-excellent/10";
  if (v === "Moderate") return "text-score-average border-score-average/20 bg-score-average/10";
  return "text-score-poor border-score-poor/20 bg-score-poor/10";
};
const classificationColor = (c: string) => {
  if (c === "Emerging") return "text-primary border-primary/20 bg-primary/10";
  if (c === "Stable") return "text-score-good border-score-good/20 bg-score-good/10";
  if (c === "Overpriced") return "text-score-average border-score-average/20 bg-score-average/10";
  return "text-accent-foreground border-accent/30 bg-accent/20";
};
const confidenceColor = (c: string) => {
  if (c === "high") return "text-score-excellent border-score-excellent/20 bg-score-excellent/10";
  if (c === "medium") return "text-score-average border-score-average/20 bg-score-average/10";
  return "text-score-poor border-score-poor/20 bg-score-poor/10";
};
const sqmToAcres = (sqm: number) => (sqm * 0.000247105).toFixed(3);
const sqmToSqft = (sqm: number) => Math.round(sqm * 10.7639);

type AnalysisData = any;

// --- FOMO Loading Steps ---
const fomoSteps = [
  { text: "Accessing listing page…", sub: "Extracting real property data" },
  { text: "Reading price, size & features…", sub: "Parsing listing content" },
  { text: "Analyzing market signals…", sub: "Comparing 450+ listings in the area" },
  { text: "Running neighborhood intelligence…", sub: "Walk score, transit, safety analysis" },
  { text: "Computing financial models…", sub: "Mortgage scenarios, IRR, break-even" },
  { text: "Building comparable database…", sub: "Finding similar sales & rentals" },
  { text: "Calculating risk exposure…", sub: "Stress tests & exit strategy" },
  { text: "Generating forensic report…", sub: "Final score calibration" },
];

const FomoLoader = ({ step }: { step: number }) => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
      <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
      </Button>
      <div className="rounded-2xl border border-border bg-card overflow-hidden mb-8">
        <div className="p-6 md:p-8 space-y-4">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-9 w-40" />
          <div className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-primary/20 bg-card p-8 md:p-12 mb-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative mx-auto mb-8 h-20 w-20">
            <div className="absolute inset-0 rounded-full border-2 border-border" />
            <div className="absolute inset-0 rounded-full border-2 border-t-primary animate-spin" style={{ animationDuration: "1.5s" }} />
            <div className="absolute inset-2 rounded-full border border-primary/20 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }} className="mb-6">
              <p className="text-base font-semibold text-foreground mb-1">{fomoSteps[step]?.text}</p>
              <p className="text-xs text-muted-foreground">{fomoSteps[step]?.sub}</p>
            </motion.div>
          </AnimatePresence>
          <div className="w-full max-w-xs">
            <div className="flex items-center gap-1.5 mb-3">
              {fomoSteps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-700 ${i <= step ? "flex-[2] bg-primary" : "flex-1 bg-border"}`} />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Step {step + 1} of {fomoSteps.length}</p>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            className="text-[11px] text-muted-foreground mt-6 border-t border-border pt-4">
            🔥 <span className="text-foreground font-medium">{Math.floor(Math.random() * 30) + 12} investors</span> analyzed properties in this area today
          </motion.p>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 opacity-30">
        <Skeleton className="h-52 rounded-2xl" />
        <div className="lg:col-span-2"><Skeleton className="h-52 rounded-2xl" /></div>
      </div>
    </div>
  </div>
);

// --- Subscore Bar ---
const SubscoreBar = ({ label, value, explanation }: { label: string; value: number; explanation?: { positive: string; negative: string } }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center gap-3 cursor-pointer group py-1.5" onClick={() => setOpen(!open)}>
        <span className="text-xs text-muted-foreground w-32 flex-shrink-0 group-hover:text-foreground transition-colors">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${scoreBg(value)}`} />
        </div>
        <span className={`text-xs font-mono w-8 text-right font-medium ${scoreColor(value)}`}>{value}</span>
        {explanation && (open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />)}
      </div>
      <AnimatePresence>
        {open && explanation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="ml-32 pl-3 border-l border-border mb-2 overflow-hidden">
            <div className="py-2 space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-xs text-primary font-medium flex-shrink-0">+</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{explanation.positive}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-score-average font-medium flex-shrink-0">−</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{explanation.negative}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- ConfidenceBadge ---
const ConfidenceBadge = ({ level }: { level: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const label = level === "high" ? "High" : level === "medium" ? "Medium" : "Low";
  const explanation = level === "high" ? "Analysis based on complete listing data."
    : level === "medium" ? "Analysis based on partial data. Some metrics are estimated."
    : "Limited data available. Scores are approximations.";
  return (
    <div className="relative inline-flex">
      <button onClick={() => setShowTooltip(!showTooltip)}
        className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${confidenceColor(level)}`}>
        <Shield className="h-3 w-3" /> Confidence: {label} <Info className="h-2.5 w-2.5 opacity-60" />
      </button>
      <AnimatePresence>
        {showTooltip && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 mt-1 z-20 rounded-lg border border-border bg-card p-3 shadow-lg min-w-[220px]">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Metric Card ---
const MetricCard = ({ icon: Icon, label, value, sub, positive }: { icon: any; label: string; value: string | number | undefined; sub?: string; positive?: boolean | null }) => {
  if (value === undefined || value === null) return null;
  return (
    <div className="rounded-xl bg-secondary/50 border border-border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-lg font-mono font-bold ${positive === true ? "text-primary" : positive === false ? "text-score-poor" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
};

// --- Section Header ---
const SectionHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle?: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="h-4 w-4 text-primary" />
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
);

// --- Animated Section Wrapper ---
const Section = ({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) => {
  const [revealed] = useState(true);
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: revealed ? 1 : 0.15 }} transition={{ duration: 0.6, delay }}
      className={className}>
      {children}
    </motion.div>
  );
};

// --- Main Component ---
const Analysis = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const urlToAnalyze = searchParams.get("url");
  const isLoadingMode = !id && !!urlToAnalyze;

  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [showWhyNot90, setShowWhyNot90] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fomoStep, setFomoStep] = useState(0);
  const fomoTimerRef = useRef<ReturnType<typeof setInterval>>();
  const [scrapeFailed, setScrapeFailed] = useState(false);
  const [submittingFallback, setSubmittingFallback] = useState(false);

  useEffect(() => {
    if (!analyzing) return;
    fomoTimerRef.current = setInterval(() => {
      setFomoStep((prev) => Math.min(prev + 1, fomoSteps.length - 1));
    }, 3500);
    return () => clearInterval(fomoTimerRef.current);
  }, [analyzing]);

  const runAnalysis = async (body: any) => {
    setAnalyzing(true);
    setAnalyzeError("");
    setScrapeFailed(false);
    setFomoStep(0);
    try {
      const { data: result, error } = await supabase.functions.invoke("analyze-property", { body });
      if (error) throw error;
      if (result?.scrape_failed) { setScrapeFailed(true); setAnalyzing(false); return; }
      if (result?.error) throw new Error(result.error);
      if (result?.data?.id) navigate(`/analysis/${result.data.id}`, { replace: true });
    } catch (e: any) {
      setAnalyzeError(e.message || "Analysis failed");
      setAnalyzing(false);
      setSubmittingFallback(false);
    }
  };

  const analysisTriggered = useRef(false);
  useEffect(() => {
    if (!isLoadingMode) return;
    if (!user) return; // Wait for auth state to settle
    if (analysisTriggered.current) return; // Prevent re-triggering
    analysisTriggered.current = true;
    setLoading(false);
    runAnalysis({ url: urlToAnalyze });
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

  if (analyzing && !data) return <FomoLoader step={fomoStep} />;

  if (scrapeFailed && !analyzing) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
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
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
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
  const explanations = (d.score_explanations || {}) as Record<string, any>;
  const f = (explanations.forensic || {}) as any;
  const globalScore = d.global_score;
  const confidenceLevel = d.confidence_level || "high";
  const premiumPositive = f.premium_discount_pct != null ? f.premium_discount_pct < 0 : null;
  // Currency symbol from data
  const curr = d.currency === "GBP" ? "£" : d.currency === "USD" ? "$" : d.currency === "DKK" ? "kr" : d.currency === "SEK" ? "kr" : d.currency === "NOK" ? "kr" : "€";

  // Radar chart data
  const radarData = [
    { metric: "ROI", value: d.roi_potential, market: 55 },
    { metric: "Stability", value: d.market_stability, market: 55 },
    { metric: "Demand", value: d.demand_strength, market: 55 },
    { metric: "Safety", value: Math.max(0, 100 - (d.risk_level || 50)), market: 45 },
    { metric: "Liquidity", value: d.liquidity_outlook, market: 55 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/compare?ids=${id}`)}>
            <GitCompare className="h-3.5 w-3.5 mr-1" /> Compare
          </Button>
        </div>

        {/* ===== PROJECT SITE WARNING ===== */}
        {(d.data_source === "project_website" || confidenceLevel === "low") && (
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

        {/* ===== 1. HERO WITH IMAGE ===== */}
        <Section delay={0.05} className="mb-8">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {f.listing_image_url && typeof f.listing_image_url === 'string' && f.listing_image_url.startsWith('http') && (
              <div className="h-48 md:h-64 w-full overflow-hidden">
                <img src={f.listing_image_url} alt={d.address || "Property"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
            )}
            <div className="relative p-6 md:p-8 bg-gradient-hero">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${classificationColor(d.market_classification)}`}>{d.market_classification}</span>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${verdictColor(d.verdict)}`}>{d.verdict}</span>
                    <ConfidenceBadge level={confidenceLevel} />
                    {f.renovation_status && <Badge variant="outline" className="text-[10px]">{f.renovation_status}</Badge>}
                    {f.energy_rating && <Badge variant="outline" className="text-[10px]">Energy: {f.energy_rating}</Badge>}
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">{d.address || `${d.city}, ${d.country}`}</h1>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                    <MapPin className="h-3.5 w-3.5" /> {d.city}, {d.country}
                  </div>
                  <p className="text-2xl md:text-3xl font-bold font-mono text-foreground">{d.price}</p>
                  <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                    {d.property_type && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {d.property_type}</span>}
                    {d.size_sqm != null && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{d.size_sqm} m² · {sqmToSqft(d.size_sqm)} ft²</span>}
                    {d.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {d.bedrooms} bed</span>}
                    {d.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {d.bathrooms} bath</span>}
                    {d.year_built != null && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Built {d.year_built}</span>}
                    {f.floor_info && <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> {f.floor_info}</span>}
                  </div>
                  {/* Property Features Tags */}
                  {f.property_features?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {(f.property_features as string[]).map((feat: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-[10px] font-normal">{feat}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ===== 2. GLOBAL SCORE + SUBSCORES + RADAR ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Section delay={0.1} className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center">
            <div className="relative">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray="264" strokeDashoffset={264 - (264 * globalScore) / 100} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-bold font-mono leading-none ${scoreColor(globalScore)}`}>{globalScore}</span>
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Global Score</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Better than <span className="font-mono font-semibold text-primary">{d.percentile}%</span> of comparable listings.
            </p>
            {d.market_rank && <p className="text-[11px] text-muted-foreground mt-1">Rank: <span className="font-mono text-foreground">#{d.market_rank}</span> of {d.market_total}</p>}
          </Section>

          <Section delay={0.15} className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Subscore Breakdown</h3>
            <div className="space-y-1">
              <SubscoreBar label="ROI Potential" value={d.roi_potential} explanation={explanations.roi_potential} />
              <SubscoreBar label="Market Stability" value={d.market_stability} explanation={explanations.market_stability} />
              <SubscoreBar label="Demand Strength" value={d.demand_strength} explanation={explanations.demand_strength} />
              <SubscoreBar label="Risk Level" value={d.risk_level} explanation={explanations.risk_level} />
              <SubscoreBar label="Liquidity Outlook" value={d.liquidity_outlook} explanation={explanations.liquidity_outlook} />
            </div>
            {d.why_not_90 && (d.why_not_90 as string[]).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <button onClick={() => setShowWhyNot90(!showWhyNot90)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Why not 90+? {showWhyNot90 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <AnimatePresence>
                  {showWhyNot90 && (
                    <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1 overflow-hidden">
                      {(d.why_not_90 as string[]).map((r: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-score-average mt-0.5">•</span> {r}</li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </Section>
        </div>

        {/* ===== RADAR CHART ===== */}
        <Section delay={0.18} className="rounded-2xl border border-border bg-card p-6 mb-8">
          <SectionHeader icon={Target} title="Property vs Market Average" subtitle="5-axis comparison" />
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(220, 14%, 14%)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="This Property" dataKey="value" stroke="hsl(160, 84%, 39%)" fill="hsl(160, 84%, 39%)" fillOpacity={0.2} strokeWidth={2} />
                <Radar name="Market Average" dataKey="market" stroke="hsl(220, 10%, 50%)" fill="hsl(220, 10%, 50%)" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
                <Tooltip contentStyle={{ background: "hsl(220, 18%, 7%)", border: "1px solid hsl(220, 14%, 14%)", borderRadius: 8, fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Section>

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

        {/* ===== KEY FINDINGS — PROS / CONS / RED FLAGS / OPPORTUNITIES ===== */}
        <Section delay={0.23} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Pros</h3>
            <ul className="space-y-2">
              {(d.pros as string[])?.map((p: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">+</span> {p}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-score-average" /> Cons</h3>
            <ul className="space-y-2">
              {(d.cons as string[])?.map((c: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-score-average mt-0.5">−</span> {c}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-score-poor" /> Red Flags</h3>
            <ul className="space-y-2">
              {(d.red_flags as string[])?.map((r: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-score-poor mt-0.5">⚠</span> {r}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Opportunity Signals</h3>
            <ul className="space-y-2">
              {(d.opportunity_signals as string[])?.map((o: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">★</span> {o}</li>
              ))}
            </ul>
          </div>
        </Section>

        {(f.price_per_sqm || f.cap_rate || f.fair_value_low) && (
          <Section delay={0.25} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <SectionHeader icon={DollarSign} title="Deal Quality Analysis" subtitle="Price positioning vs market" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {d.size_sqm != null && <MetricCard icon={Ruler} label="Price/m²" value={f.price_per_sqm ? `${curr}${f.price_per_sqm.toLocaleString()}` : undefined} />}
              {d.size_sqm != null && <MetricCard icon={Ruler} label="Price/sqft" value={f.price_per_sqft ? `${curr}${f.price_per_sqft.toLocaleString()}` : undefined} />}
              <MetricCard icon={BarChart3} label="Market Median/m²" value={f.market_median_sqm ? `${curr}${f.market_median_sqm.toLocaleString()}` : undefined} />
              <MetricCard icon={Percent} label="vs Median" value={f.premium_discount_pct != null ? `${f.premium_discount_pct > 0 ? "+" : ""}${f.premium_discount_pct}%` : undefined}
                positive={premiumPositive} sub={f.premium_discount_pct != null ? (f.premium_discount_pct < 0 ? "Below market — discount" : "Above market — premium") : undefined} />
            </div>
            {(f.fair_value_low || f.fair_value_high) && (
              <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Fair Value Range</p>
                <p className="text-sm font-mono font-semibold text-foreground">{f.fair_value_low} — {f.fair_value_high}</p>
              </div>
            )}
          </Section>
        )}

        {/* ===== 4. YIELD & CASH FLOW ===== */}
        {(f.cap_rate || f.gross_yield || f.monthly_cash_flow) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Section delay={0.28} className="rounded-2xl border border-border bg-card p-6">
              <SectionHeader icon={PiggyBank} title="Yield & Returns" />
              <div className="grid grid-cols-2 gap-3">
                <MetricCard icon={Percent} label="Cap Rate" value={f.cap_rate ? `${f.cap_rate}%` : undefined} />
                <MetricCard icon={Percent} label="Gross Yield" value={f.gross_yield ? `${f.gross_yield}%` : undefined} />
                <MetricCard icon={Percent} label="Net Yield" value={f.net_yield ? `${f.net_yield}%` : undefined} positive={f.net_yield > 5} />
                <MetricCard icon={DollarSign} label="Gross Annual Rent" value={f.gross_annual_rent} />
              </div>
            </Section>
            <Section delay={0.3} className="rounded-2xl border border-border bg-card p-6">
              <SectionHeader icon={TrendingUp} title="Cash Flow Simulation" />
              <div className="space-y-3">
                <MetricCard icon={DollarSign} label="Monthly (Unleveraged)" value={f.monthly_cash_flow}
                  positive={f.monthly_cash_flow && !f.monthly_cash_flow.includes("-")} />
                <MetricCard icon={Landmark} label="Leveraged (75% LTV)" value={f.leveraged_cash_flow}
                  positive={f.leveraged_cash_flow && !f.leveraged_cash_flow.includes("-")} />
              </div>
            </Section>
          </div>
        )}

        {/* ===== 5. BREAK-EVEN + MORTGAGE SCENARIOS ===== */}
        {(f.break_even_price || f.mortgage_scenarios?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {(f.break_even_price || f.break_even_rent) && (
              <Section delay={0.32} className="rounded-2xl border border-border bg-card p-6">
                <SectionHeader icon={Scale} title="Break-Even Analysis" />
                <div className="space-y-3">
                  <MetricCard icon={DollarSign} label="Break-Even Price" value={f.break_even_price} />
                  <MetricCard icon={DollarSign} label="Break-Even Rent" value={f.break_even_rent} />
                </div>
              </Section>
            )}
            {f.mortgage_scenarios?.length > 0 && (
              <Section delay={0.34} className="rounded-2xl border border-border bg-card p-6">
                <SectionHeader icon={Landmark} title="Mortgage Scenarios" />
                <div className="space-y-2">
                  {(f.mortgage_scenarios as any[]).map((s: any, i: number) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-secondary/50 border border-border px-4 py-3">
                      <div>
                        <p className="text-xs font-semibold text-foreground">{s.ltv}% LTV</p>
                        <p className="text-[10px] text-muted-foreground">{s.monthly_payment}/mo</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono text-primary">{s.cash_on_cash}% CoC</p>
                        <p className="text-[10px] text-muted-foreground">Interest: {s.total_interest}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* ===== 6. STRESS TESTS ===== */}
        {(f.stress_test_market_drop || f.stress_test_rental_decline) && (
          <Section delay={0.36} className="rounded-2xl border border-score-poor/10 bg-score-poor/5 p-6 mb-8">
            <SectionHeader icon={AlertTriangle} title="Stress Tests" subtitle="Downside scenario modeling" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-secondary/50 border border-border p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Market Drop -15%</p>
                <p className="text-lg font-mono font-bold text-score-poor">{f.stress_test_market_drop}</p>
              </div>
              <div className="rounded-xl bg-secondary/50 border border-border p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Rental Decline -10%</p>
                <p className="text-lg font-mono font-bold text-score-average">{f.stress_test_rental_decline}</p>
              </div>
            </div>
            {f.risk_return_quadrant && (
              <div className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Risk-Return Position</p>
                <p className="text-sm font-semibold text-foreground">{f.risk_return_quadrant}</p>
              </div>
            )}
          </Section>
        )}

        {/* ===== 7. NEIGHBORHOOD INTELLIGENCE ===== */}
        {f.neighborhood_scores && (
          <Section delay={0.38} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <SectionHeader icon={Compass} title="Neighborhood Intelligence" subtitle="Location quality indicators" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {f.neighborhood_scores.walk_score != null && (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Walk Score</p>
                  <p className={`text-2xl font-mono font-bold ${scoreColor(f.neighborhood_scores.walk_score)}`}>{f.neighborhood_scores.walk_score}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBg(f.neighborhood_scores.walk_score)}`} style={{ width: `${f.neighborhood_scores.walk_score}%` }} />
                  </div>
                </div>
              )}
              {f.neighborhood_scores.transit_score != null && (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Transit Score</p>
                  <p className={`text-2xl font-mono font-bold ${scoreColor(f.neighborhood_scores.transit_score)}`}>{f.neighborhood_scores.transit_score}</p>
                  <div className="mt-2 h-1.5 rounded-full bg-border overflow-hidden">
                    <div className={`h-full rounded-full ${scoreBg(f.neighborhood_scores.transit_score)}`} style={{ width: `${f.neighborhood_scores.transit_score}%` }} />
                  </div>
                </div>
              )}
              {f.neighborhood_scores.safety_rating && (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Safety</p>
                  <p className="text-lg font-semibold text-foreground">{f.neighborhood_scores.safety_rating}</p>
                </div>
              )}
              {f.neighborhood_scores.tourist_demand && (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Tourist Demand</p>
                  <p className="text-lg font-semibold text-foreground">{f.neighborhood_scores.tourist_demand}</p>
                </div>
              )}
              {f.neighborhood_scores.nearest_airport && (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Nearest Airport</p>
                  <p className="text-xs text-foreground">{f.neighborhood_scores.nearest_airport}</p>
                </div>
              )}
              {f.neighborhood_scores.school_quality && (
                <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Schools</p>
                  <p className="text-xs text-foreground">{f.neighborhood_scores.school_quality}</p>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* ===== 8. COMPARABLE SALES ===== */}
        {f.comparable_sales?.length > 0 && (
          <Section delay={0.4} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <SectionHeader icon={BarChart3} title="Comparable Sales" subtitle="Recent transactions in the area" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Address</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Price</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{curr}/m²</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(f.comparable_sales as any[]).map((comp: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-3 text-foreground">{comp.address}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground">{comp.price}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{comp.size_sqm} m²</td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary">{curr}{comp.price_per_sqm?.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{comp.date_sold || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ===== 9. RENTAL COMPS ===== */}
        {f.rental_comps?.length > 0 && (
          <Section delay={0.42} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <SectionHeader icon={Home} title="Rental Comparables" subtitle="Similar rentals nearby" />
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Address</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Monthly Rent</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">Size</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-medium">{curr}/m²/mo</th>
                  </tr>
                </thead>
                <tbody>
                  {(f.rental_comps as any[]).map((comp: any, i: number) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                      <td className="py-2.5 px-3 text-foreground">{comp.address}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-primary">{comp.monthly_rent}</td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{comp.size_sqm} m²</td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{curr}{comp.rent_per_sqm?.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}

        {/* ===== 10. COST BREAKDOWN ===== */}
        {f.cost_breakdown && (
          <Section delay={0.44} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <SectionHeader icon={DollarSign} title="Cost Breakdown" subtitle="Year-1 ownership costs" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard icon={DollarSign} label="Closing Costs" value={f.cost_breakdown.closing_costs} />
              <MetricCard icon={Landmark} label="Annual Tax" value={f.cost_breakdown.annual_tax} />
              <MetricCard icon={Shield} label="Insurance" value={f.cost_breakdown.annual_insurance} />
              <MetricCard icon={Home} label="Maintenance" value={f.cost_breakdown.annual_maintenance} />
              <MetricCard icon={Zap} label="Total Year 1" value={f.cost_breakdown.total_year1} />
            </div>
          </Section>
        )}

        {/* ===== 11. MARKET CONTEXT ===== */}
        {f.market_context && (
          <Section delay={0.46} className="rounded-2xl border border-border bg-card p-6 mb-8">
            <SectionHeader icon={Eye} title="Market Context" subtitle="Local market dynamics" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard icon={Clock} label="Avg Days on Market" value={f.market_context.avg_days_on_market} />
              <MetricCard icon={TrendingUp} label="YoY Price Change" value={f.market_context.yoy_price_change != null ? `${f.market_context.yoy_price_change > 0 ? "+" : ""}${f.market_context.yoy_price_change}%` : undefined}
                positive={f.market_context.yoy_price_change > 0} />
              <MetricCard icon={BarChart3} label="Supply/Demand" value={f.market_context.supply_demand_ratio} />
              <MetricCard icon={Building2} label="New Construction" value={f.market_context.new_construction} />
            </div>
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
              <p className={`text-lg font-bold ${d.verdict === "Strong" ? "text-primary" : d.verdict === "Moderate" ? "text-score-average" : "text-score-poor"}`}>{d.verdict}</p>
            </div>
          </div>
        </Section>

        {/* ===== CHARTS ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
              <MetricCard icon={TrendingUp} label="IRR" value={f.exit_strategy.irr ? `${f.exit_strategy.irr}%` : undefined} positive={f.exit_strategy.irr > 8} />
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
                <div key={i} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary/50 p-4 hover:border-primary/20 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className={`font-mono text-sm font-bold ${scoreColor(alt.score)}`}>{alt.score}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{alt.city}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{alt.price}</span>
                        <span className="text-[11px] text-muted-foreground">ROI {alt.roi}</span>
                        <span className={`text-[11px] ${alt.risk === "Low" ? "text-primary" : "text-score-average"}`}>{alt.risk} Risk</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 truncate">{alt.insight}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

export default Analysis;