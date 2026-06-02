import { motion } from "framer-motion";
import { scoreToGrade, gradeColor, oneLineVerdict } from "@/lib/grade";
import type { Tables } from "@/integrations/supabase/types";

type AnalysisData = Tables<"analyses">;

interface Props {
  data: AnalysisData;
  totalScored?: number;
}

const VerdictBanner = ({ data, totalScored = 12400 }: Props) => {
  const score = data.global_score ?? 0;
  const grade = scoreToGrade(score);
  const verdict = oneLineVerdict(data);
  const pct = data.percentile ?? 0;

  return (
    <div className="rounded-2xl border border-hairline bg-surface overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-0 items-stretch">
        {/* Score block */}
        <div className="p-6 md:p-8 md:border-r border-hairline flex items-center gap-6 bg-[#FBF8F1]">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-[64px] md:text-[88px] leading-none text-ink tabular-nums"
            >
              {score}
            </motion.div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-soft mt-1">RH Global Score</div>
          </div>
          <div className="hairline-l pl-6 text-center">
            <div className={`font-display text-[44px] md:text-[64px] leading-none ${gradeColor(score)}`}>
              {grade}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-ink-soft mt-1">Grade</div>
          </div>
        </div>

        {/* Verdict block */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="text-[10px] uppercase tracking-[0.2em] text-accent-gold mb-2">One-line verdict</div>
          <p className="font-display text-[20px] md:text-[26px] text-ink leading-tight">{verdict}</p>
          {pct > 0 && (
            <p className="text-[13px] text-ink-muted mt-4">
              Better than <span className="text-ink font-semibold tabular-nums">{pct}%</span> of the{" "}
              <span className="tabular-nums">{totalScored.toLocaleString()}</span> listings RealHunt has scored.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerdictBanner;
