import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Plus, X, Building2, MapPin, TrendingUp, Shield, Ruler,
  BedDouble, Bath, Calendar, CheckCircle2, XCircle, Target, DollarSign,
  AlertTriangle, Sparkles, ChevronDown, Trophy, Award, Share2, Download,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";

import { scoreColor, scoreBg, verdictColorSimple as verdictColor } from "@/lib/score-utils";
import BottomNav from "@/components/BottomNav";

const RADAR_COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(200, 80%, 55%)",
  "hsl(48, 96%, 53%)",
  "hsl(280, 60%, 55%)",
];

type AnalysisData = any;

const Compare = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  const [properties, setProperties] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [allAnalyses, setAllAnalyses] = useState<AnalysisData[]>([]);
  const [showPicker, setShowPicker] = useState(ids.length === 1);

  useEffect(() => {
    if (!user) return;
    // Load all user analyses for the picker
    supabase.from("analyses").select("id, address, city, country, global_score, price, image_url, property_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setAllAnalyses(data || []));
  }, [user]);

  useEffect(() => {
    if (ids.length === 0) { setLoading(false); return; }
    supabase.from("analyses").select("*").in("id", ids).then(({ data }) => {
      setProperties(data || []);
      setLoading(false);
    });
  }, [ids.join(",")]);

  const addProperty = (id: string) => {
    const newIds = [...ids, id];
    navigate(`/compare?ids=${newIds.join(",")}`, { replace: true });
    setShowPicker(false);
  };

  const removeProperty = (id: string) => {
    const newIds = ids.filter(i => i !== id);
    navigate(`/compare?ids=${newIds.join(",")}`, { replace: true });
  };

  const availableToAdd = allAnalyses.filter(a => !ids.includes(a.id));

  // Build overlaid radar data
  const radarMetrics = ["ROI", "Stability", "Demand", "Safety", "Liquidity"];
  const radarData = radarMetrics.map(metric => {
    const point: any = { metric };
    properties.forEach((p, i) => {
      const key = `prop${i}`;
      if (metric === "ROI") point[key] = p.roi_potential;
      if (metric === "Stability") point[key] = p.market_stability;
      if (metric === "Demand") point[key] = p.demand_strength;
      if (metric === "Safety") point[key] = p.risk_level || 50;
      if (metric === "Liquidity") point[key] = p.liquidity_outlook;
    });
    return point;
  });

  // Comparison rows
  const compRows = [
    { label: "Global Score", key: "global_score", format: (v: any) => v, highlight: true },
    { label: "Price", key: "price", format: (v: any) => v },
    { label: "City", key: "city", format: (v: any) => v },
    { label: "Country", key: "country", format: (v: any) => v },
    { label: "Type", key: "property_type", format: (v: any) => v },
    { label: "Size (m²)", key: "size_sqm", format: (v: any) => v ? `${v} m²` : "—" },
    { label: "Bedrooms", key: "bedrooms", format: (v: any) => v ?? "—" },
    { label: "Bathrooms", key: "bathrooms", format: (v: any) => v ?? "—" },
    { label: "Year Built", key: "year_built", format: (v: any) => v ?? "—" },
    { label: "ROI Potential", key: "roi_potential", format: (v: any) => v, highlight: true },
    { label: "Market Stability", key: "market_stability", format: (v: any) => v, highlight: true },
    { label: "Demand Strength", key: "demand_strength", format: (v: any) => v, highlight: true },
    { label: "Safety Score", key: "risk_level", format: (v: any) => v, highlight: true },
    { label: "Liquidity", key: "liquidity_outlook", format: (v: any) => v, highlight: true },
    { label: "Verdict", key: "verdict", format: (v: any) => v },
    { label: "Classification", key: "market_classification", format: (v: any) => v },
    { label: "Percentile", key: "percentile", format: (v: any) => v ? `Top ${100 - v}%` : "—" },
    { label: "ROI (5yr)", key: null, format: (_: any, p: any) => p.projected_roi_low && p.projected_roi_high ? `${p.projected_roi_low}% – ${p.projected_roi_high}%` : "—" },
    { label: "Downside", key: "downside_scenario", format: (v: any) => v ? `${v}%` : "—" },
    { label: "Upside", key: "upside_scenario", format: (v: any) => v ? `+${v}%` : "—" },
  ];

  // Find best value for highlighting + category winners
  const getBest = (key: string | null, idx: number) => {
    if (!key || properties.length < 2) return false;
    const vals = properties.map(p => p[key]).filter(v => v != null);
    if (vals.length === 0) return false;
    const pVal = properties[idx]?.[key];
    if (pVal == null) return false;
    const best = Math.max(...vals as number[]);
    return pVal === best;
  };

  // Category winners for badges
  const categoryWinners = properties.length >= 2 ? [
    { label: "Best ROI", key: "roi_potential", icon: TrendingUp },
    { label: "Most Stable", key: "market_stability", icon: Shield },
    { label: "Highest Demand", key: "demand_strength", icon: Target },
    { label: "Safest", key: "risk_level", icon: Shield },
    { label: "Most Liquid", key: "liquidity_outlook", icon: DollarSign },
  ].map(cat => {
    const best = properties.reduce((a, b) => ((a[cat.key] || 0) > (b[cat.key] || 0) ? a : b));
    return { ...cat, winnerId: best.id, winnerName: best.address || best.city };
  }) : [];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-t-primary border-border animate-spin" /></div>;

  return (
    <>
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-6xl">
        <Button variant="ghost" size="sm" className="mb-6 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Property Comparison</h1>
          <p className="text-sm text-muted-foreground">Side-by-side forensic analysis — Kimovil style</p>
        </div>

        {properties.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-border bg-card">
            <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm mb-4">Select properties to compare from your dashboard.</p>
            <Button variant="hero" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          </div>
        ) : (
          <>
            {/* Property Headers */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
              {properties.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="flex-1 min-w-[200px] rounded-xl border bg-card p-4 relative" style={{ borderColor: RADAR_COLORS[i] + "40" }}>
                  <button onClick={() => removeProperty(p.id)} className="absolute top-2 right-2 p-1 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: RADAR_COLORS[i] + "15" }}>
                      <span className={`font-mono text-lg font-bold ${scoreColor(p.global_score)}`}>{p.global_score}</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{p.address || `${p.city}, ${p.country}`}</h3>
                      <p className="text-[11px] text-muted-foreground truncate">{p.price} · {p.property_type}</p>
                    </div>
                  </div>
                  <div className="h-1 rounded-full" style={{ backgroundColor: RADAR_COLORS[i] }} />
                </motion.div>
              ))}
              {properties.length < 4 && (
                <button onClick={() => setShowPicker(true)}
                  className="flex-shrink-0 w-[200px] rounded-xl border border-dashed border-border bg-card/50 p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/30 transition-colors">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add Property</span>
                </button>
              )}
            </div>

            {/* Picker Modal */}
            {showPicker && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card p-4 mb-6 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Select a property to compare</h3>
                  <button onClick={() => setShowPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
                </div>
                {availableToAdd.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No more properties to add. Analyze more properties first.</p>
                ) : (
                  <div className="space-y-2">
                    {availableToAdd.map(a => (
                      <button key={a.id} onClick={() => addProperty(a.id)}
                        className="w-full flex items-center gap-3 rounded-lg bg-secondary/50 border border-border p-3 hover:border-primary/20 transition-colors text-left">
                        <span className={`font-mono text-sm font-bold ${scoreColor(a.global_score)}`}>{a.global_score}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{a.address || `${a.city}, ${a.country}`}</p>
                          <p className="text-[10px] text-muted-foreground">{a.price} · {a.property_type}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Radar Chart Overlay */}
            {properties.length >= 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-2xl border border-border bg-card p-6 mb-8">
                <h3 className="text-sm font-semibold text-foreground mb-1">Pentagon Comparison</h3>
                <p className="text-[10px] text-muted-foreground mb-4">All properties overlaid on the same chart</p>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(220, 14%, 14%)" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "hsl(220, 10%, 50%)" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      {properties.map((p, i) => (
                        <Radar key={p.id} name={p.city || `Property ${i + 1}`} dataKey={`prop${i}`}
                          stroke={RADAR_COLORS[i]} fill={RADAR_COLORS[i]} fillOpacity={0.1} strokeWidth={2} />
                      ))}
                      <Tooltip contentStyle={{ background: "hsl(220, 18%, 7%)", border: "1px solid hsl(220, 14%, 14%)", borderRadius: 8, fontSize: 12 }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-3 justify-center">
                  {properties.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: RADAR_COLORS[i] }} />
                      <span className="text-[10px] text-muted-foreground">{p.address || p.city}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Category Winner Badges */}
            {properties.length >= 2 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {categoryWinners.map(cat => {
                  const winnerIdx = properties.findIndex(p => p.id === cat.winnerId);
                  return (
                    <div key={cat.label} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                      <cat.icon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground">{cat.label}:</span>
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: RADAR_COLORS[winnerIdx] }} />
                      <span className="text-[10px] font-medium text-foreground">{cat.winnerName}</span>
                      <Trophy className="h-3 w-3 text-score-average" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comparison Table */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium w-40">Metric</th>
                      {properties.map((p, i) => (
                        <th key={p.id} className="text-center py-3 px-4 font-medium" style={{ color: RADAR_COLORS[i] }}>
                          {p.city || `Prop ${i + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="py-3 px-4 text-muted-foreground font-medium">{row.label}</td>
                        {properties.map((p, pi) => {
                          const val = row.key ? p[row.key] : null;
                          const formatted = row.format(val, p);
                          const isBest = row.highlight && getBest(row.key, pi);
                          return (
                            <td key={p.id} className={`py-3 px-4 text-center font-mono ${
                              row.highlight && typeof formatted === "number" ? scoreColor(formatted) :
                              row.key === "verdict" ? verdictColor(formatted) :
                              "text-foreground"
                            } ${isBest ? "font-bold" : ""}`}>
                              {formatted}
                              {isBest && <span className="ml-1 text-primary text-[8px]">★</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pros & Cons Side-by-Side */}
            <div className="grid grid-cols-1 gap-6 mb-8">
              {properties.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border bg-card p-6" style={{ borderColor: RADAR_COLORS[i] + "30" }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: RADAR_COLORS[i] }} />
                    <h3 className="text-sm font-semibold text-foreground">{p.address || `${p.city}, ${p.country}`}</h3>
                    <span className={`font-mono text-sm font-bold ml-auto ${scoreColor(p.global_score)}`}>{p.global_score}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-medium text-primary mb-2 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Pros</h4>
                      <ul className="space-y-1.5">
                        {(p.pros as string[])?.map((pr: string, j: number) => (
                          <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5"><span className="text-primary mt-0.5">+</span> {pr}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-score-poor mb-2 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Cons & Red Flags</h4>
                      <ul className="space-y-1.5">
                        {(p.cons as string[])?.map((c: string, j: number) => (
                          <li key={j} className="text-[11px] text-muted-foreground flex items-start gap-1.5"><span className="text-score-average mt-0.5">−</span> {c}</li>
                        ))}
                        {(p.red_flags as string[])?.map((r: string, j: number) => (
                          <li key={`rf${j}`} className="text-[11px] text-muted-foreground flex items-start gap-1.5"><span className="text-score-poor mt-0.5">⚠</span> {r}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Winner Summary */}
            {properties.length >= 2 && (() => {
              const sorted = [...properties].sort((a, b) => (b.global_score || 0) - (a.global_score || 0));
              const winner = sorted[0];
              const winnerIdx = properties.findIndex(p => p.id === winner.id);
              const categoriesWon = categoryWinners.filter(c => c.winnerId === winner.id).length;
              return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-2xl border border-primary/20 bg-primary/5 p-6 mb-8 text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Trophy className="h-6 w-6 text-score-average" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">Best Overall</span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">RealHunt Recommendation</h3>
                  <p className="text-xs text-muted-foreground mb-3">Based on overall forensic analysis</p>
                  <div className="inline-flex items-center gap-3 rounded-xl bg-card border border-border px-5 py-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: RADAR_COLORS[winnerIdx] }} />
                    <span className="text-sm font-semibold text-foreground">{winner.address || `${winner.city}, ${winner.country}`}</span>
                    <span className={`font-mono text-lg font-bold ${scoreColor(winner.global_score)}`}>{winner.global_score}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 max-w-md mx-auto">
                    Scores {winner.global_score - sorted[1].global_score} points higher overall.
                    Wins {categoriesWon} of {categoryWinners.length} categories.
                    {winner.roi_potential > sorted[1].roi_potential ? " Better ROI potential." : ""}
                    {winner.risk_level > sorted[1].risk_level ? " Better safety profile." : ""}
                  </p>
                  <Button variant="hero" size="sm" className="mt-4" onClick={() => navigate(`/analysis/${winner.id}`)}>
                    View Full Report <ChevronDown className="h-3.5 w-3.5 ml-1 -rotate-90" />
                  </Button>
                </motion.div>
              );
            })()}
          </>
        )}
      </div>
    </div>
    <BottomNav />
    </>
  );
};

export default Compare;
