import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";

type BadgeInfo = {
  icon: typeof AlertTriangle;
  label: string;
  color: string;
  bg: string;
};

export const getRedFlagBadges = (analysis: {
  global_score?: number | null;
  verdict?: string | null;
  risk_level?: number | null;
  red_flags?: any;
  market_classification?: string | null;
  roi_potential?: number | null;
  score_explanations?: any;
}): BadgeInfo[] => {
  const badges: BadgeInfo[] = [];
  const explanations = (analysis.score_explanations || {}) as any;
  const f = (explanations.forensic || {}) as any;

  // Overpriced detection
  if (f.premium_discount_pct != null && f.premium_discount_pct > 10) {
    badges.push({
      icon: TrendingDown,
      label: `Overpriced +${f.premium_discount_pct}%`,
      color: "text-score-poor",
      bg: "bg-score-poor/10 border-score-poor/20",
    });
  }

  // Below market value
  if (f.premium_discount_pct != null && f.premium_discount_pct < -8) {
    badges.push({
      icon: CheckCircle2,
      label: `Below Market ${f.premium_discount_pct}%`,
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    });
  }

  // High red flag count
  const redFlags = Array.isArray(analysis.red_flags) ? analysis.red_flags : [];
  if (redFlags.length >= 3) {
    badges.push({
      icon: AlertTriangle,
      label: `${redFlags.length} Red Flags`,
      color: "text-score-poor",
      bg: "bg-score-poor/10 border-score-poor/20",
    });
  }

  // High ROI potential
  if (analysis.roi_potential != null && analysis.roi_potential >= 80) {
    badges.push({
      icon: TrendingUp,
      label: "High ROI Potential",
      color: "text-primary",
      bg: "bg-primary/10 border-primary/20",
    });
  }

  // Risky
  if (analysis.risk_level != null && analysis.risk_level < 40) {
    badges.push({
      icon: AlertTriangle,
      label: "High Risk",
      color: "text-score-poor",
      bg: "bg-score-poor/10 border-score-poor/20",
    });
  }

  return badges.slice(0, 2); // Max 2 badges per card
};

export const RedFlagBadgeList = ({ analysis }: { analysis: any }) => {
  const badges = getRedFlagBadges(analysis);
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-full border ${b.bg} ${b.color}`}>
          <b.icon className="h-2.5 w-2.5" />
          {b.label}
        </span>
      ))}
    </div>
  );
};
