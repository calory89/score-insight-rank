import { useEffect, useState, useRef } from "react";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import Navbar from "@/components/Navbar";
import ProtectedListingFallback from "@/components/ProtectedListingFallback";
import ProGateOverlay from "@/components/ProGateOverlay";
import ReportExpiryBanner from "@/components/ReportExpiryBanner";
import BadDealAlert from "@/components/BadDealAlert";
import FreeLimitPricingModal from "@/components/FreeLimitPricingModal";
import {
  ArrowLeft, MapPin, Building2, Calendar, Ruler, BedDouble, Bath,
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChevronDown, ChevronUp,
  Shield, Info, Target, DollarSign, PiggyBank, BarChart3, Home,
  Compass, Scale, Clock, Zap, CheckCircle2, XCircle, Eye,
  Landmark, Percent, ArrowUpRight, ArrowDownRight, GitCompare, Flag, X, Send, Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import PropertyReviews from "@/components/PropertyReviews";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import confetti from "canvas-confetti";

import { scoreColor, scoreBg, verdictColor, classificationColor, confidenceColor } from "@/lib/score-utils";
import AnimatedScoreRing from "@/components/AnimatedScoreRing";
const sqmToAcres = (sqm: number) => (sqm * 0.000247105).toFixed(3);
const sqmToSqft = (sqm: number) => Math.round(sqm * 10.7639);

import type { Tables } from "@/integrations/supabase/types";

type AnalysisData = Tables<"analyses">;

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

// --- Educational Real Estate Tips ---
const realEstateTips = [
  "💡 The 1% rule: Monthly rent should be ≥1% of purchase price for positive cash flow.",
  "📊 Cap rate = Net Operating Income ÷ Property Value. Above 6% is generally strong.",
  "🏠 Location accounts for 80% of a property's long-term appreciation potential.",
  "💰 The average real estate investor holds a property for 7.5 years before selling.",
  "📈 Historically, real estate appreciates ~3-5% per year, outpacing inflation.",
  "🔑 Leverage is real estate's superpower: 20% down controls 100% of the asset.",
  "🌍 Currency risk can eat 10-20% of your returns on international investments.",
  "⚡ Properties within 500m of public transit appreciate 15-25% faster.",
  "🏗️ New construction depreciates ~1.5% per year — factor this into yield calculations.",
  "📉 The best deals are found in markets where supply exceeds demand by 8%+.",
  "🔍 Always verify the price per m² against the micro-market median before buying.",
  "💼 Rental yield above 7% net is considered excellent in most European markets.",
  "🏖️ Tourist areas offer high gross yields but seasonal vacancy can cut net returns by 30%.",
  "📋 Closing costs in Europe range from 5% to 15% depending on the country.",
  "🔒 Markets with strong tenant protection laws tend to have lower vacancy rates.",
  "🌐 Cross-border property investors save 12-18% by timing currency exchanges.",
  "🏢 Mixed-use properties typically outperform single-use by 2-3% annually.",
  "📊 A property's IRR should exceed 8% to justify the illiquidity premium vs stocks.",
];

// --- Inline Report Preview ---
const InlineReportPreview = ({ reportId }: { reportId: string }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("analyses")
      .select("id, address, city, country, global_score, price, currency, image_url, verdict, primary_insight, pros, cons, roi_potential, market_stability, demand_strength, risk_level, liquidity_outlook, score_explanations")
      .eq("id", reportId)
      .single()
      .then(({ data }) => {
        setReport(data);
        setLoading(false);
      });
  }, [reportId]);

  if (loading) return (
    <div className="rounded-2xl border border-border bg-card p-6 animate-pulse">
      <div className="flex gap-4">
        <Skeleton className="h-24 w-32 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );

  if (!report) return null;

  const explanations = report.score_explanations as Record<string, { positive: string; negative: string }> | null;
  const subscores = [
    { label: "ROI Potential", value: report.roi_potential },
    { label: "Market Stability", value: report.market_stability },
    { label: "Demand Strength", value: report.demand_strength },
    { label: "Safety Score", value: report.risk_level },
    { label: "Liquidity Outlook", value: report.liquidity_outlook },
  ].filter(s => s.value != null);

  const pros = Array.isArray(report.pros) ? report.pros as string[] : [];
  const cons = Array.isArray(report.cons) ? report.cons as string[] : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header with image + score */}
      <div className="relative">
        {report.image_url && (
          <img src={report.image_url} alt="" className="w-full h-40 object-cover" />
        )}
        {report.global_score != null && (
          <div className={`absolute top-3 right-3 rounded-xl px-3 py-1.5 ${report.global_score >= 80 ? 'bg-score-excellent' : report.global_score >= 65 ? 'bg-score-good' : report.global_score >= 50 ? 'bg-score-average' : 'bg-score-poor'} text-white font-mono font-bold text-lg shadow-lg`}>
            {report.global_score}
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Address & verdict */}
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {report.address || `${report.city || "Property"}${report.country ? `, ${report.country}` : ""}`}
          </h4>
          <div className="flex items-center gap-2 mt-1">
            {report.price && (
              <span className="text-xs text-muted-foreground">{report.currency || "€"}{report.price}</span>
            )}
            {report.verdict && (
              <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${verdictColor(report.verdict)}`}>
                {report.verdict}
              </span>
            )}
          </div>
        </div>

        {/* Subscores */}
        {subscores.length > 0 && (
          <div className="space-y-1.5">
            {subscores.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-28 flex-shrink-0">{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBg(s.value)}`} style={{ width: `${s.value}%` }} />
                </div>
                <span className={`text-[10px] font-mono w-6 text-right ${scoreColor(s.value)}`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Primary insight */}
        {report.primary_insight && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{report.primary_insight}</p>
          </div>
        )}

        {/* Pros / Cons */}
        {(pros.length > 0 || cons.length > 0) && (
          <div className="grid grid-cols-2 gap-3">
            {pros.length > 0 && (
              <div className="space-y-1">
                {pros.slice(0, 3).map((p, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{p}</p>
                  </div>
                ))}
              </div>
            )}
            {cons.length > 0 && (
              <div className="space-y-1">
                {cons.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <XCircle className="h-3 w-3 text-score-average flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{c}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Ready Report Preview Card ---
const ReadyReportCard = ({ reportId, onViewFull }: { reportId: string; onViewFull: () => void }) => {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    supabase
      .from("analyses")
      .select("id, address, city, country, global_score, price, currency, image_url, verdict, confidence_level, property_type, size_sqm, bedrooms, bathrooms, year_built, roi_potential, market_stability, demand_strength, risk_level, liquidity_outlook, market_classification")
      .eq("id", reportId)
      .single()
      .then(({ data }) => { if (data) setReport(data); });
  }, [reportId]);

  if (!report) return (
    <div className="rounded-2xl border-2 border-primary bg-primary/10 p-6 animate-pulse">
      <div className="flex gap-4">
        <Skeleton className="h-32 w-48 rounded-xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );

  const curr = report.currency === "GBP" ? "£" : report.currency === "USD" ? "$" : report.currency === "DKK" ? "kr" : report.currency === "SEK" ? "kr" : report.currency === "NOK" ? "kr" : "€";
  const subscores = [
    { label: "ROI Potential", value: report.roi_potential },
    { label: "Market Stability", value: report.market_stability },
    { label: "Demand Strength", value: report.demand_strength },
    { label: "Safety Score", value: report.risk_level },
    { label: "Liquidity Outlook", value: report.liquidity_outlook },
  ].filter(s => s.value != null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="rounded-2xl border-2 border-primary overflow-hidden bg-card shadow-lg"
    >
      {report.image_url && (
        <div className="relative h-44 sm:h-52">
          <img src={report.image_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          {report.market_classification && (
            <span className={`absolute top-3 left-3 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${classificationColor(report.market_classification)}`}>
              {report.market_classification}
            </span>
          )}
          {report.verdict && (
            <span className={`absolute top-3 ${report.market_classification ? "left-36" : "left-3"} text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${verdictColor(report.verdict)}`}>
              {report.verdict}
            </span>
          )}
          {report.global_score != null && (
            <div className={`absolute top-3 right-3 rounded-xl px-3 py-1.5 ${scoreBg(report.global_score)} text-white font-mono text-xl font-bold shadow-lg flex flex-col items-center`}>
              {report.global_score}
              <span className="text-[8px] font-normal uppercase tracking-widest opacity-80">Score</span>
            </div>
          )}
        </div>
      )}

      <div className="p-5 space-y-4">
        <div>
          {report.confidence_level && (
            <span className={`text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full border mb-2 inline-flex items-center gap-1 ${confidenceColor(report.confidence_level)}`}>
              <Shield className="h-2.5 w-2.5" /> Confidence: {report.confidence_level === "high" ? "High" : report.confidence_level === "medium" ? "Medium" : "Low"}
            </span>
          )}
          <h3 className="text-lg font-semibold text-foreground mt-1">
            {report.address || `${report.city || "Property"}${report.country ? `, ${report.country}` : ""}`}
          </h3>
          {(report.city || report.country) && report.address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {report.city}{report.country ? `, ${report.country}` : ""}
            </p>
          )}
          {report.price && (
            <p className="text-2xl font-bold font-mono text-foreground mt-2">{curr}{report.price}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            {report.property_type && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {report.property_type}</span>}
            {report.size_sqm && <span className="flex items-center gap-1"><Ruler className="h-3 w-3" /> {report.size_sqm} m²</span>}
            {report.bedrooms && <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {report.bedrooms} bed</span>}
            {report.bathrooms && <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {report.bathrooms} bath</span>}
            {report.year_built && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Built {report.year_built}</span>}
          </div>
        </div>

        {subscores.length > 0 && (
          <div className="border-t border-border pt-3 space-y-1.5">
            {subscores.map(s => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-28 flex-shrink-0">{s.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className={`h-full rounded-full ${scoreBg(s.value)}`} style={{ width: `${s.value}%` }} />
                </div>
                <span className={`text-[10px] font-mono w-6 text-right ${scoreColor(s.value)}`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        <Button onClick={onViewFull} className="w-full" variant="hero" size="lg">
          <Eye className="h-4 w-4 mr-2" /> View full report
          <ArrowUpRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
};

const FomoLoader = ({ step, readyReportId, onViewReady }: { step: number; readyReportId?: string; onViewReady?: () => void }) => {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * realEstateTips.length));
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previewId && previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [previewId]);

  useEffect(() => {
    if (readyReportId && readyRef.current) {
      readyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [readyReportId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % realEstateTips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch recent reports sorted by best score
  useEffect(() => {
    supabase
      .from("analyses")
      .select("id, city, country, global_score, price, currency, image_url, address, verdict, property_type, created_at")
      .not("global_score", "is", null)
      .order("global_score", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setRecentReports(data);
      });
  }, []);

  return (
  <div className="min-h-screen bg-background">
    <Navbar />
    <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">

      {/* Ready report preview card */}
      <AnimatePresence>
        {readyReportId && (
          <div ref={readyRef} className="mb-6">
            <ReadyReportCard reportId={readyReportId} onViewFull={onViewReady!} />
          </div>
        )}
      </AnimatePresence>

      <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" onClick={() => window.history.back()}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Cancel
      </Button>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-primary/20 bg-card p-8 md:p-12 mb-8">
        <div className="flex flex-col items-center text-center">
          {!readyReportId && (
            <>
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
            </>
          )}
          
          {readyReportId && (
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Analysis complete — your report is ready above ↑</p>
            </div>
          )}
          
          {/* Educational Real Estate Tip */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tipIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5 }}
              className="mt-6 border-t border-border pt-4 max-w-sm"
            >
              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                {realEstateTips[tipIndex]}
              </p>
            </motion.div>
          </AnimatePresence>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
            className="text-[10px] text-muted-foreground mt-4">
            🔥 <span className="text-foreground font-medium">{Math.floor(Math.random() * 30) + 12} investors</span> analyzed properties in this area today
          </motion.p>
        </div>
      </motion.div>

      {/* Browse other reports while waiting — ranked by score */}
      {recentReports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mb-8"
        >
          <div className="text-center mb-5">
            <p className="text-sm font-semibold text-foreground">
              🏆 Top rated properties — explore while we prepare yours
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ranked by score. Click any to preview without losing your search.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentReports.map((report, idx) => (
              <motion.button
                key={report.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 + idx * 0.1 }}
                onClick={() => setPreviewId(report.id)}
                className={`rounded-xl border p-4 text-left transition-all group ${
                  previewId === report.id 
                    ? "border-primary bg-primary/5" 
                    : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono font-bold text-muted-foreground w-4">#{idx + 1}</span>
                    {report.image_url ? (
                      <img src={report.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                        <Home className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {report.address || `${report.city || "Property"}${report.country ? `, ${report.country}` : ""}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {report.global_score != null && (
                        <span className={`text-xs font-mono font-bold ${scoreColor(report.global_score)}`}>
                          {report.global_score}/100
                        </span>
                      )}
                      {report.price && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          {report.currency || "€"}{report.price}
                        </span>
                      )}
                    </div>
                    {report.verdict && (
                      <span className={`inline-block mt-1.5 text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${verdictColor(report.verdict)}`}>
                        {report.verdict}
                      </span>
                    )}
                  </div>
                  <Eye className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Inline preview of clicked report */}
      <AnimatePresence>
        {previewId && (
          <motion.div
            ref={previewRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground">Previewing report</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => window.location.href = `/analysis/${previewId}`}>
                  <Eye className="h-3 w-3 mr-1" /> View full report
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => setPreviewId(null)}>
                  <X className="h-3 w-3 mr-1" /> Close
                </Button>
              </div>
            </div>
            <InlineReportPreview reportId={previewId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
};

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
  const [showWhyNot90, setShowWhyNot90] = useState(false);
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
  const [showFreeLimitModal, setShowFreeLimitModal] = useState(false);
  const [userAnalysesCount, setUserAnalysesCount] = useState(0);
  const { toast } = useToast();

  // Dynamic SEO meta
  useDocumentMeta({
    title: data ? `${data.address || data.city || "Property"} — Score ${data.global_score || ""}/100 | RealHunt` : "Analyzing Property… | RealHunt",
    description: data ? `AI analysis of ${data.address || data.city || "property"}${data.country ? ` in ${data.country}` : ""}. Score: ${data.global_score}/100. ${data.primary_insight || ""}` : "Running AI-powered real estate analysis…",
    ogImage: data?.image_url || undefined,
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
        // Don't auto-redirect — show banner instead so user isn't interrupted
        setReadyReportId(saved[0].id);
        // Clear any existing error since report is ready
        setAnalyzeError("");
        // Send browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Your report is ready! 🏠", {
            body: `${saved[0].address || saved[0].city || "Property"} — Score: ${saved[0].global_score}/100`,
          });
        }
      }
    }, 15000);

    // Safety timeout: prevent infinite loading — smart check before showing error
    const safetyTimeout = setTimeout(async () => {
      // Final DB check before showing error
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
      // Only show error if nothing found
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
        // CHECK DB FIRST: the analysis may have completed despite the client error
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

    // Cache check: if this URL was already analyzed by anyone, show cached result instantly
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

      // Check free limit
      const isAdmin = user?.email === "rrppspain@gmail.com";
      if (!isAdmin) {
        const { count } = await supabase
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        const used = count || 0;
        setUserAnalysesCount(used);
        if (used >= FREE_LIMIT) {
          // Check if user has an active subscription
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
      <Navbar />
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
    // If the report actually completed (polling found it), redirect instead of showing error
    if (readyReportId) {
      navigate(`/analysis/${readyReportId}`, { replace: true });
      return null;
    }
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
  const { isPro } = useSubscription();
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
    { metric: "Safety", value: d.risk_level || 50, market: 45 },
    { metric: "Liquidity", value: d.liquidity_outlook, market: 55 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
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
            <Button variant="outline" size="sm" className="text-xs" onClick={() => navigate(`/compare?ids=${id}`)}>
              <GitCompare className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Compare</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => {
              const shareUrl = d.slug ? `${window.location.origin}/r/${d.slug}` : window.location.href;
              if (navigator.share) {
                navigator.share({ title: `${d.address || d.city || "Property"} — Score ${d.global_score}/100`, url: shareUrl });
              } else {
                navigator.clipboard.writeText(shareUrl);
                toast({ title: "Link copied!", description: "Share this report with anyone." });
              }
            }}>
              <Send className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Share</span>
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setShowReportError(true)}>
              <Flag className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Report Error</span>
            </Button>
          </div>
        </div>

        {/* Report Expiry Banner for free users */}
        {!isPro && d.created_at && <ReportExpiryBanner createdAt={d.created_at} />}

        {/* Bad Deal Alert for free users */}
        {!isPro && d.global_score != null && (
          <BadDealAlert score={d.global_score} redFlagCount={(d.red_flags as string[])?.length || 0} />
        )}

        {/* ===== PROJECT SITE WARNING (excluded for ecobeachcity) ===== */}
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

        {/* ===== RENTAL LISTING WARNING ===== */}
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

        {/* ===== UNIFIED PROPERTY CARD: Image + Info + Score + Subscores ===== */}
        <Section delay={0.05} className="mb-8">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Property Image */}
            {(() => {
              const imgUrl = f.listing_image_url || d.image_url;
              return imgUrl && typeof imgUrl === 'string' && imgUrl.startsWith('http') ? (
                <div className="h-48 md:h-64 w-full overflow-hidden relative">
                  <img src={imgUrl} alt={d.address || "Property"} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  {/* Score overlay on image */}
                  <div className="absolute top-4 right-4">
                    <div className={`h-16 w-16 rounded-2xl bg-card/90 backdrop-blur-sm border border-border flex flex-col items-center justify-center shadow-lg`}>
                      <span className={`text-2xl font-bold font-mono leading-none ${scoreColor(globalScore)}`}>{globalScore}</span>
                      <span className="text-[7px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">Score</span>
                    </div>
                  </div>
                  {/* Badges overlay on image */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-1.5">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm bg-card/80 ${classificationColor(d.market_classification)}`}>{d.market_classification}</span>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm bg-card/80 ${verdictColor(d.verdict)}`}>{d.verdict}</span>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Property Info + Score Row */}
            <div className="p-5 md:p-6">
              {/* Badges (if no image) + Confidence */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {!(f.listing_image_url || d.image_url) && (
                  <>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${classificationColor(d.market_classification)}`}>{d.market_classification}</span>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${verdictColor(d.verdict)}`}>{d.verdict}</span>
                  </>
                )}
                <ConfidenceBadge level={confidenceLevel} />
                {f.renovation_status && <Badge variant="outline" className="text-[10px]">{f.renovation_status}</Badge>}
                {f.energy_rating && <Badge variant="outline" className="text-[10px]">Energy: {f.energy_rating}</Badge>}
              </div>

              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">{d.address || `${d.city}, ${d.country}`}</h1>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="h-3.5 w-3.5" /> {d.city}, {d.country}
              </div>
              <p className="text-2xl md:text-3xl font-bold font-mono text-foreground mb-3">{d.price}</p>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {d.property_type && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {d.property_type}</span>}
                {d.size_sqm != null && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{d.size_sqm} m² · {sqmToSqft(d.size_sqm)} ft²</span>}
                {d.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {d.bedrooms} bed</span>}
                {d.bathrooms != null && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {d.bathrooms} bath</span>}
                {d.year_built != null && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Built {d.year_built}</span>}
                {f.floor_info && <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> {f.floor_info}</span>}
              </div>
              {f.property_features?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(f.property_features as string[]).map((feat: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-normal">{feat}</Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Global Score Circle + Subscores */}
            <div className="p-5 md:p-6">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                {/* Score Circle */}
                <AnimatedScoreRing score={globalScore} size={160} />

                {/* Subscores */}
                <div className="flex-1 w-full">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Subscore Breakdown</h3>
                  <div className="space-y-1">
                    <SubscoreBar label="ROI Potential" value={d.roi_potential} explanation={explanations.roi_potential} />
                    <SubscoreBar label="Market Stability" value={d.market_stability} explanation={explanations.market_stability} />
                    <SubscoreBar label="Demand Strength" value={d.demand_strength} explanation={explanations.demand_strength} />
                    <SubscoreBar label="Safety Score" value={d.risk_level} explanation={explanations.risk_level} />
                    <SubscoreBar label="Liquidity Outlook" value={d.liquidity_outlook} explanation={explanations.liquidity_outlook} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Better than <span className="font-mono font-semibold text-primary">{d.percentile}%</span> of comparable listings.
                    {d.market_rank && d.market_rank <= d.market_total && <span className="ml-2">Rank: <span className="font-mono text-foreground">#{d.market_rank}</span> of {d.market_total}</span>}
                  </p>
                  {d.why_not_90 && (d.why_not_90 as string[]).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
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
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* (Global Score + Subscores already rendered above) */}

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

        {/* ===== 4. YIELD & CASH FLOW (Pro-gated) ===== */}
        <ProGateOverlay isPro={isPro} label="Unlock Yield & Cash Flow Analysis">
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
        </ProGateOverlay>

        {/* ===== 5. BREAK-EVEN + MORTGAGE SCENARIOS (Pro-gated) ===== */}
        <ProGateOverlay isPro={isPro} label="Unlock Break-Even & Mortgage Data">
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
        </ProGateOverlay>

        {/* ===== 6. STRESS TESTS (Pro-gated) ===== */}
        <ProGateOverlay isPro={isPro} label="Unlock Stress Test Reports">
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
        </ProGateOverlay>

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

        {/* ===== 8. COMPARABLE SALES (Pro-gated) ===== */}
        <ProGateOverlay isPro={isPro} label="Unlock Comparable Sales">
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
              <p className={`text-lg font-bold ${d.verdict === "Exceptional" ? "text-primary" : d.verdict === "Strong" ? "text-score-excellent" : d.verdict === "Moderate" ? "text-score-average" : "text-score-poor"}`}>{d.verdict}</p>
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

        {/* ===== COMMUNITY REVIEWS ===== */}
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
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 bg-gradient-cta text-primary-foreground px-5 py-3 rounded-full shadow-xl hover:shadow-2xl hover:brightness-110 transition-all flex items-center gap-2 text-sm font-semibold"
        >
          <Eye className="h-4 w-4" /> Visit Property
        </motion.button>
      )}
    </div>
  );
};

export default Analysis;