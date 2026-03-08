import { motion } from "framer-motion";

const logos = [
  { name: "TechCrunch", style: "font-bold italic text-lg md:text-xl tracking-tight" },
  { name: "Bloomberg", style: "font-black text-lg md:text-xl tracking-[-0.03em] uppercase" },
  { name: "Forbes", style: "font-bold italic text-lg md:text-xl tracking-[0.08em] uppercase" },
  { name: "Business Insider", style: "font-extrabold text-base md:text-lg tracking-tight" },
  { name: "The Guardian", style: "font-serif font-bold text-lg md:text-xl tracking-wide" },
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
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-5">
          Trusted by investors worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {logos.map((logo) => (
            <span
              key={logo.name}
              className={`text-muted-foreground/30 select-none transition-opacity hover:text-muted-foreground/50 ${logo.style}`}
            >
              {logo.name}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default MediaLogos;
