interface Props {
  score: number; // 0-10
  size?: "sm" | "md" | "lg";
}

const tone = (s: number) => {
  if (s >= 8.5) return { ring: "#10b981", text: "text-emerald-600" };
  if (s >= 7) return { ring: "#84cc16", text: "text-lime-600" };
  if (s >= 5.5) return { ring: "#eab308", text: "text-yellow-600" };
  if (s >= 4) return { ring: "#f59e0b", text: "text-amber-600" };
  return { ring: "#ef4444", text: "text-red-500" };
};

const ScoreRing = ({ score, size = "md" }: Props) => {
  const t = tone(score);
  const dim = size === "lg" ? 56 : size === "sm" ? 28 : 38;
  const stroke = size === "lg" ? 4 : 2.5;
  const r = (dim - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, score / 10));
  const offset = c * (1 - pct);
  const fontSize = size === "lg" ? 20 : size === "sm" ? 11 : 14;

  return (
    <span className="inline-flex items-center justify-center relative" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={r}
          fill="none"
          stroke={t.ring}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className={`absolute font-mono font-bold tabular-nums ${t.text}`} style={{ fontSize }}>
        {Math.round(score)}
      </span>
    </span>
  );
};

export default ScoreRing;
