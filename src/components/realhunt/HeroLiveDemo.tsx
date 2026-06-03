import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ShareScoreCard from "@/components/ShareScoreCard";


type Status = "good" | "warn" | "bad";

const DIMS: { l: string; v: number; status: Status }[] = [
  { l: "Developer", v: 5.8, status: "warn" },
  { l: "Delivery", v: 8.1, status: "good" },
  { l: "Legal", v: 8.7, status: "good" },
  { l: "Location", v: 8.4, status: "good" },
  { l: "Economics", v: 6.2, status: "warn" },
];

const FACTORS = [
  { sign: "+" as const, text: "Price 18% below comparable beachfront €/m²" },
  { sign: "+" as const, text: "Legal: clean title, planning permits on file" },
  { sign: "−" as const, text: "Liquidity: ~9 months on market here" },
  { sign: "−" as const, text: "Developer: 2 delayed handovers in last 24 months" },
];

const TARGET = 7.4;

const statusColor = (s: Status) =>
  s === "good" ? "#1E6B4F" : s === "warn" ? "#B7791F" : "#B23A3A";

export default function HeroLiveDemo({ runKey }: { runKey: number }) {
  const [score, setScore] = useState(0);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    setScore(0);
    setRevealed(0);
    const start = performance.now();
    const dur = 1400;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(+(eased * TARGET).toFixed(1));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const timers: number[] = [];
    FACTORS.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 900 + i * 350),
      );
    });

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, [runKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      className="rh-card !p-7 mt-8"
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Sample · Idealista · Marbella
        </div>
        <span className="text-[11px] font-medium text-[#1E6B4F] inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#1E6B4F] animate-pulse" />
          Scoring live
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        <div className="md:col-span-4">
          <div
            className="font-display tabular leading-none"
            style={{ color: "#B8893B", fontSize: 92 }}
          >
            {score.toFixed(1)}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-ink-soft mt-2">
            RH Score / 10
          </div>
        </div>
        <div className="md:col-span-8 space-y-2.5">
          {DIMS.map((d, i) => {
            const pct = score >= TARGET ? (d.v / 10) * 100 : Math.min((score / TARGET) * (d.v / 10) * 100, (d.v / 10) * 100);
            return (
              <div key={d.l} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 text-[11px] uppercase tracking-wider text-ink-soft">
                  {d.l}
                </div>
                <div className="col-span-7 h-3 rounded-full bg-[#E8E1D0] overflow-hidden ring-1 ring-black/[0.04]">
                  <motion.div
                    className="h-full rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    initial={{ width: "0%" }}
                    animate={{ width: `${(d.v / 10) * 100}%` }}
                    transition={{
                      duration: 0.9,
                      delay: 0.15 + i * 0.08,
                      ease: [0.25, 0.1, 0.25, 1],
                    }}
                    style={{ backgroundColor: statusColor(d.status) }}
                  />
                </div>
                <div className="col-span-2 text-right font-display text-[15px] tabular text-ink">
                  {d.v.toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 pt-5 hairline-t space-y-2">
        <AnimatePresence>
          {FACTORS.slice(0, revealed).map((f, i) => (
            <motion.div
              key={`${runKey}-${i}`}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 text-[14px]"
            >
              <span
                className="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-white text-[12px] font-bold shrink-0"
                style={{
                  backgroundColor: f.sign === "+" ? "#1E6B4F" : "#B23A3A",
                }}
              >
                {f.sign}
              </span>
              <span className="text-ink-muted leading-snug">{f.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {score >= TARGET && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-6 pt-5 hairline-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <span className="text-[13px] text-ink-soft">
            Like what you see? Share this score card.
          </span>
          <ShareScoreCard
            scoreOutOf10={TARGET}
            grade="Strong"
            title="Villa with sea view — Sierra Blanca"
            location="Marbella, ES · Idealista"
            dims={DIMS.map((d) => ({ label: d.l, value: d.v, status: d.status }))}
            verdict="Decent yield, weak developer track record — negotiate 8% off list."
            variant="secondary"
          />
        </motion.div>
      )}
    </motion.div>
  );
}

