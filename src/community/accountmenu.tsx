// Header account control (8-nov-2026, "minimal" pass). Carlos: "the buttons at the top, so boxy". The header used to
// carry "My submissions" and "Review (27)" as two boxed buttons that wrapped onto a second row on phones and covered
// the page title. Now the header is one row on every width: logo left, the bell and ONE account control right.
//  - signed out: a quiet "Sign in" text button
//  - signed in: a round avatar that opens a small menu with My submissions, Messages, Saved, Post a home and, for
//    admins, Review (n). A dot on the avatar says when admin submissions are waiting.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bookmark, ClipboardCheck, FileText, MessageCircle, Plus, User } from "lucide-react";
import { useCommunity } from "./ctx";
import { t } from "./i18n";

export function accountInitial(handle?: string | null, name?: string | null, email?: string | null): string {
  const auto = !handle || /^hunter_[0-9a-f]{6,}$/i.test(handle); // same rule as autoHandle() in v5
  const src = (!auto && (name || handle)) || email || "";
  const c = src.trim().charAt(0).toUpperCase();
  return /[A-Z0-9À-Ý]/.test(c) ? c : "";
}

export function AccountMenu({ onSignIn }: { onSignIn: () => void }) {
  const { user, session } = useCommunity() || {};
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("touchstart", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  if (!user) return <button type="button" onClick={onSignIn} className="hunt-account rh-signin">{t("Sign in")}</button>;
  const admin = !!session?.admin;
  const pending = Number(session?.pending_submissions || 0);
  const initial = accountInitial(session?.hunter?.handle, session?.hunter?.display_name, user?.email);
  return (
    <div className="rh-acct" ref={box}>
      <button type="button" className="rh-acct-btn" aria-haspopup="menu" aria-expanded={open} aria-label={admin && pending ? `${t("Your account")}, ${pending} ${t("to review")}` : t("Your account")} onClick={() => setOpen((o) => !o)}>
        {initial ? <span aria-hidden="true">{initial}</span> : <User size={18} aria-hidden="true" />}
        {admin && pending > 0 && <i className="rh-acct-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="rh-acct-menu" role="menu">
          <Link role="menuitem" to="/me"><User size={17} aria-hidden="true" />{t("Profile")}</Link>
          <Link role="menuitem" to="/hunt/mine"><FileText size={17} aria-hidden="true" />{t("My submissions")}</Link>
          <Link role="menuitem" to="/inbox"><MessageCircle size={17} aria-hidden="true" />{t("Messages")}</Link>
          <Link role="menuitem" to="/hunt/saved"><Bookmark size={17} aria-hidden="true" />{t("Saved homes")}</Link>
          <Link role="menuitem" to="/submit"><Plus size={17} aria-hidden="true" />{t("Post a home")}</Link>
          {admin && <Link role="menuitem" to="/hunt/admin" className="is-admin"><ClipboardCheck size={17} aria-hidden="true" />{t("Review")}{pending > 0 && <b>{pending}</b>}</Link>}
        </div>
      )}
    </div>
  );
}
