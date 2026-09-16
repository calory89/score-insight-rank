import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db, eur, track, FLAG } from "@/lib/rh";
import { Check } from "lucide-react";

const COUNTRIES = ["Any", "Italy", "Spain", "Portugal", "France", "Greece", "Japan", "Sweden", "Norway", "Indonesia"];
const BUDGETS = [10000, 25000, 50000, 100000];

const Onboarding = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [country, setCountry] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!user) return;
    db.from("profiles").select("onboarded,interest_country").eq("user_id", user.id).maybeSingle().then(({ data }: any) => { if (data && !data.onboarded && !data.interest_country) { setOpen(true); track("onboarding_shown"); } });
  }, [user]);
  if (!user || !open) return null;
  const finish = async (budget: number) => {
    const c = country || "Any";
    await db.from("profiles").update({ interest_country: c, budget_max: budget, onboarded: true }).eq("user_id", user.id);
    await db.from("alerts").insert({ email: user.email, country: c === "Any" ? null : c, max_price: budget, beach: false, user_id: user.id });
    track("onboarding_done", { meta: { c, budget } }); setDone(true); setTimeout(() => setOpen(false), 1400);
  };
  const skip = async () => { await db.from("profiles").update({ onboarded: true }).eq("user_id", user.id); track("onboarding_skip"); setOpen(false); };
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div className="w-full md:max-w-[460px] bg-white rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl">
        {done ? <p className="font-display text-[24px] inline-flex items-center gap-2"><Check size={22} /> Done. We only send you what fits.</p> : !country ? (
          <>
            <p className="font-display text-[24px] leading-tight tracking-tight">Where do you want a home?</p>
            <p className="text-[14px] text-ink-muted mt-1">Two taps. Then the feed and your alerts are yours.</p>
            <div className="mt-5 flex flex-wrap gap-2">{COUNTRIES.map((c) => <button key={c} onClick={() => setCountry(c)} className="px-4 py-2.5 rounded-full border border-hairline hover:border-ink text-[14px] bg-paper">{c !== "Any" && <span className="mr-1">{FLAG[c] || "🌍"}</span>}{c}</button>)}</div>
            <button onClick={skip} className="mt-5 text-[13px] text-ink-muted underline">Skip</button>
          </>
        ) : (
          <>
            <p className="font-display text-[24px] leading-tight tracking-tight">Up to how much?</p>
            <p className="text-[14px] text-ink-muted mt-1">{country === "Any" ? "Anywhere" : country}. Total budget for the home itself.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">{BUDGETS.map((b) => <button key={b} onClick={() => finish(b)} className="px-4 py-3.5 rounded-2xl border border-hairline hover:border-ink text-[16px] font-medium bg-paper tabular-nums">under {eur(b)}</button>)}</div>
            <button onClick={() => setCountry(null)} className="mt-5 text-[13px] text-ink-muted underline">Back</button>
          </>
        )}
      </div>
    </div>
  );
};
export default Onboarding;
