import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

interface LoginGateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LoginGateModal = ({ open, onClose, onSuccess }: LoginGateModalProps) => {
  const [mode, setMode] = useState<"initial" | "email">("email");
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");


  const handleEmail = async () => {
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setSuccessMsg("Check your email to confirm your account.");
        setLoading(false);
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onClose();
      onSuccess?.();
    } catch (err: any) {
      const msg = err.message || "Authentication failed.";
      if (msg.toLowerCase().includes("invalid login credentials")) {
        setError("That email and password do not match. If you have never set a password, use 'Forgot password?' below.");
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
                {isSignUp && (
                  <p className="text-[10px] text-muted-foreground">Minimum 6 characters</p>
                )}
                <Button variant="hero" className="w-full h-12" onClick={handleEmail} disabled={loading || !email || !password}>
                  {isSignUp ? "Create Account" : "Sign In"}
                </Button>
              <div className="flex items-center justify-between">
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => setMode("initial")}>Back</button>
                  <div className="flex flex-col items-end gap-1">
                    <button className="text-xs text-primary hover:underline" onClick={() => setIsSignUp(!isSignUp)}>
                      {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
                    </button>
                    <button
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={async () => {
                        if (!email) { setError("Enter your email first."); return; }
                        setLoading(true); setError(""); setSuccessMsg("");
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        });
                        setLoading(false);
                        if (error) { setError(error.message); return; }
                        setSuccessMsg("Password reset link sent! Check your email.");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {successMsg && <p className="text-xs text-primary mt-3 text-center">{successMsg}</p>}
          {error && <p className="text-xs text-destructive mt-3 text-center">{error}</p>}
          <p className="text-[11px] text-muted-foreground text-center mt-6">No credit card required. Free forever plan available.</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoginGateModal;
