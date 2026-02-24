import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginGateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginGateModal = ({ open, onClose, onSuccess }: LoginGateModalProps) => {
  const [mode, setMode] = useState<"initial" | "email">("initial");
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setLoading(true);
    setError("");
    try {
      await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async () => {
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onClose();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || "Authentication failed.";
      if (msg.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid credentials. If you signed up with Google, use 'Continue with Google' instead.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md mx-4 rounded-2xl border border-border bg-card p-8"
        >
          <div className="text-center mb-8">
            <div className="h-10 w-10 rounded-xl bg-gradient-cta flex items-center justify-center mx-auto mb-4">
              <span className="font-mono text-sm font-bold text-primary-foreground">R</span>
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Your analysis is ready.
            </h2>
            <p className="text-sm text-muted-foreground">
              Create a free account to unlock your full report.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {mode === "initial" ? (
              <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <Button variant="outline" className="w-full h-12 text-sm font-medium border-border hover:bg-secondary" onClick={handleGoogle} disabled={loading}>
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </Button>
                <Button variant="outline" className="w-full h-12 text-sm font-medium border-border hover:bg-secondary" onClick={() => setMode("email")}>
                  <Mail className="mr-2 h-4 w-4" /> Continue with Email
                </Button>
              </motion.div>
            ) : (
              <motion.div key="email" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 bg-secondary border-border" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-12 bg-secondary border-border" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button variant="hero" className="w-full h-12" onClick={handleEmail} disabled={loading || !email || !password}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
                <div className="flex items-center justify-between">
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMode("initial")}>Back</button>
                  <button className="text-xs text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="text-xs text-destructive mt-3 text-center">{error}</p>}
          <p className="text-[11px] text-muted-foreground text-center mt-6">No credit card required. Free forever plan available.</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoginGateModal;
