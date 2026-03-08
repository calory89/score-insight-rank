import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Quote, Sparkles } from "lucide-react";

const FinalCTA = () => {
  const [count, setCount] = useState(37);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.floor(Math.random() * 5) - 2;
        return Math.max(25, Math.min(60, prev + delta));
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-gradient-hero opacity-40 pointer-events-none" />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* Mini testimonial */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-5 mb-8 max-w-lg mx-auto card-hover"
          >
            <Quote className="h-4 w-4 text-primary/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">
              "RealHunt saved me from a €180K mistake in Algarve. The AI flagged a pricing bubble I completely missed."
            </p>
            <div className="flex items-center justify-center gap-0.5 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Marcus L. · Berlin, Germany</p>
          </motion.div>

          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Stop guessing.
          </h2>
          <p className="text-xl text-muted-foreground mb-6">
            Know if it's a good deal.
          </p>

          {/* Live counter */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-score-excellent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-score-excellent" />
            </span>
            <span className="text-xs text-muted-foreground">
              <AnimatePresence mode="wait">
                <motion.span
                  key={count}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block font-semibold text-foreground tabular-nums"
                >
                  {count}
                </motion.span>
              </AnimatePresence>
              {" "}properties being analyzed right now
            </span>
          </div>

          <Button variant="hero" size="lg" className="h-14 sm:h-16 px-10 sm:px-12 text-base group" onClick={scrollToHero}>
            <Sparkles className="h-4 w-4 mr-1 transition-transform group-hover:rotate-12" />
            Analyze Your First Property — Free
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">No credit card required.</p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
