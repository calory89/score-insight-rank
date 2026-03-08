import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Building2, Users, Landmark, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const useCases = [
  { icon: Landmark, label: "For Banks" },
  { icon: Users, label: "For Agents" },
  { icon: Building2, label: "For Funds" },
  { icon: Code2, label: "For Developers" },
];

const APISection = () => {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    await supabase.from("newsletter_subscribers").insert({ email: email.trim() });
    setSubmitted(true);
    setTimeout(() => {
      setShowForm(false);
      setSubmitted(false);
      setEmail("");
    }, 3000);
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
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            RealHunt API
          </h2>
          <p className="text-muted-foreground mb-10">
            Real estate intelligence infrastructure for banks, agents, and investment platforms.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap mb-8">
            {useCases.map((uc) => (
              <div
                key={uc.label}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2"
              >
                <uc.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uc.label}</span>
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {!showForm ? (
              <motion.div key="btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Button variant="hero-outline" onClick={() => setShowForm(true)}>
                  Join the Waitlist <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </motion.div>
            ) : submitted ? (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center gap-2 text-primary">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-sm font-medium">You're on the list!</span>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 max-w-md mx-auto">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="pl-10 h-12 bg-secondary border-border"
                  />
                </div>
                <Button variant="hero" className="h-12 px-6" onClick={handleSubmit} disabled={!email.trim()}>
                  Join
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default APISection;
