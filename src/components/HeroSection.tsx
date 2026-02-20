import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Search } from "lucide-react";

const HeroSection = () => {
  const [url, setUrl] = useState("");

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="container relative mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-xs font-medium text-primary">AI-Powered Real Estate Intelligence</span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-[1.1] mb-6">
            Paste Any Listing.{" "}
            <span className="text-gradient-primary">Get the Score.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Know the Risk Before You Invest. Avoid expensive mistakes. Save thousands of euros and hours.
          </p>

          {/* URL Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="max-w-2xl mx-auto mb-4"
          >
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-cta rounded-2xl opacity-20 group-focus-within:opacity-40 blur transition-opacity duration-300" />
              <div className="relative flex items-center bg-card rounded-xl border border-border p-2">
                <Search className="ml-3 h-5 w-5 text-muted-foreground flex-shrink-0" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste a Zillow, Idealista, Rightmove, or Airbnb URL..."
                  className="flex-1 bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <Button variant="hero" size="lg" className="rounded-lg">
                  Analyze <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          <p className="text-xs text-muted-foreground mb-8">
            Free analysis · Transparent model · No paid rankings
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex items-center justify-center gap-4"
          >
            <Button variant="hero-outline" size="sm">
              See Example Report
            </Button>
          </motion.div>
        </motion.div>

        {/* Score Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="max-w-4xl mx-auto mt-20"
        >
          <ScorePreview />
        </motion.div>
      </div>
    </section>
  );
};

const ScorePreview = () => {
  const subscores = [
    { label: "ROI Potential", value: 82, color: "bg-score-excellent" },
    { label: "Market Stability", value: 74, color: "bg-score-good" },
    { label: "Demand Strength", value: 91, color: "bg-score-excellent" },
    { label: "Risk Level", value: 68, color: "bg-score-average" },
    { label: "Liquidity Outlook", value: 77, color: "bg-score-good" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Score Circle */}
        <div className="relative flex-shrink-0">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="264"
              strokeDashoffset="50"
              className="animate-score-fill"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground font-mono">81</span>
            <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Global Score</span>
          </div>
        </div>

        {/* Subscores */}
        <div className="flex-1 w-full space-y-3">
          {subscores.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{s.label}</span>
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${s.value}%` }}
                  transition={{ delay: 1, duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${s.color}`}
                />
              </div>
              <span className="text-xs font-mono text-foreground w-8 text-right">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-primary font-medium">AI Summary:</span> This property shows strong demand signals in a stabilizing market. ROI potential is above average for this region, though moderate risk exists due to recent regulatory changes. Liquidity is favorable with average days-on-market below the regional median.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;
