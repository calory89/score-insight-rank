import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MapPin, TrendingUp, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ExampleReport = {
  id: string;
  address: string | null;
  city: string | null;
  country: string | null;
  global_score: number | null;
  price: string | null;
  verdict: string | null;
  image_url: string | null;
  roi_potential: number | null;
  primary_insight: string | null;
  url: string | null;
  projected_roi_high: number | null;
};

const scoreColor = (v: number) => {
  if (v >= 80) return "text-score-excellent";
  if (v >= 65) return "text-score-good";
  if (v >= 50) return "text-score-average";
  return "text-score-poor";
};

const scoreBorder = (v: number) => {
  if (v >= 80) return "border-score-excellent/30";
  if (v >= 65) return "border-score-good/30";
  if (v >= 50) return "border-score-average/30";
  return "border-score-poor/30";
};

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&h=300&fit=crop",
];

const ExampleReportsCarousel = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ExampleReport[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, address, city, country, global_score, price, verdict, image_url, roi_potential, primary_insight, url, projected_roi_high")
        .not("global_score", "is", null)
        .not("city", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) {
        // Pin ecobeachcity first, then show latest
        const ecoIdx = data.findIndex(r => r.url?.toLowerCase().includes("ecobeachcity"));
        const sorted = ecoIdx >= 0
          ? [data[ecoIdx], ...data.filter((_, i) => i !== ecoIdx)]
          : data;
        setReports(sorted.slice(0, 10));
      }
    };
    load();
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  if (reports.length === 0) return null;

  return (
    <div className="relative">
      {/* Navigation Arrows */}
      <button
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all shadow-md -ml-5 hidden md:flex"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all shadow-md -mr-5 hidden md:flex"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {reports.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(`/analysis/${report.id}`)}
            className={`flex-shrink-0 w-[280px] sm:w-[300px] rounded-2xl border-2 ${scoreBorder(report.global_score || 0)} bg-card overflow-hidden cursor-pointer group hover:shadow-xl hover:scale-[1.02] transition-all duration-300 snap-start`}
          >
            {/* Image */}
            <div className="relative h-40 overflow-hidden">
              <img
                src={report.image_url || PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length]}
                alt={report.address || "Property"}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length];
                }}
              />
              {/* Score Badge */}
              <div className="absolute top-3 right-3">
                <div className={`h-14 w-14 rounded-xl bg-card/90 backdrop-blur-sm border ${scoreBorder(report.global_score || 0)} flex flex-col items-center justify-center shadow-lg`}>
                  <span className={`font-mono text-xl font-bold ${scoreColor(report.global_score || 0)}`}>
                    {report.global_score}
                  </span>
                  <span className="text-[7px] text-muted-foreground uppercase tracking-wider">Score</span>
                </div>
              </div>
              {/* Verdict Badge */}
              <div className="absolute top-3 left-3">
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm ${
                  report.verdict === "Exceptional" ? "bg-primary/20 text-primary" :
                  report.verdict === "Strong" ? "bg-score-excellent/20 text-score-excellent" :
                  report.verdict === "Moderate" ? "bg-score-average/20 text-score-average" :
                  "bg-score-poor/20 text-score-poor"
                }`}>
                  {report.verdict}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3 w-3 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">{report.city}, {report.country}</span>
              </div>
              <h4 className="text-sm font-semibold text-foreground truncate mb-2">
                {report.address || `${report.city}, ${report.country}`}
              </h4>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-mono font-bold text-foreground">{report.price || "—"}</span>
                {(report.projected_roi_high || report.roi_potential) && (
                  <div className="flex items-center gap-1 text-primary">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-mono font-medium">ROI {report.projected_roi_high || report.roi_potential}%</span>
                  </div>
                )}
              </div>

              {report.primary_insight && (
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                  {report.primary_insight}
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-border">
                <span className="text-[10px] text-primary font-medium group-hover:underline">View Full Report →</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Scroll indicator */}
      <p className="text-center text-[10px] text-muted-foreground mt-2 md:hidden">
        ← Swipe to see more reports →
      </p>
    </div>
  );
};

export default ExampleReportsCarousel;
