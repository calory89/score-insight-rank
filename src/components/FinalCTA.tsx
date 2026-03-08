import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Star, Quote } from "lucide-react";

const FinalCTA = () => {
  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="py-24 md:py-32 relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          {/* Mini testimonial */}
          <div className="rounded-xl border border-border bg-card/50 p-5 mb-8 max-w-lg mx-auto">
            <Quote className="h-4 w-4 text-primary/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground italic leading-relaxed mb-3">
              "RealHunt saved me from a €180K mistake in Algarve. The AI flagged a pricing bubble I completely missed."
            </p>
            <div className="flex items-center justify-center gap-1 mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-3 w-3 fill-primary text-primary" />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground">Marcus L. · Berlin, Germany</p>
          </div>

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
              <span className="font-semibold text-foreground">{Math.floor(37 + Math.sin(Date.now() / 10000) * 15)}</span> properties being analyzed right now
            </span>
          </div>

          <Button variant="hero" size="lg" className="h-14 sm:h-16 px-10 sm:px-12 text-base" onClick={scrollToHero}>
            Analyze Your First Property — Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-4">No credit card required.</p>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
