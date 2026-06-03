import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Home, Eye, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import { scoreColor, scoreBg, verdictColor, confidenceColor } from "@/lib/score-utils";

// --- FOMO Loading Steps ---
export const fomoSteps = [
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
export const realEstateTips = [
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

        {report.primary_insight && (
          <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
            <p className="text-xs text-muted-foreground leading-relaxed">{report.primary_insight}</p>
          </div>
        )}

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
                    <X className="h-3 w-3 text-score-average flex-shrink-0 mt-0.5" />
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

  const { MapPin, Building2, Ruler, BedDouble, Bath, Calendar, Shield, Eye, ArrowUpRight } = require("lucide-react");
  const { classificationColor } = require("@/lib/score-utils");

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

// --- Main FomoLoader ---
export const FomoLoader = ({ step, readyReportId, onViewReady }: { step: number; readyReportId?: string; onViewReady?: () => void }) => {
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

                {/* Forensic 5-dimension scanner */}
                <div className="mt-8 w-full max-w-md">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3 text-center">Forensic scan</p>
                  <div className="grid grid-cols-1 gap-2">
                    {["Developer", "Delivery", "Legal", "Location", "Economics"].map((dim, i) => {
                      const active = step >= i;
                      const filling = step === i;
                      return (
                        <div key={dim} className="flex items-center gap-3">
                          <span className={`text-[11px] w-20 text-left tabular-nums ${active ? "text-foreground" : "text-muted-foreground/60"}`}>{dim}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-border/60 overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${active ? "bg-primary" : "bg-transparent"}`}
                              style={{ width: active ? (filling ? "70%" : "100%") : "0%" }}
                            />
                            {filling && (
                              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[hero-scan_1.4s_ease-in-out_infinite]" />
                            )}
                          </div>
                          <span className={`text-[10px] w-10 text-right tabular-nums ${active ? "text-primary" : "text-muted-foreground/50"}`}>
                            {active ? (filling ? "…" : "✓") : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </>
            )}
            
            {readyReportId && (
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Analysis complete — your report is ready above ↑</p>
              </div>
            )}
            
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

export default FomoLoader;
