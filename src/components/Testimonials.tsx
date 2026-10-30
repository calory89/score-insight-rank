import { motion } from "framer-motion";
import { Quote, MapPin, Star } from "lucide-react";

const testimonials = [
  {
    quote: "RealHunt saved me from a €180K mistake in Algarve. The AI flagged a pricing bubble I completely missed. Three months later, prices in that area dropped 22%.",
    name: "Marcus L.",
    location: "Berlin, Germany",
    role: "Serial Property Investor",
    stars: 5,
  },
  {
    quote: "I found my dream villa in Bali through the Discover feed. Another Hunter had analyzed it and scored it 87/100. I flew out, visited, and closed the deal in 3 weeks.",
    name: "Sarah K.",
    location: "London, UK",
    role: "First-time Overseas Buyer",
    stars: 5,
  },
  {
    quote: "The community is gold. I asked about Tulum and got 14 detailed responses within 24 hours from people who actually own there. No real estate agent gives you that.",
    name: "Carlos M.",
    location: "Miami, USA",
    role: "Portfolio Manager",
    stars: 5,
  },
];

const Testimonials = () => (
  <section className="py-20 md:py-28">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <span className="text-xs font-medium text-primary uppercase tracking-wider">Success Stories</span>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-3">
          Hunters Who Made the Right Call
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
        {testimonials.map((t, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="rounded-2xl border border-border bg-card p-6 flex flex-col card-hover group"
          >
            {/* Star rating */}
            <div className="flex items-center gap-0.5 mb-3">
              {[...Array(t.stars)].map((_, j) => (
                <Star key={j} className="h-3.5 w-3.5 fill-primary text-primary transition-transform group-hover:scale-110" style={{ transitionDelay: `${j * 30}ms` }} />
              ))}
            </div>
            <Quote className="h-5 w-5 text-primary/20 mb-3 transition-colors group-hover:text-primary/40" />
            <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">
              "{t.quote}"
            </p>
            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <div className="h-9 w-9 rounded-full bg-gradient-cta flex items-center justify-center text-sm font-bold text-primary-foreground shadow-sm">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{t.name}</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5" /> {t.location} · {t.role}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
