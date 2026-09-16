import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const readRedirect = () => {
  let to = "";
  try { to = sessionStorage.getItem("rh_redirect") || localStorage.getItem("rh_redirect") || ""; sessionStorage.removeItem("rh_redirect"); localStorage.removeItem("rh_redirect"); } catch {}
  return to && to.startsWith("/") ? to : "/";
};

const Callback = () => {
  const navigate = useNavigate();
  useEffect(() => {
    let done = false;
    const go = (ok: boolean) => { if (done) return; done = true; navigate(ok ? readRedirect() : "/auth/sign-in", { replace: true }); };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { if (s) go(true); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(true); });
    const t = setTimeout(async () => { const { data } = await supabase.auth.getSession(); go(!!data.session); }, 6000);
    return () => { clearTimeout(t); subscription.unsubscribe(); };
  }, [navigate]);
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-ink" />
      <p className="text-sm text-ink-muted">Signing you in, taking you back to the home you were looking at…</p>
    </div>
  );
};

export default Callback;
