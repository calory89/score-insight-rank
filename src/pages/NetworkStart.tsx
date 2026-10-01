// /network/start — developer onboarding in five short steps (v8, 24-sep-2026).
// 1 Paste your link: we read the page (dev_preview) and show the project as it would look on RealHunt.
// 2 Account: email first (saved as a lead straight away), then a free account (Google or email link).
// 3 Goal: receive buyers, earn from dead leads, or both.
// 4 Agreement: the one-page summary, the full text one tap away, sign by typing your name.
// 5 Done: the project goes to review, public developer page, invite link, next steps.
// The draft lives in localStorage so nothing is lost across the sign-in redirect.
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { db, track, eur, FLAG } from "@/lib/rh";
import { AGREEMENT, AGREEMENT_SUMMARY, AGREEMENT_VERSION, COMMISSION_PCT, SOURCE_SHARE_PCT } from "@/lib/agreement";
import { Simulator, PhotoDrop } from "@/components/realhunt/DevGrowth";
import { Check, ChevronLeft, ChevronRight, Loader2, Link2, Mail, Phone, Users, Coins, Sparkles, FileSignature, Copy, ExternalLink, ImageOff, PencilLine, Upload, Share2, ShieldCheck } from "lucide-react";

type Draft = {
  url: string; title: string; price: string; country: string; location: string; category: string; description: string;
  images: string[]; cover: number; site_name: string; email: string; phone: string; company: string; mode: "receive" | "share" | "both";
};
const EMPTY: Draft = { url: "", title: "", price: "", country: "", location: "", category: "beach", description: "", images: [], cover: 0, site_name: "", email: "", phone: "", company: "", mode: "both" };
const KEY = "rh_dev_draft";
const load = (): Draft => { try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return EMPTY; } };
const save = (d: Draft) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } };
const STEPS = ["Your project", "Your account", "Your goal", "Agreement", "Live"];
const COUNTRIES = ["Indonesia", "Mexico", "Spain", "Portugal", "Italy", "Greece", "Albania", "Montenegro", "Turkey", "Cyprus", "United Arab Emirates", "Thailand", "Vietnam", "Philippines", "Sri Lanka", "Costa Rica", "Panama", "Dominican Republic", "Georgia", "Sweden", "Japan", "United States", "Canada", "Other"];
export const cl = (event: string) => { try { (window as any).clarity?.("event", event); } catch { /* ignore */ } track(event); };
const inp = "w-full border border-hairline rounded-xl px-3.5 py-2.5 text-[15px] text-ink bg-white outline-none focus:border-ink";

export default function NetworkStart() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user } = useAuth() as any;
  const [d, setD] = useState<Draft>(() => { const x = load(); const u = params.get("url"); return u && u !== x.url ? { ...EMPTY, email: x.email, phone: x.phone, url: u } : x; });
  const [step, setStep] = useState<number>(() => Number(params.get("step") || 0) || 0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [preview, setPreview] = useState<"idle" | "loading" | "ok" | "manual">(() => (load().title ? "ok" : "idle"));
  const [auth, setAuth] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [name, setName] = useState("");
  const [tick, setTick] = useState(false);
  const [full, setFull] = useState(false);
  const [copied, setCopied] = useState("");
  const up = (p: Partial<Draft>) => setD((x) => { const n = { ...x, ...p }; save(n); return n; });

  useEffect(() => { document.title = "List your project · RealHunt Network"; cl("dev_wizard_open"); }, []);
  useEffect(() => { cl(`dev_step_${step + 1}`); window.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);
  // coming back from the sign-in link: carry on where they were
  useEffect(() => { if (user && step === 1) setStep(2); if (user && !d.email) up({ email: user.email || "" }); }, [user?.id]);
  useEffect(() => { if (params.get("url") && preview === "idle") runPreview(params.get("url")!); }, []);

  const runPreview = async (raw: string) => {
    setErr(""); if (!raw.trim()) return;
    setPreview("loading"); cl("dev_preview_start");
    const { data, error } = await db.rpc("dev_preview", { p_url: raw.trim() });
    if (error || !data || data.error) {
      setPreview("manual"); up({ url: data?.url || raw.trim() });
      setErr(data?.error || "We could not read that page. Fill in the details below; it takes a minute.");
      cl("dev_preview_manual"); return;
    }
    const site = (data.site_name || "").trim();
    const esc = site.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const cleanTitle = (data.title || "").replace(site ? new RegExp(`\\s*[|·–—-]\\s*${esc}\\s*$`, "i") : /$^/, "").trim();
    up({ url: data.url, title: cleanTitle, description: data.description || "", images: data.images || [], cover: 0, site_name: data.site_name || "",
      price: data.price_eur ? String(data.price_eur) : "", country: data.country || "", company: data.site_name || "" });
    setPreview("ok"); cl("dev_preview_ok");
  };

  const goAccount = () => {
    setErr("");
    if (!d.title.trim()) { setErr("Give your project a name."); return; }
    if (!d.country) { setErr("Choose the country the project is in."); return; }
    if (user) { setStep(2); return; }
    setStep(1);
  };
  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    const em = d.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { setErr("Enter a valid email."); return; }
    setBusy(true);
    // saved straight away, so we can help even if they never finish
    await db.from("contact_requests").insert({ email: em, phone: d.phone || null, company: d.url, message: `wizard | ${d.title} | ${d.country} | ${d.price || "?"}`, source: "network_wizard" }).then(() => {}, () => {});
    setBusy(false); cl("dev_email_saved"); setAuth(true);
  };
  const finishGoal = async (mode: Draft["mode"]) => {
    up({ mode }); setBusy(true); setErr("");
    let ref: string | null = null; try { ref = localStorage.getItem("rh_dref"); } catch { /* ignore */ }
    const cover = d.images[d.cover]; const imgs = cover ? [cover, ...d.images.filter((_, i) => i !== d.cover)] : d.images;
    const { data, error } = await db.rpc("dev_onboard", { p: {
      mode, company: d.company || d.site_name, project_name: d.title, project_url: d.url, price_eur: d.price ? Number(d.price) : null,
      country: d.country, location: d.location, category: d.category, description: d.description, images: imgs, email: d.email, phone: d.phone, ref_dev: ref,
      site_name: d.site_name, claim_code: (() => { try { return localStorage.getItem("rh_dev_claim"); } catch { return null; } })() } });
    setBusy(false);
    if (error || data?.error) { setErr(data?.error || error.message || "Could not save. Try again."); if (data?.auth) setAuth(true); return; }
    setResult(data); cl(`dev_goal_${mode}`);
    setStep(data.signed ? 4 : 3);
  };
  const sign = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (name.trim().length < 3) { setErr("Type your full name to sign."); return; }
    if (!tick) { setErr("Tick the box to confirm you read it."); return; }
    setBusy(true);
    const { error } = await db.rpc("dev_sign_agreement", { p_name: name, p_version: AGREEMENT_VERSION, p_ua: navigator.userAgent });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    cl("dev_signed"); setStep(4);
  };
  const copy = (t: string, k: string) => navigator.clipboard.writeText(t).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1600); }).catch(() => {});

  const priceNum = Number(d.price || 0);
  const inFeed = priceNum > 0 && priceNum <= 100000;
  const cover = d.images[d.cover];

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <main className="max-w-[1080px] mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-24">
        {/* progress */}
        <ol className="flex items-center gap-1.5 md:gap-3 mb-7 overflow-x-auto scrollbar-none" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5 md:gap-3 shrink-0">
              <span className={`w-7 h-7 rounded-full grid place-items-center text-[12px] font-semibold ${i < step ? "bg-emerald-600 text-white" : i === step ? "bg-ink text-paper" : "bg-hairline text-ink-muted"}`}>{i < step ? <Check size={14} /> : i + 1}</span>
              <span className={`text-[13px] ${i === step ? "font-semibold" : "text-ink-muted"} ${i === step ? "" : "hidden sm:inline"}`}>{s}</span>
              {i < STEPS.length - 1 && <span className={`w-5 md:w-10 h-[2px] rounded ${i < step ? "bg-emerald-600" : "bg-hairline"}`} />}
            </li>
          ))}
        </ol>
        {err && <p role="alert" className="mb-4 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-[14px]">{err}</p>}

        {/* ------------------------------------------------ 1 project */}
        {step === 0 && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
            <div>
              <h1 className="font-display text-[clamp(28px,4.4vw,44px)] leading-[1.05] tracking-tight">{params.get("claim") ? "Check your listing, then go live." : "Paste your project link. We do the rest."}</h1>
              <p className="mt-3 text-[16px] text-ink-muted max-w-[56ch]">{params.get("claim") ? "We built it from your website. Fix anything below, add your own photos, and continue." : <>We read your page and build your listing in seconds. Free to list. You pay {COMMISSION_PCT}% only if a buyer we send you buys.</>}</p>
              <form onSubmit={(e) => { e.preventDefault(); runPreview(d.url); }} className="mt-6 flex flex-col sm:flex-row gap-2">
                <label className="relative flex-1"><Link2 size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
                  <input autoFocus value={d.url} onChange={(e) => up({ url: e.target.value })} inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="yourproject.com/the-project-page" aria-label="Project link" className={`${inp} !pl-11 !py-3.5 !text-[16px]`} /></label>
                <button disabled={preview === "loading" || !d.url.trim()} className="rh-btn-primary !px-6 inline-flex items-center justify-center gap-2">{preview === "loading" ? <><Loader2 size={16} className="animate-spin" /> Reading your page…</> : <><Sparkles size={16} /> Build my listing</>}</button>
              </form>
              {preview === "idle" && <button onClick={() => setPreview("manual")} className="mt-3 text-[13px] underline text-ink-muted">No website yet? Fill it in by hand</button>}

              {(preview === "ok" || preview === "manual") && (
                <div className="mt-7 border border-hairline rounded-2xl bg-white p-5 md:p-6 flex flex-col gap-4">
                  <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><PencilLine size={18} /> {preview === "ok" ? "Check what we found. Change anything." : "Your project"}</p>
                  {d.images.length > 1 && (
                    <div><p className="text-[13px] text-ink-muted mb-2">Pick the cover photo</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">{d.images.map((src, i) => (
                        <button key={src + i} type="button" onClick={() => up({ cover: i })} className={`shrink-0 rounded-xl overflow-hidden border-2 ${i === d.cover ? "border-ink" : "border-transparent"}`}><img src={src} alt="" className="w-24 h-18 object-cover" style={{ height: 72 }} loading="lazy" onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }} /></button>
                      ))}</div>
                    </div>
                  )}
                  <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Project name<input className={inp} value={d.title} onChange={(e) => up({ title: e.target.value })} placeholder="Sunset Studios Canggu" /></label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Price from (€)<input className={inp} inputMode="numeric" value={d.price} onChange={(e) => up({ price: e.target.value.replace(/[^\d]/g, "") })} placeholder="89000" /></label>
                    <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Country<select className={inp} value={d.country} onChange={(e) => up({ country: e.target.value })}><option value="">Choose…</option>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Town or area<input className={inp} value={d.location} onChange={(e) => up({ location: e.target.value })} placeholder="Canggu, Bali" /></label>
                    <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Company name<input className={inp} value={d.company} onChange={(e) => up({ company: e.target.value })} placeholder="Your company" /></label>
                  </div>
                  <div><p className="text-[13px] text-ink-muted mb-1.5">What is around it?</p>
                    <div className="flex flex-wrap gap-2">{[["beach", "Beach or sea"], ["village", "Countryside or village"], ["city", "Town or city"]].map(([k, l]) => <button key={k} type="button" onClick={() => up({ category: k })} className={`px-3.5 py-2 rounded-full border text-[14px] ${d.category === k ? "bg-ink text-paper border-ink" : "bg-white border-hairline"}`}>{l}</button>)}</div>
                  </div>
                  <label className="flex flex-col gap-1 text-[13px] text-ink-muted">One or two lines buyers should read<textarea className={`${inp} h-24`} value={d.description} onChange={(e) => up({ description: e.target.value })} placeholder="Studios 200 m from the beach, pool, ready June 2027." /></label>
                  {user ? <PhotoDrop images={d.images} onChange={(images) => up({ images, cover: 0 })} /> : <p className="text-[13px] text-ink-muted">You can add your own photos right after creating your free account.</p>}
                  {preview === "manual" && <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Photo link (optional)<input className={inp} placeholder="https://…/photo.jpg" onBlur={(e) => { const v = e.target.value.trim(); if (/^https:\/\//.test(v)) up({ images: [v, ...d.images], cover: 0 }); }} /></label>}
                  <button onClick={goAccount} className="rh-btn-primary self-start inline-flex items-center gap-2">Looks good <ChevronRight size={16} /></button>
                </div>
              )}
            </div>
            {/* live preview card */}
            <aside className={`lg:sticky lg:top-24 ${preview === "idle" ? "" : "order-first lg:order-none"}`}>
              <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted mb-2">How buyers will see it</p>
              <div className="rounded-3xl bg-white border border-hairline overflow-hidden shadow-sm">
                <div className="relative aspect-[4/3] bg-[#DFE0E2] grid place-items-center">
                  {preview === "loading" ? <Loader2 className="animate-spin text-ink-muted" /> : cover ? <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <ImageOff className="text-ink-muted" />}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/95 text-[12px] font-semibold">New build</span>
                  {priceNum > 0 && <span className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-white text-[16px] font-display">{eur(priceNum)}</span>}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-[16px] leading-snug">{d.title || (preview === "loading" ? "Reading your page…" : "Your project name")}</p>
                  <p className="text-[13px] text-ink-muted mt-1">{FLAG[d.country] || "🌍"} {[d.location, d.country].filter(Boolean).join(", ") || "Country"}</p>
                  <p className="text-[13px] text-ink-muted mt-2">by <b className="text-ink">{d.company || d.site_name || "your company"}</b></p>
                </div>
              </div>
              <p className="text-[13px] text-ink-muted mt-3">{priceNum === 0 ? "Add a starting price to see where it shows." : inFeed ? "Under €100,000: it also goes in the main RealHunt feed, where people vote and share." : "Above €100,000: it gets its own page and goes to buyers who match, but not the main feed (that one is only homes under €100,000)."}</p>
            </aside>
          </div>
        )}

        {/* ------------------------------------------------ 2 account */}
        {step === 1 && (
          <div className="max-w-[560px]">
            <h1 className="font-display text-[clamp(28px,4.4vw,40px)] leading-[1.05] tracking-tight">Where should we send your buyers?</h1>
            <p className="mt-3 text-[16px] text-ink-muted">Your free developer account. No password: Google, or a sign-in link by email.</p>
            <form onSubmit={submitEmail} className="mt-6 flex flex-col gap-3">
              <label className="relative"><Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" /><input required type="email" autoFocus value={d.email} onChange={(e) => up({ email: e.target.value })} placeholder="Work email" className={`${inp} !pl-11 !py-3.5`} /></label>
              <label className="relative"><Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" /><input type="tel" value={d.phone} onChange={(e) => up({ phone: e.target.value })} placeholder="Phone or WhatsApp (optional, so we can call before sending a buyer)" className={`${inp} !pl-11 !py-3.5`} /></label>
              <button disabled={busy} className="rh-btn-primary inline-flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />} Create my free account</button>
              <p className="text-[13px] text-ink-muted inline-flex items-center gap-1.5"><ShieldCheck size={14} /> €0 to join. {COMMISSION_PCT}% only after a sale, agreed in writing first.</p>
            </form>
            <button onClick={() => setStep(0)} className="mt-6 text-[14px] inline-flex items-center gap-1 text-ink-muted"><ChevronLeft size={15} /> Back to the project</button>
          </div>
        )}

        {/* ------------------------------------------------ 3 goal */}
        {step === 2 && (
          <div>
            <h1 className="font-display text-[clamp(28px,4.4vw,40px)] leading-[1.05] tracking-tight">What do you want from RealHunt?</h1>
            <p className="mt-3 text-[16px] text-ink-muted">You can change this any time in your panel.</p>
            <div className="mt-6 grid md:grid-cols-3 gap-4">
              {([
                ["receive", Users, "Receive buyers", `We send you people who asked about your project. You pay ${COMMISSION_PCT}% only if one buys.`, false],
                ["share", Coins, "Earn from dead leads", `Share leads you could not sell to. If one buys elsewhere in the network, you get ${SOURCE_SHARE_PCT}% of that sale.`, false],
                ["both", Sparkles, "Both", `Buyers for your project and money from your old leads. One panel, two switches.`, true],
              ] as const).map(([k, I, t, s, rec]) => (
                <button key={k} disabled={busy} onClick={() => finishGoal(k)} className={`text-left rounded-2xl bg-white p-6 flex flex-col gap-2 border-2 transition hover:-translate-y-0.5 ${rec ? "border-ink shadow-md" : "border-hairline hover:border-ink"} relative`}>
                  {rec && <span className="absolute -top-3 left-5 px-3 py-1 rounded-full bg-ink text-paper text-[11px] font-semibold">Recommended</span>}
                  <I size={22} />
                  <span className="font-display text-[22px] tracking-tight">{t}</span>
                  <span className="text-[14px] text-ink-muted leading-relaxed">{s}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-[14px] font-semibold">{busy && d.mode === k ? <Loader2 size={15} className="animate-spin" /> : null} Choose <ChevronRight size={15} /></span>
                </button>
              ))}
            </div>
            <div className="mt-8"><Simulator /></div>
          </div>
        )}

        {/* ------------------------------------------------ 4 agreement */}
        {step === 3 && (
          <div className="max-w-[720px]">
            <h1 className="font-display text-[clamp(28px,4.4vw,40px)] leading-[1.05] tracking-tight">One page. Three numbers.</h1>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[[`${COMMISSION_PCT}%`, "only if a buyer we send you buys"], [`${SOURCE_SHARE_PCT}%`, "to you when your shared lead buys elsewhere"], ["€0", "if nothing happens. Ever."]].map(([n, t]) => (
                <div key={n} className="rounded-2xl bg-white border border-hairline p-4"><p className="font-display text-[30px] leading-none">{n}</p><p className="text-[13px] text-ink-muted mt-2">{t}</p></div>
              ))}
            </div>
            <ul className="mt-5 flex flex-col gap-2.5 text-[15px]">{AGREEMENT_SUMMARY.map((s) => <li key={s} className="flex gap-2.5"><Check size={17} className="shrink-0 mt-0.5 text-emerald-600" />{s}</li>)}</ul>
            <button onClick={() => setFull(!full)} className="mt-4 text-[14px] underline">{full ? "Hide" : "Read"} the full agreement ({AGREEMENT.length} short clauses)</button>
            {full && <div className="mt-3 max-h-[46vh] overflow-y-auto rounded-2xl border border-hairline bg-white p-5 text-[14px] leading-relaxed">{AGREEMENT.map((c) => <div key={c.title} className="mb-4"><p className="font-semibold">{c.title}</p><p className="text-ink-muted mt-1">{c.body}</p></div>)}</div>}
            <form onSubmit={sign} className="mt-6 rounded-2xl bg-white border border-hairline p-5 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Type your full name to sign<input className={`${inp} !text-[18px] font-display`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" /></label>
              <label className="flex items-start gap-2.5 text-[14px]"><input type="checkbox" checked={tick} onChange={(e) => setTick(e.target.checked)} className="mt-1" /> I have read the Network Agreement (version {AGREEMENT_VERSION}) and accept it on behalf of my company.</label>
              <div className="flex flex-wrap items-center gap-3"><button disabled={busy} className="rh-btn-primary inline-flex items-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />} Sign and go live</button>
                <button type="button" onClick={() => { cl("dev_sign_later"); setStep(4); }} className="text-[14px] text-ink-muted underline">Sign later</button></div>
              <p className="text-[12px] text-ink-muted">We keep the date, time, your name and browser as the signature record. You get a copy in your panel.</p>
            </form>
          </div>
        )}

        {/* ------------------------------------------------ 5 done */}
        {step === 4 && <Done result={result} draft={d} copy={copy} copied={copied} onPanel={() => { try { localStorage.removeItem(KEY); localStorage.removeItem("rh_dev_claim"); } catch { /* ignore */ } nav("/network/app/projects"); }} />}
      </main>
      <AuthModal open={auth} onClose={() => setAuth(false)} initialMode="up" title="Create your free developer account" subtitle="No password. Google, or a sign-in link to your email. We bring you right back here." redirect="/network/start?step=2" />
    </div>
  );
}

function Done({ result, draft, copy, copied, onPanel }: { result: any; draft: Draft; copy: (t: string, k: string) => void; copied: string; onPanel: () => void }) {
  const [info, setInfo] = useState<any>(result);
  useEffect(() => { if (!info) db.rpc("dev_projects").then(({ data }: any) => data && setInfo({ slug: data.developer?.slug, invite_code: data.developer?.invite_code, project: data.projects?.[0] && { ...data.projects[0] } })).catch(() => {}); }, []);
  const pub = info?.slug ? `https://realhunt.co/dev/${info.slug}` : "";
  const invite = info?.invite_code ? `https://realhunt.co/network?dref=${info.invite_code}` : "";
  const badge = pub ? `<a href="${pub}"><img src="https://realhunt.co/badge/realhunt-partner.svg" alt="Listed on RealHunt" width="180" height="48"></a>` : "";
  const p = info?.project;
  const wantsShare = draft.mode !== "receive";
  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
      <div>
        <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 text-[13px] font-semibold"><Check size={15} /> You're in</p>
        <h1 className="mt-3 font-display text-[clamp(28px,4.4vw,44px)] leading-[1.05] tracking-tight">Your project is in review. Buyers are next.</h1>
        <p className="mt-3 text-[16px] text-ink-muted max-w-[56ch]">A person checks every listing, usually within 24 hours. Once it is live, anyone who asks about it lands in your panel with their name, contact and what they are looking for.</p>
        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          <button onClick={onPanel} className="rh-btn-primary inline-flex items-center justify-center gap-2">Open my panel <ChevronRight size={16} /></button>
          {wantsShare && <Link to="/network/app/upload" className="rh-btn-secondary inline-flex items-center justify-center gap-2"><Upload size={16} /> Upload my old leads</Link>}
        </div>
        {pub && (
          <div className="mt-6 rounded-2xl bg-white border border-hairline p-5">
            <p className="font-semibold text-[15px]">Your public developer page</p>
            <div className="mt-2 flex gap-2"><code className="flex-1 min-w-0 truncate rounded-xl bg-paper border border-hairline px-3 py-2 text-[13px]">{pub.replace("https://", "")}</code><button onClick={() => copy(pub, "pub")} className="px-3 rounded-xl border border-hairline text-[13px] inline-flex items-center gap-1">{copied === "pub" ? <Check size={14} /> : <Copy size={14} />}</button><a href={pub} target="_blank" rel="noreferrer" className="px-3 rounded-xl border border-hairline text-[13px] inline-flex items-center"><ExternalLink size={14} /></a></div>
            <p className="text-[13px] text-ink-muted mt-3">Put the badge on your website. It links to your page and tells buyers you are listed:</p>
            <div className="mt-2 flex items-center gap-3"><img src="/badge/realhunt-partner.svg" alt="Listed on RealHunt" width={180} height={48} /><button onClick={() => copy(badge, "badge")} className="px-3 py-2 rounded-xl border border-hairline text-[13px] inline-flex items-center gap-1">{copied === "badge" ? <Check size={14} /> : <Copy size={14} />} Copy code</button></div>
          </div>
        )}
        {invite && (
          <div className="mt-4 rounded-2xl bg-ink text-paper p-5">
            <p className="font-semibold text-[15px] inline-flex items-center gap-2"><Share2 size={16} /> Know another developer?</p>
            <p className="text-[14px] opacity-80 mt-1">Invite them. When a buyer from RealHunt buys from them, you get 0.5% of that sale, paid from our share. They pay nothing extra.</p>
            <div className="mt-3 flex gap-2"><code className="flex-1 min-w-0 truncate rounded-xl bg-white/10 px-3 py-2 text-[13px]">{invite.replace("https://", "")}</code><button onClick={() => copy(invite, "inv")} className="px-3 rounded-xl bg-white text-ink text-[13px] inline-flex items-center gap-1">{copied === "inv" ? <Check size={14} /> : <Copy size={14} />} Copy</button></div>
          </div>
        )}
      </div>
      <aside>
        <p className="text-[12px] uppercase tracking-[0.14em] text-ink-muted mb-2">Your listing</p>
        <div className="rounded-3xl bg-white border border-hairline overflow-hidden">
          <div className="relative aspect-[4/3] bg-[#DFE0E2]">{(p?.image || draft.images[draft.cover]) && <img src={p?.image || draft.images[draft.cover]} alt="" className="absolute inset-0 w-full h-full object-cover" />}
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-amber-400 text-[12px] font-semibold">{p?.status === "approved" ? "Live" : "In review"}</span></div>
          <div className="p-4"><p className="font-semibold">{p?.title || draft.title}</p><p className="text-[13px] text-ink-muted mt-1">{p?.price_eur ? eur(p.price_eur) + " · " : ""}{FLAG[p?.country || draft.country] || "🌍"} {p?.country || draft.country}</p></div>
        </div>
        <ol className="mt-4 text-[14px] flex flex-col gap-2">
          {[["Listing reviewed", "usually within 24 h"], ["Goes live", "Insiders see it 48 h before everyone else"], ["Buyers ask", "they appear in your panel, with their contact"], ["You sell", `${COMMISSION_PCT}% only then`]].map(([a, b], i) => <li key={a} className="flex gap-3"><span className="w-6 h-6 rounded-full bg-hairline grid place-items-center text-[12px] shrink-0">{i + 1}</span><span><b>{a}</b> <span className="text-ink-muted">· {b}</span></span></li>)}
        </ol>
      </aside>
    </div>
  );
}

