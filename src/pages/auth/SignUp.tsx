import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";

const SignUp = () => {
  useDocumentMeta({ title: "Create account — RealHunt", description: "Free agent workspace. 5 forensic analyses per month, no card required." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Weak password", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Check your inbox", description: "Confirm your email to activate sending reports to clients." });
    navigate("/app");
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/auth/callback`,
    });
    if (result.error) {
      setLoading(false);
      toast({ title: "Google sign in failed", description: result.error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-rh-bg text-rh-ink flex flex-col">
      <RHNav />
      <main className="flex-1 grid lg:grid-cols-2 max-w-6xl mx-auto w-full px-6 py-16 gap-16 items-start">
        <div className="hidden lg:block pt-8">
          <p className="text-[11px] tracking-[0.25em] uppercase text-rh-accent font-semibold mb-4">For working agents</p>
          <h2 className="font-display text-4xl leading-tight mb-6">A second opinion before you waste a viewing.</h2>
          <ul className="space-y-3 text-rh-ink-muted">
            {[
              "5 forensic analyses every month, free forever",
              "Branded PDF report with your logo and phone",
              "WhatsApp share link in one tap",
              "Public methodology — no black box",
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <Check className="h-5 w-5 text-rh-good flex-shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="w-full max-w-md mx-auto lg:mx-0">
          <div className="mb-10">
            <h1 className="font-display text-4xl mb-2">Create account</h1>
            <p className="text-rh-ink-muted text-sm">No credit card. Cancel anytime.</p>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full h-12 rounded-xl bg-rh-accent text-white font-medium hover:bg-rh-accent/90 transition flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.65 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.7 3.97 14.55 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.65-3.65 8.65-8.78 0-.6-.07-1.05-.15-1.42z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-rh-hairline" />
            <span className="text-xs text-rh-ink-soft uppercase tracking-wider">or email</span>
            <div className="flex-1 h-px bg-rh-hairline" />
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-rh-ink-muted mb-1.5">Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-xl border border-rh-hairline bg-rh-surface focus:border-rh-accent focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-rh-ink-muted mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full h-12 px-4 rounded-xl border border-rh-hairline bg-rh-surface focus:border-rh-accent focus:outline-none transition"
              />
              <p className="text-xs text-rh-ink-soft mt-1.5">8+ characters. We check against known breaches.</p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-rh-ink text-white font-medium hover:bg-rh-ink/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Create free account
            </button>
            <p className="text-xs text-rh-ink-soft text-center">
              By continuing you accept our{" "}
              <Link to="/legal/terms" className="underline hover:text-rh-ink">Terms</Link> and{" "}
              <Link to="/legal/privacy" className="underline hover:text-rh-ink">Privacy</Link>.
            </p>
          </form>

          <p className="text-center text-sm text-rh-ink-muted mt-8">
            Already have an account?{" "}
            <Link to="/auth/sign-in" className="text-rh-accent font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

export default SignUp;
