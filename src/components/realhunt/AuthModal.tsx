import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { supabase } from "@/integrations/supabase/client";
import { X, Mail, Check, Loader2, Lock, ArrowRight } from "lucide-react";
import { track } from "@/lib/rh";
import { authError, confirmationUrl, rememberReturn, safeReturnPath } from "@/lib/auth-return";

type Props = { open: boolean; onClose: () => void; title?: string; subtitle?: string; redirect?: string; find?: string; initialMode?: "in" | "up" };
export default function AuthModal({ open, onClose, title = "Sign in to see the original listing", subtitle = "Free access to the full description and the original listing. We will bring you back to this home.", redirect, find, initialMode = "in" }: Props) {
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [remaining, setRemaining] = useState(0);
  const deadline = useRef(0);
  const busyRef = useRef(false);
  const to = safeReturnPath(redirect || location.pathname + location.search + location.hash);
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [open]);
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setErr(""); track("auth_password", { find });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) { setErr(authError(error, true)); return; }
      setPassword(""); onClose();
      if (to !== location.pathname + location.search + location.hash) navigate(to);
    } catch { setErr(authError(null)); } finally { busyRef.current = false; setBusy(false); }
  };
  const send = async (e?: React.FormEvent) => {
    e?.preventDefault(); if (busyRef.current || Date.now() < deadline.current) return;
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) { setErr("Enter a valid email address."); return; }
    busyRef.current = true; setBusy(true); setErr(""); rememberReturn(to);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: address, options: { emailRedirectTo: confirmationUrl(location.origin, to), shouldCreateUser: true } });
      if (error) { setErr(authError(error)); if (error.status === 429) { deadline.current = Date.now() + 60000; setRemaining(60); } return; }
      setSentTo(address); deadline.current = Date.now() + 60000; setRemaining(60); track("auth_magic", { find });
    } catch { setErr(authError(null)); } finally { busyRef.current = false; setBusy(false); }
  };
  const field = "w-full h-12 border border-hairline rounded-xl pl-11 pr-4 text-[16px] bg-paper outline-none focus:border-ink";
  return <Dialog.Root open={open} onOpenChange={value => { if (!value) onClose(); }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[75] bg-black/50 backdrop-blur-[2px]" />
    <Dialog.Content className="fixed z-[80] bottom-0 md:bottom-auto md:top-1/2 left-1/2 -translate-x-1/2 md:-translate-y-1/2 w-full md:max-w-[460px] bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl max-h-[92dvh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3"><Dialog.Title className="font-display text-[24px] leading-tight tracking-tight">{title}</Dialog.Title><Dialog.Close aria-label="Close sign in" className="h-11 w-11 shrink-0 grid place-items-center -mr-2 -mt-2 rounded-full hover:bg-paper"><X size={20} /></Dialog.Close></div>
      <Dialog.Description className="text-[14px] text-ink-muted mt-2">{subtitle}</Dialog.Description>
      {sentTo ? <div className="mt-6 space-y-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={20} /></span>
        <p role="status" className="font-medium text-lg break-words">Check {sentTo}</p>
        <p className="text-sm text-ink-muted">Open the latest confirmation link. We will return you to the home you were viewing after you finish signing in.</p>
        <div className="rounded-2xl bg-paper border border-hairline p-4"><p className="text-sm">Check spam and promotions too. The sender is RealHunt.</p><div className="mt-3 flex flex-wrap gap-3"><button onClick={() => send()} disabled={busy || remaining > 0} className="min-h-11 text-sm underline disabled:no-underline disabled:text-ink-muted">{busy ? "Requesting…" : remaining ? `Resend in ${remaining}s` : "Send another link"}</button><button disabled={busy} onClick={() => { setSentTo(""); setMode("up"); setErr(""); }} className="min-h-11 text-sm underline">Correct email address</button></div></div>
      </div> : <>
        <form onSubmit={mode === "in" ? signIn : send} className="mt-6 flex flex-col gap-3">
          <label className="relative"><span className="sr-only">Email address</span><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" /><input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className={field} /></label>
          {mode === "in" && <label className="relative"><span className="sr-only">Password</span><Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" /><input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" className={field} /></label>}
          <button type="submit" disabled={busy || (mode === "up" && remaining > 0)} className="rh-btn-primary !h-12 w-full inline-flex items-center justify-center gap-2 disabled:opacity-60">{busy && <Loader2 size={16} className="animate-spin" />}{mode === "in" ? "Sign in" : remaining ? `Request another link in ${remaining}s` : "Send confirmation link"}</button>
        </form>
        <div className="mt-5 pt-4 border-t border-hairline"><button onClick={() => { setMode(mode === "in" ? "up" : "in"); setErr(""); }} className="w-full text-left flex items-center justify-between gap-3 min-h-11 text-sm"><span>{mode === "in" ? "New here or forgot your password?" : "Already have a password?"}<span className="block text-ink-muted mt-1">{mode === "in" ? "Email me a sign-in link" : "Sign in with email and password"}</span></span><ArrowRight size={17} /></button></div>
      </>}
      {err && <p role="alert" className="text-sm text-red-700 mt-3">{err}</p>}
      <p className="text-xs text-ink-muted mt-5">Your place in the catalogue is saved.</p>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}
