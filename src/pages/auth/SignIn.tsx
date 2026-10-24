import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import RHFooter from "@/components/realhunt/RHFooter";
import useDocumentMeta from "@/hooks/useDocumentMeta";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const SignIn = () => {
  useDocumentMeta({ title: "Sign in · RealHunt", description: "Sign in to your RealHunt agent workspace." });
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || (location.state as any)?.from || (() => { try { return sessionStorage.getItem("rh_redirect") || localStorage.getItem("rh_redirect") || "/"; } catch { return "/"; } })();

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


  return (
    <div className="min-h-screen bg-rh-bg text-rh-ink flex flex-col">
      <RHNav />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="font-display text-4xl mb-2">Sign in</h1>
            <p className="text-rh-ink-muted text-sm">Continue qualifying listings in seconds.</p>
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
