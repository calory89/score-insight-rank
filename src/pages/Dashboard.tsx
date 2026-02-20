import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Calendar } from "lucide-react";

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

  const handleAnalyze = async () => {
    if (!url.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalyzeError("");
    try {
      const { data, error } = await supabase.functions.invoke("analyze-property", {
        body: { url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.data?.id) {
        navigate(`/analysis/${data.data.id}`);
      } else {
        setAnalyzing(false);
      }
    } catch (e: any) {
      setAnalyzeError(e.message || "Analysis failed. Try again.");
      setAnalyzing(false);
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-20 pb-16 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">My Analyses</h1>
          <p className="text-sm text-muted-foreground">Your property intelligence history.</p>
        </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analyses.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/analysis/${a.id}`)}
                className="rounded-xl border border-border bg-card p-5 hover:border-primary/20 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {a.address || `${a.city}, ${a.country}`}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.price} · {a.property_type}</p>
                  </div>
                  <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-secondary flex items-center justify-center">
                    <span className={`font-mono text-lg font-bold ${scoreColor(a.global_score)}`}>{a.global_score}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${verdictColor(a.verdict)}`}>
                      {a.verdict}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {new Date(a.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                    View Report →
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
