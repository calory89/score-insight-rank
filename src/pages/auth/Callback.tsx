import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Callback = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      navigate(data.session ? "/app" : "/auth/sign-in", { replace: true });
    }, 400);
    return () => clearTimeout(t);
  }, [navigate]);
  return (
    <div className="min-h-screen bg-rh-bg flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-rh-accent" />
      <p className="text-sm text-rh-ink-muted">Signing you in…</p>
    </div>
  );
};

export default Callback;
