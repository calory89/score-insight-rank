interface ScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const tone = (s: number) => {
  if (s >= 8.5) return { bg: "bg-emerald-500/15", text: "text-emerald-400", ring: "ring-emerald-500/30" };
  if (s >= 7.0) return { bg: "bg-amber-500/15", text: "text-amber-400", ring: "ring-amber-500/30" };
  return { bg: "bg-rose-500/15", text: "text-rose-400", ring: "ring-rose-500/30" };
};

const ScoreBadge = ({ score, size = "md" }: ScoreBadgeProps) => {
  const t = tone(score);
  const sz = size === "lg" ? "text-2xl px-3 py-1.5" : size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";
  return (
    <span className={`inline-flex items-center justify-center rounded-md font-mono font-semibold tabular-nums ring-1 ${t.bg} ${t.text} ${t.ring} ${sz}`}>
      {score.toFixed(1)}
    </span>
  );
};

export default ScoreBadge;
