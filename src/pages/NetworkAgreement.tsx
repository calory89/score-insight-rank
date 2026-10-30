import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { db, track, COMPANY } from "@/lib/rh";
import { AGREEMENT, AGREEMENT_SUMMARY, AGREEMENT_VERSION, COMMISSION_PCT, SOURCE_SHARE_PCT } from "@/lib/agreement";
import { Check, FileSignature, Lock, Loader2, Printer, ShieldCheck } from "lucide-react";

// /network/agreement — the network agreement, readable by anyone, signable by a developer with a panel.
const NetworkAgreement = () => {
  const { user } = useAuth() as any;
  const nav = useNavigate();
  const [auth, setAuth] = useState(false);
  const [dev, setDev] = useState<any | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [tick, setTick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { document.title = "Network Agreement · RealHunt"; track("agreement_view"); }, []);
  useEffect(() => {
    if (!user) { setDev(null); return; }
    db.from("network_developers").select("id,company,contact_name,project_name,agreement_version,agreement_accepted_at,agreement_signer,status").eq("user_id", user.id).maybeSingle().then(({ data }: any) => { setDev(data || null); if (data?.contact_name) setName(data.contact_name); });
  }, [user]);

  const signed = dev?.agreement_accepted_at && dev?.agreement_version === AGREEMENT_VERSION;
  const outdated = dev?.agreement_accepted_at && dev?.agreement_version !== AGREEMENT_VERSION;

  const sign = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!tick) { setErr("Tick the box to confirm you read it."); return; }
    setBusy(true);
    const { data, error } = await db.rpc("dev_sign_agreement", { p_name: name, p_version: AGREEMENT_VERSION, p_ua: navigator.userAgent });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    track("agreement_signed", { meta: { version: AGREEMENT_VERSION } });
    setDev({ ...dev, agreement_version: AGREEMENT_VERSION, agreement_accepted_at: data.accepted_at, agreement_signer: name });
    setTimeout(() => nav("/network/app/buyers"), 1200);
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <RHNav />
      <div className="max-w-[1140px] mx-auto px-4 md:px-6 py-8 md:py-12 grid lg:grid-cols-[1fr_360px] gap-8 items-start">
        <article className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2">RealHunt Network</p>
          <h1 className="font-display text-[clamp(30px,4.5vw,44px)] leading-tight tracking-tight">Network Agreement</h1>
          <p className="text-[14px] text-ink-muted mt-2">Version {AGREEMENT_VERSION} · one page, plain English · <button onClick={() => window.print()} className="underline inline-flex items-center gap-1"><Printer size={13} /> print</button></p>

          <div className="mt-6 border border-hairline rounded-2xl bg-white p-5 md:p-6">
            <p className="font-display text-[20px] tracking-tight">The short version</p>
            <ul className="mt-3 flex flex-col gap-2 text-[15px]">{AGREEMENT_SUMMARY.map((t) => <li key={t} className="flex gap-3"><Check size={16} className="shrink-0 mt-1 text-emerald-600" />{t}</li>)}</ul>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {AGREEMENT.map((c) => (
              <section key={c.title} className="border-b border-hairline pb-5 last:border-b-0">
                <h2 className="font-display text-[19px] tracking-tight">{c.title}</h2>
                <p className="text-[15px] leading-relaxed mt-2 text-ink/90">{c.body}</p>
              </section>
            ))}
          </div>
          <p className="text-[12px] text-ink-muted mt-6">{COMPANY.name} · {COMPANY.address} · {COMPANY.email}</p>
        </article>

        <aside className="lg:sticky lg:top-24 flex flex-col gap-3">
          <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6">
            <p className="font-display text-[22px] tracking-tight inline-flex items-center gap-2"><FileSignature size={20} /> Sign it</p>
            {!user && (<>
              <p className="text-[14px] text-ink-muted mt-2">Sign in to your developer panel first. Free, no password.</p>
              <button onClick={() => setAuth(true)} className="rh-btn-primary mt-4 w-full inline-flex items-center justify-center gap-2"><Lock size={16} /> Sign in</button>
            </>)}
            {user && dev === undefined && <p className="text-[14px] text-ink-muted mt-2 inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Checking your panel…</p>}
            {user && dev === null && (<>
              <p className="text-[14px] text-ink-muted mt-2">You need a developer panel before signing. It takes one minute.</p>
              <Link to="/network/app" className="rh-btn-primary mt-4 w-full inline-flex items-center justify-center gap-2">Create my panel</Link>
            </>)}
            {user && dev && signed && (<>
              <div className="mt-3 rounded-xl bg-emerald-500/10 text-emerald-800 p-4 text-[14px]"><p className="font-medium inline-flex items-center gap-2"><ShieldCheck size={16} /> Signed</p><p className="mt-1">{dev.agreement_signer} · {new Date(dev.agreement_accepted_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · v{dev.agreement_version}</p></div>
              <Link to="/network/app/buyers" className="rh-btn-primary mt-4 w-full inline-flex items-center justify-center gap-2">Open my buyers →</Link>
            </>)}
            {user && dev && !signed && (
              <form onSubmit={sign} className="mt-3 flex flex-col gap-3">
                {outdated && <p className="text-[13px] rounded-xl bg-amber-500/10 text-amber-800 p-3">The agreement changed since you signed v{dev.agreement_version}. Please sign the current version.</p>}
                <p className="text-[14px] text-ink-muted">Signing for <b className="text-ink">{dev.project_name || dev.company}</b>. {COMMISSION_PCT}% on sales to buyers we introduce, {SOURCE_SHARE_PCT}% to you when a shared lead of yours buys elsewhere.</p>
                <label className="flex flex-col gap-1 text-[13px] text-ink-muted">Your full name, as signature<input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam Fitzgerald" className="border border-hairline rounded-xl px-3.5 py-2.5 text-[15px] text-ink bg-paper outline-none focus:border-ink font-display" /></label>
                <label className="flex items-start gap-3 text-[13px] cursor-pointer"><input type="checkbox" className="mt-1" checked={tick} onChange={(e) => setTick(e.target.checked)} /><span>I have read the agreement and I am authorised to sign it for {dev.company}.</span></label>
                <button disabled={busy} className="rh-btn-primary w-full inline-flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />} Sign version {AGREEMENT_VERSION}</button>
                {err && <p className="text-[13px] text-red-600">{err}</p>}
                <p className="text-[12px] text-ink-muted">We record your name, the time and this version. That is your copy; it stays in your panel.</p>
              </form>
            )}
          </div>
          <div className="border border-hairline rounded-2xl bg-white p-5 text-[13px] text-ink-muted"><p className="font-medium text-ink text-[15px]">Why the upload matters</p><p className="mt-2">The only thing that protects your existing buyers from a commission is having their fingerprint in your panel before we introduce them. Upload first, then accept buyers.</p><Link to="/network/app/upload" className="underline text-ink mt-2 inline-block">Upload my contacts →</Link></div>
        </aside>
      </div>
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Sign in to sign the agreement" subtitle="Free. A link by email or Google." redirect="/network/agreement" />
    </div>
  );
};
export default NetworkAgreement;
