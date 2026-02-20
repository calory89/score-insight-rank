import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-cta flex items-center justify-center">
            <span className="font-mono text-sm font-bold text-primary-foreground">R</span>
          </div>
          <span className="text-lg font-semibold text-foreground">RealHunt</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <a href="#rankings" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Rankings</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          <a href="#trust" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Methodology</a>
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm">Log in</Button>
          <Button variant="hero" size="sm">Get Started</Button>
        </div>

        <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3"
        >
          <a href="#how-it-works" className="block text-sm text-muted-foreground">How It Works</a>
          <a href="#rankings" className="block text-sm text-muted-foreground">Rankings</a>
          <a href="#pricing" className="block text-sm text-muted-foreground">Pricing</a>
          <a href="#trust" className="block text-sm text-muted-foreground">Methodology</a>
          <Button variant="hero" size="sm" className="w-full mt-2">Get Started</Button>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
