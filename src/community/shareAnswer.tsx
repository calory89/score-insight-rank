// "Share this answer" under the short answer of a can-I-buy page (14-nov-2026): the answer already has its own clean
// address (/can-i-buy/<nationality>-in-<country>), so the whole point is to make it one tap to pass on or to quote
// with the link attached. On a phone it opens the system share sheet; elsewhere it copies.
import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { t } from "./i18n";

/** The text that travels with the link: the question, the short answer and the first sentences of the rule. */
export const answerText = (question: string, status: string, rule: string, url: string) => {
  const short = rule.length > 240 ? rule.slice(0, 240).replace(/\s+\S*$/, "") + "…" : rule;
  return `${question} ${status}. ${short}\n${url}`;
};

export function ShareAnswer({ question, status, rule, url }: { question: string; status: string; rule: string; url: string }) {
  const [done, setDone] = useState<"" | "link" | "text">("");
  const flash = (k: "link" | "text") => { setDone(k); setTimeout(() => setDone(""), 1800); };
  const copy = async (text: string, k: "link" | "text") => { try { await navigator.clipboard.writeText(text); flash(k); } catch { /* clipboard blocked: nothing to do */ } };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: question, text: `${question} ${status}.`, url }); } catch { /* closed by the person */ } return; }
    copy(url, "link");
  };
  return (
    <div className="hunt-row rh2-share" style={{ marginBottom: 14 }}>
      <button type="button" className="hunt-secondary" onClick={share}>{done === "link" ? <Check size={15} /> : <Share2 size={15} />} {done === "link" ? t("Link copied") : t("Share this answer")}</button>
      <button type="button" className="hunt-secondary" onClick={() => copy(answerText(question, status, rule, url), "text")}>{done === "text" ? <Check size={15} /> : <Copy size={15} />} {done === "text" ? t("Copied") : t("Copy the answer with its link")}</button>
    </div>
  );
}
