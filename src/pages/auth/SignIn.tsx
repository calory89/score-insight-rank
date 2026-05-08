import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SignIn = () => {
  useDocumentMeta({ title: "Sign in — RealHunt", description: "Sign in to your RealHunt agent workspace." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const redirectTo = (location.state as any)?.from || "/app";

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, navigate, redirectTo]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate(redirectTo, { replace: true });
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
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl mb-2">Sign in</h1>
            <p className="text-rh-ink-muted text-sm">Continue qualifying listings in seconds.</p>
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

          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-rh-ink-muted mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-xl border border-rh-hairline bg-rh-surface focus:border-rh-accent focus:outline-none transition"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-rh-ink-muted">Password</label>
                <Link to="/auth/reset-password" className="text-xs text-rh-accent hover:underline">Forgot?</Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-xl border border-rh-hairline bg-rh-surface focus:border-rh-accent focus:outline-none transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-rh-ink text-white font-medium hover:bg-rh-ink/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign in
            </button>
          </form>

          <p className="text-center text-sm text-rh-ink-muted mt-8">
            New to RealHunt?{" "}
            <Link to="/auth/sign-up" className="text-rh-accent font-medium hover:underline">Create an account</Link>
          </p>
        </div>
      </main>
      <RHFooter />
    </div>
  );
};

export default SignIn;
