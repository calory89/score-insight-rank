import { motion } from "framer-motion";
import { Building2, Briefcase, Globe, Landmark, TrendingUp } from "lucide-react";

const segments = [
  { label: "Real Estate Funds", icon: Landmark },
  { label: "Family Offices", icon: Briefcase },
  { label: "Digital Nomads", icon: Globe },
  { label: "Property Developers", icon: Building2 },
  { label: "Private Investors", icon: TrendingUp },
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
          Trusted by investors from
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {segments.map((seg) => (
            <div
              key={seg.label}
              className="flex items-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors select-none"
            >
              <seg.icon className="h-4 w-4" />
              <span className="text-xs font-semibold tracking-wide">{seg.label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  </section>
);

export default MediaLogos;
