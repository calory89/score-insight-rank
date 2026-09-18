// Email capture: a slim bar at the bottom of every public page, and a modal after 30 s when the bar was ignored.
// Saves to newsletter_subscribers. Collection only for now — no automatic welcome email (trigger disabled 18-sep-2026,
// top 10 goes out manually at week's end until the real send flow is ready). Any backend error on submit is swallowed
// so the form never shows a false "error" state to the visitor (duplicates/etc still count as success).
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { X, Check, ArrowRight, Sparkles } from "lucide-react";
import { track, eur, subscribeEmail } from "@/lib/rh";
import { useAuth } from "@/contexts/AuthContext";
import { useExperiment } from "@/lib/experiments";

const SKIP = [/^\/admin/, /^\/auth/, /^\/network/, /^\/legal/, /^\/app/, /^\/dashboard/, /^\/settings/, /^\/reset-password/, /^\/analysis/];
const K_SUB = "rh_sub", K_BAR = "rh_bar_off", K_POP = "rh_pop_ts";
const get = (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } };
const set = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch {} };
const valid = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());

const feedPeek = (): { imgs: string[]; min: number | null; n: number } => {
  try {
    const c = JSON.parse(localStorage.getItem("rh_feed_v2") || "null");
    const rows: any[] = (c && c.rows) || [];
    const imgs = rows.filter((r) => r.image_urls && r.image_urls[0]).slice(0, 3).map((r) => r.image_urls[0]);
    const prices = rows.map((r) => r.price_eur).filter((p) => p && p > 0);
    return { imgs, min: prices.length ? Math.min(...prices) : null, n: rows.length };
  } catch { return { imgs: [], min: null, n: 0 }; }
};

const CSS = `
@keyframes rhBarIn{from{transform:translateY(110%);opacity:0}to{transform:translateY(0);opacity:1}}
@keyframes rhPopIn{from{transform:translateY(24px) scale(.97);opacity:0}to{transform:none;opacity:1}}
@keyframes rhFade{from{opacity:0}to{opacity:1}}
@keyframes rhPopMob{from{transform:translateY(100%)}to{transform:none}}
@keyframes rhTick{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
@keyframes rhShine{0%{transform:translateX(-120%) skewX(-18deg)}100%{transform:translateX(220%) skewX(-18deg)}}
.rh-bar{animation:rhBarIn .55s cubic-bezier(.2,.8,.2,1) both}
.rh-pop{animation:rhPopIn .45s cubic-bezier(.2,.8,.2,1) both}
.rh-veil{animation:rhFade .3s ease both}
.rh-tick{animation:rhTick .5s cubic-bezier(.2,.8,.2,1) both}
.rh-shine{position:relative;overflow:hidden}
.rh-shine:after{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.35),transparent);animation:rhShine 2.4s ease-in-out 1.2s infinite}
@media (max-width:640px){.rh-pop{animation:rhPopMob .4s cubic-bezier(.2,.8,.2,1) both}}
@media (prefers-reduced-motion:reduce){.rh-bar,.rh-pop,.rh-veil,.rh-tick{animation:none}.rh-shine:after{display:none}}
`;

type Mode = "idle" | "sending" | "done" | "error" | "failed";

const useSubscribe = (source: string) => {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("idle");
  const submit = async (email: string) => {
    if (!valid(email)) { setMode("error"); return false; }
    setMode("sending");
    // One shared write for the whole site. This used to be its own upsert here, which RLS rejected
    // for anonymous visitors, so the bar and the popup never saved a single address.
    const { ok } = await subscribeEmail(email, source, user?.id);
    if (!ok) { setMode("failed"); return false; }
    setMode("done");
    return true;
  };
  return { mode, setMode, submit };
};

const Field = ({ value, onChange, onSubmit, mode, cta, big }: { value: string; onChange: (v: string) => void; onSubmit: (v: string) => void; mode: Mode; cta: string; big?: boolean }) => (
  <form onSubmit={(e) => {
    e.preventDefault();
    // Chrome/Safari autofill can paint a value into the input without ever firing the
    // change event React listens to, leaving `value` stale (often empty). Read the DOM
    // directly at submit time so an autofilled email never gets flagged as invalid.
    const el = e.currentTarget.querySelector<HTMLInputElement>("input[type=email]");
    onSubmit((el?.value ?? value).trim());
  }} className={`flex ${big ? "flex-col sm:flex-row" : "flex-row"} gap-2 w-full`}>
    <label className="sr-only" htmlFor={big ? "rh-pop-email" : "rh-bar-email"}>Email</label>
    <input id={big ? "rh-pop-email" : "rh-bar-email"} type="email" inputMode="email" autoComplete="email" enterKeyHint="send" value={value} onChange={(e) => onChange(e.target.value)} onBlur={(e) => onChange(e.target.value)} placeholder="you@email.com" aria-invalid={mode === "error"}
      className={`flex-1 min-w-0 border rounded-full bg-white outline-none transition-[border,box-shadow] ${mode === "error" ? "border-red-500 ring-2 ring-red-100" : "border-hairline focus:border-ink focus:ring-2 focus:ring-ink/10"} ${big ? "px-5 py-3.5 text-[16px]" : "px-4 py-2.5 text-[15px]"}`} />
    <button type="submit" disabled={mode === "sending"} className={`rh-btn-primary rh-shine shrink-0 inline-flex items-center justify-center gap-2 whitespace-nowrap ${big ? "!px-6 !py-3.5 !text-[16px]" : "!px-4 !py-2.5 !text-[14px]"} disabled:opacity-70`}>
      {mode === "sending" ? "Sending…" : cta} {mode !== "sending" && <ArrowRight size={16} />}
    </button>
  </form>
);

const Done = ({ big }: { big?: boolean }) => (
  <div className={`flex items-center gap-3 ${big ? "py-2" : ""}`}>
    <span className="rh-tick inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={18} strokeWidth={3} /></span>
    <div><p className={`font-medium ${big ? "text-[18px]" : "text-[15px]"}`}>Got it, you're on the list.</p><p className="text-[13px] text-ink-muted">Your top 10 homes land in your inbox by the end of this week.</p></div>
  </div>
);

const EmailCapture = () => {
  const { pathname } = useLocation();
  const [bar, setBar] = useState(false);
  const [pop, setPop] = useState(false);
  const [email, setEmail] = useState("");
  const [peek, setPeek] = useState(feedPeek);
  const barS = useSubscribe("banner");
  const popS = useSubscribe("popup");
  const popRef = useRef<HTMLDivElement>(null);
  const head = useExperiment("capture_headline", [{ id: "A", text: "The 10 best homes under €60,000. Free, in your inbox." }]);
  const skip = SKIP.some((r) => r.test(pathname)) || get(localStorage, K_SUB) === "1";

  // bar: after a short delay, unless dismissed in the last 7 days
  useEffect(() => {
    if (skip) { setBar(false); return; }
    const off = Number(get(localStorage, K_BAR) || 0);
    if (Date.now() - off < 7 * 86400e3) return;
    const t = setTimeout(() => { setBar(true); track("capture_show", { meta: { kind: "banner" } }); }, 3500);
    return () => clearTimeout(t);
  }, [skip, pathname]);

  // popup: 30 s on the site without subscribing, once per session, at most every 3 days
  useEffect(() => {
    if (skip) return;
    if (get(sessionStorage, "rh_pop_seen") === "1") return;
    if (Date.now() - Number(get(localStorage, K_POP) || 0) < 3 * 86400e3) return;
    let t: any;
    const fire = () => {
      if (document.visibilityState !== "visible" || get(localStorage, K_SUB) === "1") { t = setTimeout(fire, 8000); return; }
      const ae = document.activeElement as HTMLElement | null;
      if (ae && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) { t = setTimeout(fire, 10000); return; }
      if (document.querySelector("[role=dialog]")) { t = setTimeout(fire, 10000); return; }
      set(sessionStorage, "rh_pop_seen", "1"); set(localStorage, K_POP, String(Date.now()));
      setPeek(feedPeek()); setPop(true); track("capture_show", { meta: { kind: "popup" } });
    };
    t = setTimeout(fire, 30000);
    return () => clearTimeout(t);
  }, [skip]);

  // popup a11y: lock scroll, escape closes, focus the field
  useEffect(() => {
    if (!pop) return;
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closePop(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => popRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }), 350);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [pop]);

  const closeBar = () => { setBar(false); set(localStorage, K_BAR, String(Date.now())); track("capture_dismiss", { meta: { kind: "banner" } }); };
  const closePop = () => { setPop(false); if (popS.mode !== "done") track("capture_dismiss", { meta: { kind: "popup" } }); };
  const onBar = async (v: string) => { if (await barS.submit(v)) { setTimeout(() => setBar(false), 7000); } };
  const onPop = async (v: string) => { if (await popS.submit(v)) { setBar(false); setTimeout(() => setPop(false), 6000); } };

  if (skip && !pop && !bar) return null;
  const sub = peek.min ? <>Cheapest right now: <b className="text-ink">{eur(peek.min)}</b>. Real listings, ranked by how cheap they are for where they are.</> : <>Real listings under €60k, ranked by how cheap they are for where they are.</>;

  return (
    <>
      <style>{CSS}</style>

      {bar && !pop && (
        <div role="region" aria-label="Get the top 10 homes by email" className="rh-bar fixed inset-x-0 bottom-0 z-40 px-3 sm:px-4 pointer-events-none" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
          <div className="pointer-events-auto relative mx-auto max-w-[980px] rounded-2xl border border-hairline bg-white/95 backdrop-blur-md shadow-[0_12px_40px_-12px_rgba(0,0,0,.28)] p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-paper"><Sparkles size={18} /></span>
              <div className="min-w-0 pr-8 sm:pr-0">
                <p className="font-display text-[16px] sm:text-[17px] leading-tight tracking-tight">Top 10 best homes, free in your inbox</p>
                <p className="text-[12.5px] text-ink-muted truncate">{sub}</p>
              </div>
            </div>
            <div className="sm:w-[380px] shrink-0">{barS.mode === "done" ? <Done /> : <Field value={email} onChange={setEmail} onSubmit={onBar} mode={barS.mode} cta="Send me the top 10" />}</div>
            <button onClick={closeBar} aria-label="Close" className="absolute top-2 right-2 sm:static sm:ml-1 h-9 w-9 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-hairline/60 hover:text-ink transition-colors"><X size={18} /></button>
          </div>
        </div>
      )}

      {pop && (
        <div className="rh-veil fixed inset-0 z-[60] bg-ink/55 backdrop-blur-[3px] flex items-end sm:items-center justify-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) closePop(); }}>
          <div ref={popRef} role="dialog" aria-modal="true" aria-labelledby="rh-pop-title" className="rh-pop relative w-full sm:max-w-[520px] bg-paper text-ink rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <button onClick={closePop} aria-label="Close" className="absolute top-3 right-3 z-10 h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/90 text-ink shadow hover:bg-white transition-colors"><X size={18} /></button>
            <div className="relative h-[150px] sm:h-[190px] bg-ink overflow-hidden">
              {peek.imgs.length >= 3 ? (
                <div className="absolute inset-0 grid grid-cols-3 gap-0.5">{peek.imgs.map((u, i) => <img key={i} src={u} alt="" className={`h-full w-full object-cover ${i === 1 ? "scale-105" : ""}`} loading="eager" decoding="async" />)}</div>
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,#38bdf8_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#f59e0b_0%,transparent_55%)] opacity-80" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-paper via-paper/10 to-transparent" />
              <span className="absolute left-5 bottom-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[12px] font-medium shadow"><Sparkles size={13} /> Free · picked by hand · no spam</span>
            </div>
            <div className="px-5 sm:px-8 pt-3 pb-6 sm:pb-8">
              <h2 id="rh-pop-title" className="font-display text-[26px] sm:text-[30px] leading-[1.08] tracking-tight max-w-[18ch]">{head.text || "The 10 best homes under €60,000. Free, in your inbox."}</h2>
              <p className="mt-2 text-[14.5px] text-ink-muted">{sub}</p>
              <div className="mt-5">{popS.mode === "done" ? <Done big /> : <Field value={email} onChange={setEmail} onSubmit={onPop} mode={popS.mode} cta="Send me the top 10" big />}</div>
              {popS.mode === "error" && <p className="mt-2 text-[13px] text-red-600">That email does not look right.</p>}
              {popS.mode === "failed" && <p className="mt-2 text-[13px] text-amber-700">We could not save that just now. Try once more.</p>}
              {popS.mode !== "done" && <div className="mt-4 flex items-center justify-between text-[12.5px] text-ink-muted"><span>One email now, then only homes worth a look.</span><button onClick={closePop} className="underline hover:text-ink">No thanks</button></div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
export default EmailCapture;
