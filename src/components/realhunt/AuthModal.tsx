// Email only. No Google, no other identity provider — RealHunt does not depend on anyone else to let
// its own users in.
//
// First time: you type your email, we send a confirmation link, and once you click it you choose a
// password (that last step lives in auth/Callback.tsx). After that it is email + password, forever.
import { useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { X, Mail, Check, Loader2, Lock, ArrowRight } from "lucide-react";
import { track } from "@/lib/rh";

type Props = { open: boolean; onClose: () => void; title?: string; subtitle?: string; redirect?: string; find?: string };

const AuthModal = ({ open, onClose, title = "Sign in and we email you everything about this home, free", subtitle = "Exact location, map, full description, the original listing and the real cost of buying as a foreigner.", redirect, find }: Props) => {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (!open) return null;

  const to = redirect || location.pathname + location.search;
  const remember = () => { try { sessionStorage.setItem("rh_redirect", to); localStorage.setItem("rh_redirect", to); } catch {} };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(""); track("auth_password", { find });
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) setErr("That email and password do not match. If this is your first time here, use the option below.");
    else onClose();
  };

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/.+@.+\..+/.test(email)) return;
    setBusy(true); setErr(""); track("auth_magic", { find });
    remember();
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: true } });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  };

  const resend = async () => {
    setBusy(true); setErr(""); track("auth_resend", { find });
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { emailRedirectTo: `${location.origin}/auth/callback`, shouldCreateUser: true } });
    setBusy(false);
    if (error) setErr(error.message); else setResent(true);
  };

  const field = "w-full h-12 border border-hairline rounded-full pl-11 pr-4 text-[15px] bg-paper outline-none focus:border-ink";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full md:max-w-[440px] bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <p className="font-display text-[24px] leading-tight tracking-tight">{title}</p>
          <button onClick={onClose} aria-label="Close" className="p-1 -mr-1 text-ink-muted hover:text-ink"><X size={20} /></button>
        </div>
        <p className="text-[14px] text-ink-muted mt-2">{subtitle}</p>

        {sent ? (
          // Roughly half the people who reach this screen never confirm, and the single biggest
          // reason is that the message is sitting in spam. Say so, and give them a way out of the
          // dead end without starting over.
          <div className="mt-6 flex flex-col gap-2">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={20} strokeWidth={3} /></span>
            <p className="font-display text-[20px] tracking-tight">Check {email}</p>
            <p className="text-[14px] text-ink-muted">Click the link to confirm your email. Then you pick a password and you are in. The link is good for one hour.</p>
            <div className="mt-2 rounded-2xl bg-paper border border-hairline p-3.5">
              <p className="text-[13.5px]"><b>Not there?</b> Look in spam or promotions — it often lands there. The sender is RealHunt.</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-3">
                <button onClick={resend} disabled={busy || resent} className="text-[13.5px] underline disabled:no-underline disabled:text-ink-muted inline-flex items-center gap-1.5">
                  {busy && <Loader2 size={13} className="animate-spin" />}{resent ? "Sent again" : "Send it again"}
                </button>
                <button onClick={() => { setSent(false); setResent(false); setErr(""); }} className="text-[13.5px] underline">Use a different email</button>
              </div>
              {err && <p className="text-[12.5px] text-red-600 mt-2">{err}</p>}
            </div>
          </div>
        ) : mode === "in" ? (
          <>
            <form onSubmit={signIn} className="mt-6 flex flex-col gap-3">
              <label className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={field} /></label>
              <label className="relative"><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className={field} /></label>
              <button type="submit" disabled={busy} className="rh-btn-primary !h-12 !rounded-full w-full inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 size={16} className="animate-spin" />} Sign in
              </button>
            </form>
            {err && <p className="text-[13px] text-red-600 mt-2">{err}</p>}
            <div className="mt-5 pt-4 border-t border-hairline">
              <button onClick={() => { setMode("up"); setErr(""); }} className="w-full text-left inline-flex items-center justify-between gap-2 group">
                <span><span className="font-medium text-[14.5px]">First time here?</span><span className="block text-[13px] text-ink-muted">Create your account with just an email.</span></span>
                <ArrowRight size={16} className="shrink-0 text-ink-muted group-hover:text-ink transition-colors" />
              </button>
            </div>
            <p className="text-[12px] text-ink-muted mt-4"><a href="/auth/reset-password" className="underline">Forgot your password?</a></p>
          </>
        ) : (
          <>
            <form onSubmit={join} className="mt-6 flex flex-col gap-3">
              <label className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                <input required autoFocus type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={field} /></label>
              <button type="submit" disabled={busy} className="rh-btn-primary !h-12 !rounded-full w-full inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 size={16} className="animate-spin" />} Send me the confirmation link
              </button>
            </form>
            {err && <p className="text-[13px] text-red-600 mt-2">{err}</p>}
            <ol className="mt-4 flex flex-col gap-1.5 text-[13px] text-ink-muted">
              <li>1. We email you a link.</li>
              <li>2. You click it to confirm the address is yours.</li>
              <li>3. You choose a password. Done.</li>
            </ol>
            <div className="mt-5 pt-4 border-t border-hairline">
              <button onClick={() => { setMode("in"); setErr(""); }} className="text-[13.5px] underline">I already have a password</button>
            </div>
          </>
        )}
        <p className="text-[12px] text-ink-muted mt-4">No spam. We only email you homes you asked for.</p>
      </div>
    </div>,
    document.body
  );
};
export default AuthModal;
