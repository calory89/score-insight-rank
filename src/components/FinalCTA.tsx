import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

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
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
            Stop guessing.
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Know if it's a good deal.
          </p>
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
