import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import {
  ArrowLeft, MapPin, Building2, Calendar, Ruler, BedDouble, Bath,
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart,
} from "recharts";

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

type Analysis = any;

const SubscoreBar = ({ label, value, explanation }: { label: string; value: number; explanation?: { positive: string; negative: string } }) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        className="flex items-center gap-3 cursor-pointer group py-1.5"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xs text-muted-foreground w-32 flex-shrink-0 group-hover:text-foreground transition-colors">{label}</span>
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${value}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full rounded-full ${scoreBg(value)}`}
          />
        </div>
        <span className={`text-xs font-mono w-8 text-right font-medium ${scoreColor(value)}`}>{value}</span>
        {explanation && (
          open ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
      <AnimatePresence>
        {open && explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-32 pl-3 border-l border-border mb-2 overflow-hidden"
          >
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

const Analysis = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWhyNot90, setShowWhyNot90] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from("analyses")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) navigate("/dashboard");
        else setData(data);
        setLoading(false);
      });
  }, [id, user, navigate]);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-t-primary border-border animate-spin" />
    </div>
  );

  if (!data) return null;

  const d = data;
  const explanations = (d.score_explanations || {}) as Record<string, { positive: string; negative: string }>;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        {/* HERO */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Property header with gradient bg */}
            <div className="relative p-6 md:p-8 bg-gradient-hero">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${classificationColor(d.market_classification)}`}>
                      {d.market_classification}
                    </span>
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border ${verdictColor(d.verdict)}`}>
                      {d.verdict}
                    </span>
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-foreground mb-1">{d.address || `${d.city}, ${d.country}`}</h1>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                    <MapPin className="h-3.5 w-3.5" /> {d.city}, {d.country}
                  </div>
                  <p className="text-2xl md:text-3xl font-bold font-mono text-foreground">{d.price}</p>

                  <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
                    {d.property_type && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {d.property_type}</span>}
                    {d.size_sqm && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {d.size_sqm} m²</span>}
                    {d.bedrooms && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {d.bedrooms} bed</span>}
                    {d.bathrooms && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {d.bathrooms} bath</span>}
                    {d.year_built && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Built {d.year_built}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SCORE + SUBSCORES */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Score ring */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center">
            <div className="relative">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round"
                  strokeDasharray="264" strokeDashoffset={264 - (264 * d.global_score) / 100} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-5xl font-bold font-mono leading-none ${scoreColor(d.global_score)}`}>{d.global_score}</span>
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Global Score</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Performs better than <span className="font-mono font-semibold text-primary">{d.percentile}%</span> of comparable listings.
            </p>
            {d.market_rank && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Market Rank: <span className="font-mono text-foreground">#{d.market_rank}</span> of {d.market_total}
              </p>
            )}
          </motion.div>

          {/* Subscores */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="lg:col-span-2 rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-4">Subscore Breakdown</h3>
            <div className="space-y-1">
              <SubscoreBar label="ROI Potential" value={d.roi_potential} explanation={explanations.roi_potential} />
              <SubscoreBar label="Market Stability" value={d.market_stability} explanation={explanations.market_stability} />
              <SubscoreBar label="Demand Strength" value={d.demand_strength} explanation={explanations.demand_strength} />
              <SubscoreBar label="Risk Level" value={d.risk_level} explanation={explanations.risk_level} />
              <SubscoreBar label="Liquidity Outlook" value={d.liquidity_outlook} explanation={explanations.liquidity_outlook} />
            </div>

            {/* Why not 90+? */}
            {d.why_not_90 && (d.why_not_90 as string[]).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <button onClick={() => setShowWhyNot90(!showWhyNot90)} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Why is this not 90+? {showWhyNot90 ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <AnimatePresence>
                  {showWhyNot90 && (
                    <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2 space-y-1 overflow-hidden">
                      {(d.why_not_90 as string[]).map((r: string, i: number) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-score-average mt-0.5">•</span> {r}
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>

        {/* PRIMARY INSIGHT + AI SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl border border-primary/15 bg-primary/5 p-6">
            <p className="text-xs font-medium text-primary mb-2">Primary Insight</p>
            <p className="text-sm text-foreground leading-relaxed">{d.primary_insight}</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-medium text-foreground mb-2">AI Summary</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{d.ai_summary}</p>
          </motion.div>
        </div>

        {/* FORENSIC ANALYSIS: PROS / CONS / RED FLAGS / OPPORTUNITIES */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Pros
            </h3>
            <ul className="space-y-2">
              {(d.pros as string[])?.map((p: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">+</span> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-score-average" /> Cons
            </h3>
            <ul className="space-y-2">
              {(d.cons as string[])?.map((c: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-score-average mt-0.5">−</span> {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-score-poor" /> Red Flags
            </h3>
            <ul className="space-y-2">
              {(d.red_flags as string[])?.map((r: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-score-poor mt-0.5">⚠</span> {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Opportunity Signals
            </h3>
            <ul className="space-y-2">
              {(d.opportunity_signals as string[])?.map((o: string, i: number) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">★</span> {o}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* SCENARIO SIMULATION */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="rounded-2xl border border-border bg-card p-6 mb-8">
          <h3 className="text-sm font-semibold text-foreground mb-4">5-Year Scenario Simulation</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Projected ROI</p>
              <p className="text-lg font-mono font-bold text-primary">{d.projected_roi_low}% – {d.projected_roi_high}%</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Downside</p>
              <p className="text-lg font-mono font-bold text-score-poor">{d.downside_scenario}%</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Upside</p>
              <p className="text-lg font-mono font-bold text-primary">+{d.upside_scenario}%</p>
            </div>
            <div className="rounded-xl bg-secondary p-4 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Verdict</p>
              <p className={`text-lg font-bold ${d.verdict === "Strong" ? "text-primary" : d.verdict === "Moderate" ? "text-score-average" : "text-score-poor"}`}>{d.verdict}</p>
            </div>
          </div>
        </motion.div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {(d.price_history as any[])?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
              className="rounded-2xl border border-border bg-card p-6">
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
            </motion.div>
          )}
          {(d.yield_trend as any[])?.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
              className="rounded-2xl border border-border bg-card p-6">
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
            </motion.div>
          )}
        </div>

        {/* ALTERNATIVES */}
        {(d.alternatives as any[])?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
            className="rounded-2xl border border-border bg-card p-6 mb-8">
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
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Analysis;
