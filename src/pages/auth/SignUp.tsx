import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { fbLead } from "@/lib/fbpixel";
import { Loader2, Check } from "lucide-react";

const SignUp = () => {
  useDocumentMeta({ title: "Create account — RealHunt", description: "Free agent workspace. 5 forensic analyses per month, no card required." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

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
    fbLead({ content_name: "sign_up", method: "email" });
    toast({ title: "Check your inbox", description: "Confirm your email to activate sending reports to clients." });
    navigate(redirectTo);
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
