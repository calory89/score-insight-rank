import { useEffect, useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { scoreColor } from "@/lib/score-utils";

interface AnimatedScoreRingProps {
  score: number | null;
  size?: number;
}

const AnimatedScoreRing = ({ score, size = 160 }: AnimatedScoreRingProps) => {
  const [displayScore, setDisplayScore] = useState(0);
  const motionScore = useMotionValue(0);
  const r = (size * 0.42); // radius relative to viewBox 100
  const circumference = 2 * Math.PI * 42;

  useEffect(() => {
    if (score == null) return;
    const controls = animate(motionScore, score, {
      duration: 1.8,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplayScore(Math.round(v)),
    });
    return () => controls.stop();
  }, [score]);

  const getStrokeColor = (val: number) => {
    if (val >= 80) return "hsl(142, 71%, 45%)";
    if (val >= 65) return "hsl(160, 84%, 39%)";
    if (val >= 50) return "hsl(45, 93%, 47%)";
    return "hsl(0, 84%, 60%)";
  };

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {/* Subtle glow behind the ring */}
      <div
        className="absolute inset-2 rounded-full blur-xl opacity-20 transition-all duration-1000"
        style={{ backgroundColor: getStrokeColor(displayScore) }}
      />
      <svg className="-rotate-90 relative" viewBox="0 0 100 100" style={{ width: size, height: size }}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="4.5" opacity="0.5" />
        <motion.circle
          cx="50" cy="50" r="42"
          fill="none"
          stroke={getStrokeColor(displayScore)}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * displayScore) / 100}
          style={{ transition: "stroke 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-bold font-mono leading-none tabular-nums ${scoreColor(score)} ${size >= 140 ? "text-5xl" : "text-3xl"}`}>
          {displayScore}
        </span>
        <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest mt-1">Global Score</span>
      </div>
    </div>
  );
};

export default AnimatedScoreRing;
