// An email capture block meant to sit inside a page, not float over it. Used on every listing page,
// where the visitor has already shown what they want, and at the bottom of the home feed.
//
// The social proof beside the field is the real live counter (rh_live_stats), not a decoration: if
// the numbers cannot be read, or nobody is around, that line simply does not render. We never print
// an invented figure next to a form asking for someone's email.
import { useEffect, useRef, useState } from "react";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { subscribeEmail, track, lastEmail } from "@/lib/rh";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveStats } from "@/components/realhunt/LiveStats";

const VALID = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const nf = (n: number) => n.toLocaleString("en-GB");

type Props = { source: string; title?: string; subtitle?: string; cta?: string; compactProof?: boolean };

const CaptureInline = ({ source, title = "Get the 10 best homes of the week, free", subtitle = "Real listings, scored and picked by hand. The exact address and the original link, in your inbox.", cta = "Send me the top 10", compactProof }: Props) => {
  const { user } = useAuth();
  const stats = useLiveStats();
  const [mode, setMode] = useState<"idle" | "sending" | "done" | "error" | "failed">("idle");
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting && !seen) { setSeen(true); track("capture_show", { meta: { kind: source } }); } }, { threshold: 0.4 });
    io.observe(el); return () => io.disconnect();
  }, [seen, source]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget.querySelector<HTMLInputElement>("input[type=email]");
    const v = (el?.value ?? "").trim();
    if (!VALID.test(v)) { setMode("error"); return; }
    setMode("sending");
    const { ok } = await subscribeEmail(v, source, user?.id);
    setMode(ok ? "done" : "failed");
  };

  return (
    <div ref={ref} className="border border-hairline rounded-2xl bg-white p-5 md:p-6">
      {mode === "done" ? (
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={18} strokeWidth={3} /></span>
          <div>
            <p className="font-display text-[19px] tracking-tight">Received.</p>
            <p className="text-[14px] text-ink-muted">Your top 10 lands in your inbox by the end of this week, with the addresses and the original links.</p>
          </div>
        </div>
      ) : (
        <>
          <p className="font-display text-[19px] md:text-[21px] leading-tight tracking-tight inline-flex items-center gap-2"><Sparkles size={16} className="text-ink-muted" /> {title}</p>
          <p className="text-[13.5px] text-ink-muted mt-1.5">{subtitle}</p>
          <form onSubmit={submit} className="mt-4 flex flex-col sm:flex-row gap-2">
            <input type="email" inputMode="email" autoComplete="email" name="email" defaultValue={lastEmail()} placeholder="you@email.com" aria-invalid={mode === "error"}
              className={`flex-1 min-w-0 border rounded-full px-4 py-3 text-[15px] bg-paper outline-none transition-[border,box-shadow] ${mode === "error" ? "border-red-500 ring-2 ring-red-100" : "border-hairline focus:border-ink focus:ring-2 focus:ring-ink/10"}`} />
            <button type="submit" disabled={mode === "sending"} className="rh-btn-primary !px-5 shrink-0 inline-flex items-center justify-center gap-2 disabled:opacity-70">
              {mode === "sending" ? "Sending…" : cta} {mode !== "sending" && <ArrowRight size={15} />}
            </button>
          </form>
          {mode === "error" && <p className="text-[12.5px] text-red-600 mt-2">That email does not look right.</p>}
          {mode === "failed" && <p className="text-[12.5px] text-amber-700 mt-2">We could not save that just now. Try once more.</p>}
          {stats && stats.today > 0 && (
            <p className="text-[12.5px] text-ink-muted mt-3 inline-flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {compactProof ? <>{nf(stats.today)} people looked at these homes today.</> : <><b className="text-ink font-semibold tabular-nums">{nf(stats.today)}</b> people looked at these homes today{stats.live > 0 && <>, <b className="text-ink font-semibold tabular-nums">{nf(stats.live)}</b> right now</>}.</>}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default CaptureInline;
