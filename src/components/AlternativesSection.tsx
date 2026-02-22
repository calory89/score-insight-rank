import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Alternative = {
  id: string;
  city: string | null;
  country: string | null;
  global_score: number | null;
  roi_potential: number | null;
  price: string | null;
  verdict: string | null;
};

const AlternativesSection = () => {
  const navigate = useNavigate();
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, city, country, global_score, roi_potential, price, verdict")
        .not("global_score", "is", null)
        .not("city", "is", null)
        .order("global_score", { ascending: false })
        .limit(4);
      if (data) setAlternatives(data);
    };
    load();
  }, []);

  if (alternatives.length === 0) return null;

  const best = alternatives[0];

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-4"
        >
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intelligent Cross-Analysis</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Top Rated Properties Right Now
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Highest-performing properties analyzed by RealHunt users.
          </p>
        </motion.div>

        {/* Best Score Highlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto mb-10"
        >
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-xl border border-border bg-card p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Top Score</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-primary">{best.global_score}</p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Best City</p>
              <p className="text-sm sm:text-base font-semibold text-foreground truncate">{best.city}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Properties Analyzed</p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-foreground">{alternatives.length}+</p>
            </div>
          </div>
        </motion.div>

        <div className="max-w-3xl mx-auto space-y-3">
          {alternatives.map((alt, i) => (
            <motion.div
              key={alt.id}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(`/analysis/${alt.id}`)}
              className="group rounded-xl border border-border bg-card p-4 md:p-5 hover:border-primary/20 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-base sm:text-lg font-bold text-primary">{alt.global_score}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-foreground truncate">{alt.city}, {alt.country}</h4>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                      <span className="text-[11px] sm:text-xs text-muted-foreground">{alt.price || "—"}</span>
                      {alt.roi_potential && (
                        <span className="text-[11px] sm:text-xs text-muted-foreground">ROI {alt.roi_potential}%</span>
                      )}
                      <span className={`text-[11px] sm:text-xs ${
                        alt.verdict === "Strong" ? "text-primary" : "text-score-average"
                      }`}>{alt.verdict}</span>
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AlternativesSection;
