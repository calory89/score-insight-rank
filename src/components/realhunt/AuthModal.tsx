import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { X, Mail, Check, Loader2 } from "lucide-react";
import { track } from "@/lib/rh";

type Props = { open: boolean; onClose: () => void; title?: string; subtitle?: string; redirect?: string; find?: string };

const AuthModal = ({ open, onClose, title = "Sign in and we email you everything about this home, free", subtitle = "Exact location, map, full description, the original listing and the real cost of buying as a foreigner.", redirect, find }: Props) => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!open) return null;
  const to = redirect || location.pathname + location.search;

  const google = async () => {
    setBusy(true); track("auth_google", { find });
    try { sessionStorage.setItem("rh_redirect", to); } catch {}
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${location.origin}/auth/callback` });
    if (r.error) { setBusy(false); setErr(r.error.message); }
  };
  const magic = async (e: React.FormEvent) => {
    e.preventDefault(); if (!/.+@.+\..+/.test(email)) return; setBusy(true); setErr(""); track("auth_magic", { find });
    try { sessionStorage.setItem("rh_redirect", to); } catch {}
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${location.origin}/auth/callback` } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full md:max-w-[440px] bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><p className="font-display text-[24px] leading-tight tracking-tight">{title}</p><button onClick={onClose} aria-label="Close" className="p-1 -mr-1 text-ink-muted hover:text-ink"><X size={20} /></button></div>
        <p className="text-[14px] text-ink-muted mt-2">{subtitle}</p>
        {sent ? (
          <p className="mt-6 inline-flex items-center gap-2 text-[15px]"><Check size={18} /> Check {email}. Tap the link and you are in.</p>
        ) : (
          <>
            <button onClick={google} disabled={busy} className="mt-6 w-full h-12 rounded-full bg-ink text-paper font-medium inline-flex items-center justify-center gap-3 disabled:opacity-60">
              {busy ? <Loader2 size={18} className="animate-spin" /> : <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.65 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.7 3.97 14.55 3 12 3 6.98 3 3 6.98 3 12s3.98 9 9 9c5.2 0 8.65-3.65 8.65-8.78 0-.6-.07-1.05-.15-1.42z" /></svg>}
              Continue with Google
            </button>
            <div className="flex items-center gap-3 my-4"><span className="flex-1 h-px bg-hairline" /><span className="text-[11px] uppercase tracking-wider text-ink-muted">or a link by email</span><span className="flex-1 h-px bg-hairline" /></div>
            <form onSubmit={magic} className="flex gap-2">
              <label className="relative flex-1"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" /><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full h-12 border border-hairline rounded-full pl-11 pr-4 text-[15px] bg-paper outline-none focus:border-ink" /></label>
              <button type="submit" disabled={busy} className="h-12 px-5 rounded-full border border-ink text-[14px] font-medium disabled:opacity-60">Send link</button>
            </form>
            {err && <p className="text-[13px] text-red-600 mt-2">{err}</p>}
            <p className="text-[12px] text-ink-muted mt-4">No password. No spam. We only email you homes you asked for.</p>
          </>
        )}
      </div>
    </div>
  );
};
export default AuthModal;
