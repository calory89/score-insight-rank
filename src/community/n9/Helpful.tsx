// "Was this page useful?" (15-nov-2026): on home pages, guides and listing pages.
import { useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { t } from "../i18n";
import "./n9.css";

const ev = (name: string) => { try { (window as any).clarity?.("event", name); } catch { /* blocked */ } };

/** One tap, once per page per browser. The answer goes to Clarity as a custom event when the visitor allowed analytics. */
export default function Helpful({ id }: { id: string }) {
  const key = "rh_helpful:" + id;
  const [done, setDone] = useState<"" | "yes" | "no">("");
  useEffect(() => { try { const v = localStorage.getItem(key); setDone(v === "yes" || v === "no" ? v : ""); } catch { setDone(""); } }, [key]);
  const answer = (v: "yes" | "no") => { setDone(v); try { localStorage.setItem(key, v); } catch { /* storage blocked */ } ev(v === "yes" ? "helpful_yes" : "helpful_no"); };
  return (
    <div className="n9-helpful" role="group" aria-label={t("Was this page useful?")}>
      {done ? <p role="status">{done === "yes" ? t("Thank you. Good to know.") : <>{t("Thank you. Tell us what was missing:")}{" "}<a className="hunt-link" href={`mailto:carlos@equinoxinvestmentgroup.com?subject=${encodeURIComponent("Page feedback: " + (typeof location !== "undefined" ? location.pathname : id))}`}>carlos@equinoxinvestmentgroup.com</a></>}</p> : (
        <>
          <p>{t("Was this page useful?")}</p>
          <button type="button" onClick={() => answer("yes")}><ThumbsUp size={16} aria-hidden="true" /> {t("Yes")}</button>
          <button type="button" onClick={() => answer("no")}><ThumbsDown size={16} aria-hidden="true" /> {t("No")}</button>
        </>
      )}
    </div>
  );
}
