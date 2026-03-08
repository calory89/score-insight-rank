import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Heart, GitCompare, MapPin, Calendar, TrendingUp, Shield, BarChart3, Building2, ArrowRight,
} from "lucide-react";
import { scoreColor, verdictColorSimple as verdictColor, riskLabel } from "@/lib/score-utils";
import { RedFlagBadgeList } from "@/components/RedFlagBadges";

interface DashboardPropertyCardProps {
  analysis: any;
  index: number;
  isFavorite: boolean;
  isCompare: boolean;
  noteData?: { note: string; tags: string[] } | null;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onToggleCompare: (e: React.MouseEvent, id: string) => void;
}

const DashboardPropertyCard = ({
  analysis: a,
  index,
  isFavorite: isFav,
  isCompare,
  noteData,
  onToggleFavorite,
  onToggleCompare,
}: DashboardPropertyCardProps) => {
  const navigate = useNavigate();
  const risk = riskLabel(a.risk_level || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => navigate(`/analysis/${a.id}`)}
      className={`rounded-xl border bg-card overflow-hidden hover:border-primary/20 transition-all cursor-pointer group ${
        isCompare ? "border-primary/30 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        {a.image_url ? (
          <div className="sm:w-40 h-32 sm:h-auto bg-secondary overflow-hidden flex-shrink-0 relative">
            <img src={a.image_url} alt={a.address || "Property"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 absolute inset-0" />
          </div>
        ) : (
          <div className="sm:w-40 h-20 sm:h-auto bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center flex-shrink-0">
            <Building2 className="h-6 w-6 text-muted-foreground/30" />
          </div>
        )}

        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {a.address || `${a.city}, ${a.country}`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {a.city}, {a.country} · {a.price} · {a.property_type}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => onToggleFavorite(e, a.id)}
                className={`p-1.5 rounded-lg transition-colors ${isFav ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={(e) => onToggleCompare(e, a.id)}
                className={`p-1.5 rounded-lg transition-colors ${isCompare ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
                title={isCompare ? "Remove from comparison" : "Add to comparison"}
              >
                <GitCompare className="h-4 w-4" />
              </button>
              <div className="h-14 w-14 rounded-lg bg-secondary flex flex-col items-center justify-center">
                <span className={`font-mono text-xl font-bold ${scoreColor(a.global_score)}`}>{a.global_score}</span>
                <span className="text-[8px] text-muted-foreground uppercase">score</span>
              </div>
            </div>
          </div>

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
            {a.data_source === "project_website" && (
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-score-average/10 text-score-average border border-score-average/20">
                Project Site
              </span>
            )}
          </div>

          {a.ai_summary && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{a.ai_summary}</p>
          )}

          {noteData && (noteData.tags.length > 0 || noteData.note) && (
            <div className="mb-2">
              <div className="flex items-center gap-1 flex-wrap">
                {noteData.tags.map(t => (
                  <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{t}</span>
                ))}
                {noteData.note && (
                  <span className="text-[9px] text-muted-foreground italic truncate max-w-[200px]">📝 {noteData.note}</span>
                )}
              </div>
            </div>
          )}

          <div className="mb-3">
            <RedFlagBadgeList analysis={a} />
          </div>

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
            <div className="flex items-center gap-2">
              {a.url && a.url !== "manual-entry" && (
                <button onClick={(e) => { e.stopPropagation(); window.open(a.url, "_blank"); }}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1">
                  See Property ↗
                </button>
              )}
              <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors">
                View Report →
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPropertyCard;
