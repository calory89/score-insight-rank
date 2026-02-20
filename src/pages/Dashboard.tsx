import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Calendar, Building2, TrendingUp, MapPin, Globe, Shield, BarChart3 } from "lucide-react";

const verdictColor = (v: string) => {
  if (v === "Strong") return "text-score-excellent bg-score-excellent/10";
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

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("analyses")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setAnalyses(data || []);
        setLoading(false);
      });
  }, [user]);

  const handleAnalyze = () => {
    if (!url.trim() || analyzing) return;
    navigate(`/analysis/loading?url=${encodeURIComponent(url.trim())}`);
  };

  if (authLoading || !user) return null;

  // Compute stats
  const avgScore = analyses.length > 0 ? Math.round(analyses.reduce((s, a) => s + (a.global_score || 0), 0) / analyses.length) : 0;
  const countriesAnalyzed = [...new Set(analyses.map(a => a.country).filter(Boolean))].length;

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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Strong Verdicts</p>
              <p className="text-2xl font-bold font-mono text-score-excellent">{analyses.filter(a => a.verdict === "Strong").length}</p>
            </div>
          </div>
        )}

        {/* New analysis input */}
        <div className="mb-8">
          <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-card rounded-xl border border-border p-2">
            <div className="flex items-center flex-1 min-w-0">
              <Search className="ml-3 h-4 w-4 text-muted-foreground flex-shrink-0" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                placeholder="Paste a new listing URL to analyze…"
                className="flex-1 bg-transparent px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
              />
            </div>
            <Button variant="hero" size="sm" className="rounded-lg px-4 flex-shrink-0" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "Analyzing…" : "Analyze"} <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
          {analyzeError && <p className="text-xs text-destructive mt-2">{analyzeError}</p>}
        </div>

        {/* Analyses list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-t-primary border-border animate-spin" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No analyses yet. Paste a listing URL above to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {analyses.map((a, i) => {
              const risk = riskLabel(a.risk_level || 0);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/analysis/${a.id}`)}
                  className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-all cursor-pointer group"
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
                      {/* Top row: title + score */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {a.address || `${a.city}, ${a.country}`}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {a.city}, {a.country} · {a.price} · {a.property_type}
                          </p>
                        </div>
                        <div className="flex-shrink-0 h-14 w-14 rounded-lg bg-secondary flex flex-col items-center justify-center">
                          <span className={`font-mono text-xl font-bold ${scoreColor(a.global_score)}`}>{a.global_score}</span>
                          <span className="text-[8px] text-muted-foreground uppercase">score</span>
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
                        {a.roi_potential != null && (
                          <span className="text-xs text-muted-foreground">
                            ROI Score: <span className={`font-mono font-medium ${scoreColor(a.roi_potential)}`}>{a.roi_potential}</span>
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
                        <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                          View Full Report →
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
