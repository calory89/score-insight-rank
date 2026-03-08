import { motion } from "framer-motion";

const logos = [
  { name: "TechCrunch", font: "font-bold italic" },
  { name: "Bloomberg", font: "font-black tracking-tight" },
  { name: "Forbes", font: "font-bold italic tracking-wide" },
  { name: "Business Insider", font: "font-extrabold" },
  { name: "The Guardian", font: "font-serif font-bold" },
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
          {logos.map((logo) => (
            <span
              key={logo.name}
              className={`text-base md:text-lg text-muted-foreground/40 select-none ${logo.font}`}
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
