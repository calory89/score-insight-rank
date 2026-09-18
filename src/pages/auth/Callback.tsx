// Where the confirmation link lands. Two jobs: finish the sign-in, and — the first time someone
// confirms their email — let them choose a password so they never need a link again.
//
// Whether a password exists is kept in the auth user's own metadata (has_password), set at the same
// time as the password itself. No extra table, no extra column, and it travels with the session.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, Check } from "lucide-react";

const readRedirect = () => {
  let to = "";
  try { to = sessionStorage.getItem("rh_redirect") || localStorage.getItem("rh_redirect") || ""; sessionStorage.removeItem("rh_redirect"); localStorage.removeItem("rh_redirect"); } catch {}
  return to && to.startsWith("/") ? to : "/";
};

const Callback = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"checking" | "password">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let done = false;
    const handle = (session: any) => {
      if (done) return;
      done = true;
      if (!session) { navigate("/auth/sign-in", { replace: true }); return; }
      if (session.user?.user_metadata?.has_password) { navigate(readRedirect(), { replace: true }); return; }
      setPhase("password");
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => { if (s) handle(s); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) handle(data.session); });
    const t = setTimeout(async () => { const { data } = await supabase.auth.getSession(); handle(data.session); }, 6000);
    return () => { clearTimeout(t); subscription.unsubscribe(); };
  }, [navigate]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { setErr("Use at least 8 characters."); return; }
    if (pw !== pw2) { setErr("The two passwords do not match."); return; }
    setBusy(true); setErr("");
    const { error } = await supabase.auth.updateUser({ password: pw, data: { has_password: true } });
    setBusy(false);
    if (error) setErr(error.message); else navigate(readRedirect(), { replace: true });
  };

  if (phase === "password") {
    const field = "w-full h-12 border border-hairline rounded-full pl-11 pr-4 text-[15px] bg-paper outline-none focus:border-ink";
    return (
      <div className="min-h-screen bg-paper text-ink flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={20} strokeWidth={3} /></span>
          <h1 className="font-display text-[28px] leading-tight tracking-tight mt-4">Email confirmed. Now choose a password.</h1>
          <p className="text-[14px] text-ink-muted mt-2">One last step. From now on you sign in with your email and this password — no links to hunt for in your inbox.</p>
          <form onSubmit={save} className="mt-6 flex flex-col gap-3">
            <label className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input required autoFocus type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Your new password" className={field} /></label>
            <label className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
              <input required type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Type it again" className={field} /></label>
            <button type="submit" disabled={busy} className="rh-btn-primary !h-12 !rounded-full w-full inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {busy && <Loader2 size={16} className="animate-spin" />} Save and continue
            </button>
          </form>
          {err && <p className="text-[13px] text-red-600 mt-2">{err}</p>}
          <p className="text-[12px] text-ink-muted mt-4">At least 8 characters.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-6 w-6 animate-spin text-ink" />
      <p className="text-sm text-ink-muted">Signing you in, taking you back to the home you were looking at…</p>
    </div>
  );
};

export default Callback;
