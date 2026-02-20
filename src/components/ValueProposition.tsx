import { motion } from "framer-motion";

const ValueProposition = () => {
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
            One bad investment can cost you <span className="text-foreground font-semibold">€50,000</span>.
          </p>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
            RealHunt is <span className="text-primary font-semibold">free</span>.
          </p>
          <div className="rounded-xl border border-border bg-card/50 p-6 md:p-8">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "Every property looks good in photos. Very few are good investments. We show the difference."
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default ValueProposition;
