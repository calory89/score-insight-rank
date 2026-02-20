import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Menu, X, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import LoginGateModal from "@/components/LoginGateModal";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <>
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
            {user ? (
              <>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{user.email}</span>
                <Button variant="ghost" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setShowLogin(true)}>Log in</Button>
                <Button variant="hero" size="sm" onClick={() => setShowLogin(true)}>Get Started</Button>
              </>
            )}
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
            {user ? (
              <Button variant="ghost" size="sm" className="w-full mt-2" onClick={signOut}>Sign Out</Button>
            ) : (
              <Button variant="hero" size="sm" className="w-full mt-2" onClick={() => { setShowLogin(true); setIsOpen(false); }}>Get Started</Button>
            )}
          </motion.div>
        )}
      </motion.nav>
      <LoginGateModal open={showLogin} onClose={() => setShowLogin(false)} />
    </>
  );
};

export default Navbar;
