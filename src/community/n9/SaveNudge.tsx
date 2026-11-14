// Saving works without an account (guestSaves.ts). The site asks for an email only once, when the third home is
// saved: a small card at the bottom that covers nothing, says what the account is for and can be closed for good.
// It opens the normal sign-in (email link or password); no address is collected here.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCommunity } from "../ctx";
import { guestSaves } from "../guestSaves";
import { t } from "../i18n";
import "./n9.css";

const K = "rh_save_nudge";
/** Pure rule: show when the visitor has no account, reached three saved homes and has not answered before. */
export const shouldNudge = (o: { user: boolean; saves: number; answered: boolean }) => !o.user && o.saves >= 3 && !o.answered;

export default function SaveNudge() {
  const { user } = useAuth();
  const { requireUser, setNotice } = useCommunity();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => { let answered = false; try { answered = localStorage.getItem(K) === "1"; } catch { /* storage blocked */ } setOpen(shouldNudge({ user: !!user, saves: guestSaves().length, answered })); };
    // only a save made now opens it (see mount.tsx); three homes saved on an earlier visit do not greet the visitor with a card
    check(); // mount.tsx mounts this right after the save that reached three
    window.addEventListener("rh-guest-saves", check);
    return () => window.removeEventListener("rh-guest-saves", check);
  }, [user?.id]);
  // the card says what the "saved on this device" toast says, with the way to act on it: one message, not two stacked
  useEffect(() => { if (open) setNotice(""); }, [open]);
  const close = () => { setOpen(false); try { localStorage.setItem(K, "1"); } catch { /* storage blocked */ } };
  if (!open || user) return null;
  return (
    <aside className="n9-nudge" role="region" aria-label={t("Keep your saved homes")}>
      <button type="button" className="n9-nudge-x" aria-label={t("Close")} onClick={close}><X size={18} /></button>
      <h3>{t("Three homes saved on this device")}</h3>
      <p>{t("They live in this browser only. With a free account they follow you to your phone and laptop, and you can ask for an email when one of them drops in price.")}</p>
      <div className="n9-nudge-go">
        <button type="button" className="hunt-primary" onClick={() => { close(); try { (window as any).clarity?.("event", "save_nudge_account"); } catch { /* blocked */ } requireUser("up"); }}>{t("Keep them with my email")}</button>
        <button type="button" className="hunt-secondary" onClick={close}>{t("Not now")}</button>
      </div>
    </aside>
  );
}
