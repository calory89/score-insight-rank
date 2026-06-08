import { scoreToGrade } from "@/lib/grade";

interface ScoreVisualProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
}

const tone = (s: number) => {
  if (s >= 85) return {
    ring: "border-good/50",
    bg: "bg-good/10",
    text: "text-good",
    bar: "bg-good",
  };
  if (s >= 75) return {
    ring: "border-warn/50",
    bg: "bg-warn/10",
    text: "text-warn",
    bar: "bg-warn",
  };
  return {
    ring: "border-hairline-strong",
    bg: "bg-surface",
    text: "text-ink-soft",
    bar: "bg-ink-soft",
  };
};

const ScoreVisual = ({ score, size = "md" }: ScoreVisualProps) => {
  const s = score ?? 0;
  const t = tone(s);
  const grade = scoreToGrade(score);
  const dims =
    size === "lg" ? { box: "w-20 h-20", num: "text-[28px]", grade: "text-[12px]", bar: "h-1.5 w-16 mt-1.5" } :
    size === "md" ? { box: "w-14 h-14", num: "text-[18px]", grade: "text-[10px]", bar: "h-1 w-12 mt-1" } :
                    { box: "w-12 h-12", num: "text-[15px]", grade: "text-[10px]", bar: "h-[3px] w-10 mt-1" };

  const pct = Math.max(0, Math.min(100, s));

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border-2 ${t.ring} ${t.bg} ${dims.box}`}>
      <span className={`font-mono font-semibold leading-none ${t.text} ${dims.num}`}>{score ?? "—"}</span>
      <span className={`font-display leading-none mt-0.5 ${t.text} ${dims.grade}`}>{grade}</span>
      <div className={`rounded-full bg-hairline/60 overflow-hidden ${dims.bar}`}>
        <div className={`h-full ${t.bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default ScoreVisual;
