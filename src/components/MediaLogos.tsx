import { motion } from "framer-motion";

const logos = [
  "TechCrunch", "Bloomberg", "Forbes", "Business Insider", "The Guardian"
];

const MediaLogos = () => (
  <section className="py-8 border-b border-border">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="flex flex-col items-center"
      >
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Trusted by investors worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {logos.map((name) => (
            <span
              key={name}
              className="text-sm font-semibold text-muted-foreground/30 select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default MediaLogos;
