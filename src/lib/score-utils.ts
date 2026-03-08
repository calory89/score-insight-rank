// Shared score/verdict utility functions used across the app

export const scoreColor = (v: number) => {
  if (v >= 80) return "text-score-excellent";
  if (v >= 65) return "text-score-good";
  if (v >= 50) return "text-score-average";
  return "text-score-poor";
};

export const scoreBg = (v: number) => {
  if (v >= 80) return "bg-score-excellent";
  if (v >= 65) return "bg-score-good";
  if (v >= 50) return "bg-score-average";
  return "bg-score-poor";
};

export const scoreBgLight = (v: number) => {
  if (v >= 80) return "bg-score-excellent/10 text-score-excellent";
  if (v >= 65) return "bg-score-good/10 text-score-good";
  if (v >= 50) return "bg-score-average/10 text-score-average";
  return "bg-score-poor/10 text-score-poor";
};

export const scoreBorder = (v: number) => {
  if (v >= 80) return "border-score-excellent/30";
  if (v >= 65) return "border-score-good/30";
  if (v >= 50) return "border-score-average/30";
  return "border-score-poor/30";
};

export const verdictColor = (v: string) => {
  if (v === "Exceptional") return "text-score-excellent border-score-excellent/20 bg-score-excellent/10";
  if (v === "Strong") return "text-score-good border-score-good/20 bg-score-good/10";
  if (v === "Moderate") return "text-score-average border-score-average/20 bg-score-average/10";
  return "text-score-poor border-score-poor/20 bg-score-poor/10";
};

export const verdictColorSimple = (v: string) => {
  if (v === "Exceptional") return "text-score-excellent bg-score-excellent/10";
  if (v === "Strong") return "text-score-good bg-score-good/10";
  if (v === "Moderate") return "text-score-average bg-score-average/10";
  return "text-score-poor bg-score-poor/10";
};

export const riskLabel = (v: number) => {
  if (v >= 80) return { label: "Very Safe", color: "text-score-excellent" };
  if (v >= 60) return { label: "Safe", color: "text-score-average" };
  return { label: "Caution", color: "text-score-poor" };
};

export const riskLabelSimple = (v: number) => {
  if (v >= 80) return "Very Safe";
  if (v >= 60) return "Safe";
  return "Caution";
};

export const classificationColor = (c: string) => {
  if (c === "Emerging") return "text-primary border-primary/20 bg-primary/10";
  if (c === "Stable") return "text-score-good border-score-good/20 bg-score-good/10";
  if (c === "Overpriced") return "text-score-average border-score-average/20 bg-score-average/10";
  return "text-accent-foreground border-accent/30 bg-accent/20";
};

export const confidenceColor = (c: string) => {
  if (c === "high") return "text-score-excellent border-score-excellent/20 bg-score-excellent/10";
  if (c === "medium") return "text-score-average border-score-average/20 bg-score-average/10";
  return "text-score-poor border-score-poor/20 bg-score-poor/10";
};

export const scoreBgForRanking = (v: number) => {
  if (v >= 80) return "bg-score-excellent/10";
  if (v >= 65) return "bg-score-good/10";
  if (v >= 50) return "bg-score-average/10";
  return "bg-score-poor/10";
};
