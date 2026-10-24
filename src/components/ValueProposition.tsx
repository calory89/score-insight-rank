import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const ValueProposition = () => {
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
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Don't Buy Blind.
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-4">
            One mistake can cost you <span className="text-foreground font-semibold">€50,000</span>.
          </p>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
            RealHunt helps you <span className="text-foreground font-semibold">avoid it</span>.
          </p>

          {/* Score circle visual */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray="264"
                  strokeDashoffset="66"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground font-mono leading-none">75</span>
                <span className="text-[8px] font-medium text-muted-foreground uppercase tracking-widest mt-0.5">Score</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card/50 p-6 md:p-8 mb-8">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "Every property looks good in photos. Very few are good investments. We show the difference."
            </p>
          </div>

          <Button variant="hero" size="lg" onClick={scrollToHero}>
            Analyze Now: Free <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ValueProposition;
