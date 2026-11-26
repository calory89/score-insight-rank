// After an alert is created: one question, two answers plus "other", one tap, no text and nothing required.
// Asked once per browser (localStorage since 26-nov-2026, list 862; it was once per tab). The answer is a Clarity custom event (only when the visitor allowed analytics); it is never tied to the email.
import { useState } from "react";
import { t } from "../i18n";
import "./n9.css";

const OPTIONS: [string, string][] = [["search", "A search engine"], ["ai", "An AI assistant"], ["other", "Somewhere else"]];

export default function AlertSurvey() {
  const [done, setDone] = useState(() => { try { return localStorage.getItem("rh_found_us") === "1"; } catch { return false; } });
  if (done) return null;
  const pick = (k: string) => { setDone(true); try { localStorage.setItem("rh_found_us", "1"); (window as any).clarity?.("event", "found_us_" + k); } catch { /* blocked */ } };
  return (
    <div className="n9-survey" role="group" aria-label={t("How did you find RealHunt?")}>
      <p>{t("One question while you wait for the email: how did you find RealHunt?")}</p>
      <div>{OPTIONS.map(([k, l]) => <button type="button" key={k} onClick={() => pick(k)}>{t(l)}</button>)}</div>
    </div>
  );
}
