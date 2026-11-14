// Small always-loaded hooks of round n9 (15-nov-2026). The features themselves are lazy chunks; this file only
// decides when to fetch them, so a first visit downloads nothing for them.
import { Suspense, lazy, useEffect, useState } from "react";
import { guestSaves } from "../guestSaves";

const SaveNudge = lazy(() => import("./SaveNudge"));
const AlertSurvey = lazy(() => import("./AlertSurvey"));
const Helpful = lazy(() => import("./Helpful"));
const Toc = lazy(() => import("./Toc"));

/** Mounts the "three homes saved" card only after a save made on this page view brings the count to three or more. */
export function SaveNudgeMount({ signedIn }: { signedIn: boolean }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (signedIn) { setOn(false); return; }
    const check = () => { if (guestSaves().length >= 3) setOn(true); };
    window.addEventListener("rh-guest-saves", check);
    return () => window.removeEventListener("rh-guest-saves", check);
  }, [signedIn]);
  return on && !signedIn ? <Suspense fallback={null}><SaveNudge /></Suspense> : null;
}

/** Under the "check your email" message of the alert form. */
export function AlertSurveyMount() {
  return <Suspense fallback={null}><AlertSurvey /></Suspense>;
}

/** "Was this page useful?" at the end of a page. `id` names the page in this browser's memory of the answer. */
export function HelpfulMount({ id }: { id: string }) {
  return <Suspense fallback={null}><Helpful id={id} /></Suspense>;
}

/** "On this page" under the introduction of a long guide; the line's height is kept so nothing moves when it loads. */
export function TocMount({ within }: { within: string }) {
  return <div className="n9-toc-slot"><Suspense fallback={null}><Toc within={within} /></Suspense></div>;
}
