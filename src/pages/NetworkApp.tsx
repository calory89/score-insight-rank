import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RHNav from "@/components/realhunt/RHNav";
import AuthModal from "@/components/realhunt/AuthModal";
import { db, eur, track } from "@/lib/rh";
import { Lock, Upload, Users, Coins, Search, Check, Download, Trash2, ShieldCheck, Handshake, Fingerprint, Loader2, ToggleLeft, ToggleRight, ChevronRight } from "lucide-react";

// ── fingerprints, not contacts ─────────────────────────────────────────────────
// sha256(normalized value + "|rhn1"), computed here in the browser. The raw email or phone never leaves this tab.
const normEmail = (s: string) => s.trim().toLowerCase();
const normPhone = (s: string) => s.replace(/\D/g, "").replace(/^00/, "");
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
const isPhone = (s: string) => normPhone(s).length >= 7 && /^[+\d\s().-]+$/.test(s.trim());
const sha = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s + "|rhn1")))).map((b) => b.toString(16).padStart(2, "0")).join("");
export const fingerprint = async (raw: string) => (isEmail(raw) ? { fp: await sha(normEmail(raw)), kind: "email" } : isPhone(raw) ? { fp: await sha(normPhone(raw)), kind: "phone" } : null);
const mask = (fp: string) => `${fp.slice(0, 6)}…${fp.slice(-4)}`;
const COUNTRIES = ["", "Spain", "Portugal", "Italy", "France", "Greece", "Indonesia", "Thailand", "Mexico", "Dominican Republic", "Turkey", "UAE", "Other"];
const STATUS: Record<string, string> = { proposed: "New", accepted: "Accepted", contacted: "Contacted", visited: "Visited", reserved: "Reserved", sold: "Sold", lost: "Lost" };
const FLOW = ["accepted", "contacted", "visited", "reserved", "sold", "lost"];
type Tab = "overview" | "upload" | "leads" | "buyers" | "earnings" | "settings" | "privacy";
const TABS: [Tab, string][] = [["overview", "Overview"], ["upload", "Upload leads"], ["leads", "My leads"], ["buyers", "Buyers received"], ["earnings", "Earnings"], ["settings", "Settings"], ["privacy", "How it works"]];

const Kpi = ({ n, t, sub }: { n: React.ReactNode; t: string; sub?: string }) => <div className="border border-hairline rounded-2xl bg-white p-5"><p className="font-display text-[30px] leading-none tracking-tight tabular-nums">{n}</p><p className="text-[13px] text-ink-muted mt-2">{t}</p>{sub && <p className="text-[12px] text-ink-muted/80 mt-0.5">{sub}</p>}</div>;
const Field = ({ l, children }: { l: string; children: React.ReactNode }) => <label className="flex flex-col gap-1 text-[13px] text-ink-muted">{l}{children}</label>;
const inp = "border border-hairline rounded-xl px-3.5 py-2.5 text-[14px] text-ink bg-paper outline-none focus:border-ink";

const NetworkApp = () => {
  const { user, loading: authLoading } = useAuth() as any;
  const { tab: tParam } = useParams();
  const nav = useNavigate();
  const tab: Tab = (TABS.find(([k]) => k === tParam)?.[0] || "overview") as Tab;
  const [ov, setOv] = useState<any | null | undefined>(undefined); // undefined = loading, null = no profile
  const [auth, setAuth] = useState(false);
  const [form, setForm] = useState<any>({ company: "", contact_name: "", email: "", phone: "", website: "", country: "", project_name: "", project_url: "", price_from: "", share_default: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [leads, setLeads] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [checkRes, setCheckRes] = useState<any | null>(null);
  const [onlyShared, setOnlyShared] = useState<"all" | "shared" | "private">("all");
  // upload state
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<{ raw: string; fp: string; kind: string }[]>([]);
  const [prog, setProg] = useState(0);
  const [upOpts, setUpOpts] = useState({ shared: false, country: "", budget: "", tag: "" });
  const [upRes, setUpRes] = useState<any | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => { const { data } = await db.rpc("dev_overview"); setOv(data ?? null); if (data) { const f = data.developer; setForm({ company: f.company || "", contact_name: f.contact_name || "", email: f.email || "", phone: f.phone || "", website: f.website || "", country: f.country || "", project_name: f.project_name || "", project_url: f.project_url || "", price_from: f.price_from || "", share_default: !!f.share_default }); } };
  useEffect(() => { document.title = "Developer panel · RealHunt Network"; track("devapp_view", { meta: { tab } }); }, [tab]);
  useEffect(() => { if (!user) { setOv(undefined); return; } load(); try { const p = JSON.parse(sessionStorage.getItem("rh_dev_prefill") || "null"); if (p) setForm((f: any) => ({ ...f, email: p.email || user.email || "", phone: p.phone || "", project_url: p.project_url || "" })); else setForm((f: any) => ({ ...f, email: user.email || "" })); } catch {} }, [user]);
  useEffect(() => { if (!ov || tab !== "leads") return; db.from("lead_fingerprints").select("id,fp,kind,shared,country,budget,tag,uploaded_at").eq("developer_id", ov.developer.id).order("uploaded_at", { ascending: false }).limit(2000).then(({ data }: any) => setLeads(data || [])); }, [ov, tab]);

  const register = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return; setBusy(true); setMsg("");
    let url = form.project_url.trim(); if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
    const payload = { ...form, project_url: url, price_from: form.price_from ? Number(form.price_from) : null, user_id: user.id };
    const { error } = ov ? await db.from("network_developers").update(payload).eq("user_id", user.id) : await db.from("network_developers").insert(payload);
    setBusy(false); if (error) { setMsg(error.message); return; }
    track(ov ? "devapp_update" : "devapp_register"); try { sessionStorage.removeItem("rh_dev_prefill"); } catch {}
    await load(); if (!ov) nav("/network/app/upload"); else setMsg("Saved.");
  };

  // parse pasted text or CSV: every email / phone found becomes one fingerprint
  const parse = async (text: string) => {
    const found = new Map<string, string>();
    text.split(/[\r\n]+/).forEach((line) => {
      line.split(/[,;\t]/).forEach((cell) => { const c = cell.replace(/^["']|["']$/g, "").trim(); if (!c) return; if (isEmail(c)) found.set(normEmail(c), c); else if (isPhone(c) && normPhone(c).length >= 7) found.set("p:" + normPhone(c), c); });
    });
    const list = Array.from(found.values()); const out: { raw: string; fp: string; kind: string }[] = [];
    for (let i = 0; i < list.length; i++) { const r = await fingerprint(list[i]); if (r) out.push({ raw: list[i], ...r }); if (i % 50 === 0) setProg(Math.round((i / list.length) * 100)); }
    setProg(100); setRows(out);
  };
  const onFile = async (f: File | undefined) => { if (!f) return; setRaw(""); setUpRes(null); setProg(1); await parse(await f.text()); };
  const send = async () => {
    if (!rows.length) return; setBusy(true); setUpRes(null);
    const body = rows.map((r) => ({ fp: r.fp, kind: r.kind, shared: upOpts.shared, country: upOpts.country || null, budget: upOpts.budget ? Number(upOpts.budget) : null, tag: upOpts.tag || null }));
    const { data, error } = await db.rpc("dev_upload_fps", { p_rows: body });
    setBusy(false); if (error) { setMsg(error.message); return; }
    setUpRes(data); track("devapp_upload", { meta: { n: rows.length, shared: upOpts.shared } }); setRows([]); setRaw(""); load();
  };
  const setShared = async (ids: number[], shared: boolean) => { if (!ids.length) return; setLeads((l) => l.map((x) => (ids.includes(x.id) ? { ...x, shared } : x))); await db.from("lead_fingerprints").update({ shared }).in("id", ids); load(); };
  const check = async (e: React.FormEvent) => { e.preventDefault(); const r = await fingerprint(q); if (!r) { setCheckRes({ bad: true }); return; } const { data } = await db.rpc("dev_check_fp", { p_fp: r.fp }); setCheckRes({ ...data, fp: r.fp, kind: r.kind }); };
  const setIntro = async (id: string, status: string) => { await db.from("introductions").update({ status, updated_at: new Date().toISOString() }).eq("id", id); load(); };
  const exportCsv = () => { const csv = "fingerprint,kind,shared,country,budget,tag,uploaded_at\n" + leads.map((l) => [l.fp, l.kind, l.shared, l.country || "", l.budget || "", l.tag || "", l.uploaded_at].join(",")).join("\n"); const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "realhunt-fingerprints.csv"; a.click(); };
  const wipe = async () => { if (!confirm("Delete all your fingerprints from RealHunt? Introductions already made are kept.")) return; await db.from("lead_fingerprints").delete().eq("developer_id", ov.developer.id); setLeads([]); load(); };

  const shownLeads = useMemo(() => leads.filter((l) => onlyShared === "all" || (onlyShared === "shared" ? l.shared : !l.shared)), [leads, onlyShared]);
  const approved = ov?.developer?.status === "approved";

  if (!user) return (
    <div className="min-h-screen bg-paper text-ink"><RHNav />
      <div className="max-w-[720px] mx-auto px-6 py-20 text-center">
        <Fingerprint size={40} className="mx-auto text-ink-muted" />
        <h1 className="font-display text-[34px] tracking-tight mt-4">Your developer panel</h1>
        <p className="text-[16px] text-ink-muted mt-3 max-w-[46ch] mx-auto">Upload your leads as fingerprints, see how many are already active in the network, and earn when one of them buys somewhere else. Your contacts never leave your browser.</p>
        <button onClick={() => setAuth(true)} className="rh-btn-primary mt-6 inline-flex items-center gap-2"><Lock size={16} /> Sign in to open it</button>
        {!authLoading && <p className="text-[13px] text-ink-muted mt-4">New here? <Link to="/network" className="underline">See how the network works</Link></p>}
      </div>
      <AuthModal open={auth} onClose={() => setAuth(false)} title="Sign in to your developer panel" subtitle="Free. No password, a link by email or Google." redirect="/network/app" />
    </div>
  );

  if (ov === undefined) return <div className="min-h-screen bg-paper text-ink"><RHNav /><div className="max-w-[1140px] mx-auto px-6 py-16 text-ink-muted inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Opening your panel…</div></div>;

  const RegisterForm = (
    <form onSubmit={register} className="border border-hairline rounded-2xl bg-white p-6 md:p-8 grid md:grid-cols-2 gap-4">
      <Field l="Company"><input required className={inp} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></Field>
      <Field l="Your name"><input required className={inp} value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} /></Field>
      <Field l="Email"><input required type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field l="Phone (optional)"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field l="Project name"><input required className={inp} value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} /></Field>
      <Field l="Project page"><input required className={inp} placeholder="yourproject.com" value={form.project_url} onChange={(e) => setForm({ ...form, project_url: e.target.value })} /></Field>
      <Field l="Country"><select className={inp} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c} value={c}>{c || "Choose"}</option>)}</select></Field>
      <Field l="Price from (€)"><input type="number" className={inp} value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} /></Field>
      <label className="md:col-span-2 flex items-start gap-3 text-[14px]"><input type="checkbox" className="mt-1" checked={form.share_default} onChange={(e) => setForm({ ...form, share_default: e.target.checked })} /><span>Share my uploaded leads with the network by default. <span className="text-ink-muted">You can change it per contact later. Shared means RealHunt may introduce that buyer to another project; you earn {eur(Number(ov?.developer?.fee_eur || 15))} per accepted introduction.</span></span></label>
      <div className="md:col-span-2 flex items-center gap-4"><button disabled={busy} className="rh-btn-primary inline-flex items-center gap-2">{busy && <Loader2 size={16} className="animate-spin" />} {ov ? "Save" : "Create my panel"}</button>{msg && <span className="text-[13px] text-ink-muted">{msg}</span>}</div>
    </form>
  );

  if (ov === null) return (
    <div className="min-h-screen bg-paper text-ink"><RHNav />
      <div className="max-w-[860px] mx-auto px-6 py-12 flex flex-col gap-6">
        <div><p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2">RealHunt Network</p><h1 className="font-display text-[34px] tracking-tight">Tell us about your project. One minute.</h1><p className="text-[15px] text-ink-muted mt-2">Then upload leads, check overlap and start receiving buyers. We review every developer by hand before any introduction.</p></div>
        {RegisterForm}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper text-ink"><RHNav />
      <div className="max-w-[1140px] mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[11px] uppercase tracking-[0.16em] text-ink-muted mb-2">Developer panel</p><h1 className="font-display text-[30px] md:text-[34px] tracking-tight">{ov.developer.project_name || ov.developer.company}</h1></div>
          <span className={`px-3 py-1.5 rounded-full text-[12px] font-medium ${approved ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700"}`}>{approved ? "Approved · receiving buyers" : "Under review · upload works, introductions start once approved"}</span>
        </div>
        <div className="mt-6 flex gap-1 overflow-x-auto scrollbar-none border-b border-hairline">{TABS.map(([k, l]) => <Link key={k} to={`/network/app/${k}`} className={`shrink-0 px-4 py-2.5 text-[14px] border-b-2 -mb-px ${tab === k ? "border-ink text-ink font-medium" : "border-transparent text-ink-muted hover:text-ink"}`}>{l}</Link>)}</div>

        {tab === "overview" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Kpi n={ov.leads} t="leads uploaded" sub={`${ov.shared} shared with the network`} />
              <Kpi n={ov.overlap_realhunt} t="are active RealHunt buyers" sub="looking for homes right now" />
              <Kpi n={ov.overlap_network} t="also with another developer" sub="hot: they are comparing" />
              <Kpi n={eur(Number(ov.earned))} t="earned" sub={Number(ov.pending_earn) ? `+ ${eur(Number(ov.pending_earn))} pending` : "share leads to earn"} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <Link to="/network/app/upload" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Upload size={18} /> <span><b>Upload leads</b><br /><span className="text-[13px] text-ink-muted">CSV or paste. Hashed in your browser.</span></span></span><ChevronRight size={16} /></Link>
              <Link to="/network/app/buyers" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Handshake size={18} /> <span><b>{ov.received.length} buyers received</b><br /><span className="text-[13px] text-ink-muted">{ov.received.filter((i: any) => i.status === "proposed").length} waiting for your answer</span></span></span><ChevronRight size={16} /></Link>
              <Link to="/network/app/leads" className="border border-hairline rounded-2xl bg-white p-5 hover:border-ink flex items-center justify-between"><span className="inline-flex items-center gap-3"><Users size={18} /> <span><b>Choose what to share</b><br /><span className="text-[13px] text-ink-muted">Per contact. Change it any time.</span></span></span><ChevronRight size={16} /></Link>
            </div>
            <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6 grid md:grid-cols-[1fr_auto] gap-4 items-center">
              <div><p className="font-display text-[20px] tracking-tight">The network right now</p><p className="text-[14px] text-ink-muted mt-1"><b className="text-ink">{ov.network_developers}</b> approved developers · <b className="text-ink">{ov.network_leads}</b> fingerprinted leads · <b className="text-ink">{ov.network_shared}</b> shared · <b className="text-ink">{ov.rh_buyers}</b> RealHunt buyers under €100k</p></div>
              <div className="flex items-end gap-1 h-14">{(ov.by_month || []).slice(-8).map((m: any) => { const mx = Math.max(1, ...ov.by_month.map((x: any) => x.n)); return <div key={m.m} title={`${m.m}: ${m.n}`} className="w-5 bg-ink rounded-t" style={{ height: `${Math.max(6, (m.n / mx) * 100)}%` }} />; })}</div>
            </div>
          </div>
        )}

        {tab === "upload" && (
          <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="flex flex-col gap-4">
              <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6">
                <p className="font-display text-[20px] tracking-tight inline-flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-600" /> Your contacts never leave this browser</p>
                <p className="text-[14px] text-ink-muted mt-1">Drop a CSV or paste emails and phones. Each one becomes a one-way fingerprint here, on your machine, and only the fingerprint is sent. We cannot read it back. Nobody can.</p>
                <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0]); }} onClick={() => fileRef.current?.click()} className="mt-4 border-2 border-dashed border-hairline hover:border-ink rounded-2xl p-8 text-center cursor-pointer">
                  <Upload size={22} className="mx-auto text-ink-muted" /><p className="text-[14px] mt-2">Drop your CSV / Excel export here, or click to choose</p><p className="text-[12px] text-ink-muted mt-1">Any column layout. We only pick up emails and phone numbers.</p>
                  <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
                </div>
                <textarea value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={"or paste here, one per line:\nmaria@gmail.com\n+34 600 123 456"} className={`${inp} mt-3 w-full h-28 rounded-2xl font-mono text-[13px]`} />
                <div className="mt-3 flex items-center gap-3"><button onClick={() => { setUpRes(null); setProg(1); parse(raw); }} disabled={!raw.trim()} className="px-4 py-2 rounded-full border border-ink text-[14px] font-medium disabled:opacity-40">Fingerprint pasted text</button>{prog > 0 && prog < 100 && <span className="text-[13px] text-ink-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> hashing {prog}%</span>}</div>
              </div>
              {rows.length > 0 && (
                <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6">
                  <p className="font-display text-[20px] tracking-tight">{rows.length} contacts ready · {rows.filter((r) => r.kind === "email").length} emails, {rows.filter((r) => r.kind === "phone").length} phones</p>
                  <table className="w-full mt-3 text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left py-1">Stays here</th><th className="text-left py-1">What we receive</th></tr></thead><tbody>{rows.slice(0, 3).map((r) => <tr key={r.fp} className="border-t border-hairline/70"><td className="py-1.5 pr-3 text-ink-muted">{r.raw}</td><td className="py-1.5 font-mono">{mask(r.fp)}</td></tr>)}{rows.length > 3 && <tr className="border-t border-hairline/70"><td className="py-1.5 text-ink-muted" colSpan={2}>… and {rows.length - 3} more</td></tr>}</tbody></table>
                  <div className="mt-4 grid sm:grid-cols-3 gap-3">
                    <Field l="Country they asked about"><select className={inp} value={upOpts.country} onChange={(e) => setUpOpts({ ...upOpts, country: e.target.value })}>{COUNTRIES.map((c) => <option key={c} value={c}>{c || "Any / unknown"}</option>)}</select></Field>
                    <Field l="Typical budget (€)"><input type="number" className={inp} placeholder="150000" value={upOpts.budget} onChange={(e) => setUpOpts({ ...upOpts, budget: e.target.value })} /></Field>
                    <Field l="Tag"><input className={inp} placeholder="expo-2025, cold, visited…" value={upOpts.tag} onChange={(e) => setUpOpts({ ...upOpts, tag: e.target.value })} /></Field>
                  </div>
                  <label className="mt-4 flex items-start gap-3 text-[14px] cursor-pointer" onClick={() => setUpOpts({ ...upOpts, shared: !upOpts.shared })}>{upOpts.shared ? <ToggleRight size={26} className="text-emerald-600 shrink-0" /> : <ToggleLeft size={26} className="text-ink-muted shrink-0" />}<span><b>Share this batch with the network</b><br /><span className="text-ink-muted">RealHunt may introduce these buyers to other projects. You earn {eur(Number(ov.developer.fee_eur))} per accepted introduction. Private batches are only used to tell you the overlap.</span></span></label>
                  <div className="mt-4 flex items-center gap-3"><button onClick={send} disabled={busy} className="rh-btn-primary inline-flex items-center gap-2">{busy ? <Loader2 size={16} className="animate-spin" /> : <Fingerprint size={16} />} Send {rows.length} fingerprints</button><button onClick={() => { setRows([]); setRaw(""); }} className="text-[13px] text-ink-muted underline">Clear</button></div>
                </div>
              )}
              {upRes && <div className="border border-emerald-500/40 bg-emerald-500/5 rounded-2xl p-5 text-[14px]"><p className="font-medium inline-flex items-center gap-2"><Check size={16} /> Done.</p><p className="mt-1"><b>{upRes.inserted}</b> new · <b>{upRes.duplicates}</b> already in your list · <b>{upRes.overlap_realhunt}</b> of all your leads are active RealHunt buyers · <b>{upRes.overlap_network}</b> are also with another developer.</p></div>}
              {msg && <p className="text-[13px] text-red-600">{msg}</p>}
            </div>
            <aside className="flex flex-col gap-3">
              <div className="border border-hairline rounded-2xl bg-white p-5"><p className="font-medium text-[15px] inline-flex items-center gap-2"><Search size={16} /> Is this contact known?</p><p className="text-[13px] text-ink-muted mt-1">Type an email or phone. It is fingerprinted here and only the fingerprint is checked.</p>
                <form onSubmit={check} className="mt-3 flex gap-2"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="name@mail.com" className={`${inp} flex-1 min-w-0`} /><button className="px-4 rounded-xl border border-ink text-[13px] font-medium">Check</button></form>
                {checkRes && (checkRes.bad ? <p className="text-[13px] text-red-600 mt-2">Not an email or phone.</p> : <ul className="mt-3 text-[13px] flex flex-col gap-1"><li>{checkRes.mine ? "✓ In your list" : "· Not in your list"}</li><li>{checkRes.realhunt ? "✓ Active RealHunt buyer" : "· Not a RealHunt buyer yet"}</li><li>{Number(checkRes.network) > 0 ? `✓ With ${checkRes.network} other developer${checkRes.network > 1 ? "s" : ""}` : "· No other developer has them"}</li><li>{Number(checkRes.introduced) > 0 ? `✓ Introduced ${checkRes.introduced}×` : "· Never introduced"}</li></ul>)}
              </div>
              <div className="border border-hairline rounded-2xl bg-white p-5 text-[13px] text-ink-muted"><p className="font-medium text-ink text-[15px]">What a fingerprint looks like</p><p className="mt-2 font-mono break-all text-[12px]">{"a8f09af9fc6af1a5…fd0e06d1"}</p><p className="mt-2">64 characters, one way. Same contact → same fingerprint, on every developer's machine. That is how overlap is counted without anyone seeing a name.</p></div>
            </aside>
          </div>
        )}

        {tab === "leads" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "shared", "private"] as const).map((k) => <button key={k} onClick={() => setOnlyShared(k)} className={`px-3.5 py-2 rounded-full border text-[13px] ${onlyShared === k ? "bg-ink text-paper border-ink" : "border-hairline bg-white"}`}>{k === "all" ? `All (${leads.length})` : k === "shared" ? `Shared (${leads.filter((l) => l.shared).length})` : `Private (${leads.filter((l) => !l.shared).length})`}</button>)}
              <span className="flex-1" />
              <button onClick={() => setShared(shownLeads.map((l) => l.id), true)} className="px-3.5 py-2 rounded-full border border-hairline bg-white text-[13px]">Share all shown</button>
              <button onClick={() => setShared(shownLeads.map((l) => l.id), false)} className="px-3.5 py-2 rounded-full border border-hairline bg-white text-[13px]">Make all shown private</button>
              <button onClick={exportCsv} className="px-3.5 py-2 rounded-full border border-hairline bg-white text-[13px] inline-flex items-center gap-1.5"><Download size={14} /> Export</button>
            </div>
            {leads.length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-10 text-center text-ink-muted">No leads yet. <Link to="/network/app/upload" className="underline text-ink">Upload your first batch</Link>.</div> : (
              <div className="border border-hairline rounded-2xl bg-white overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left px-4 py-2.5">Fingerprint</th><th className="text-left px-3 py-2.5">Kind</th><th className="text-left px-3 py-2.5">Country</th><th className="text-left px-3 py-2.5">Budget</th><th className="text-left px-3 py-2.5">Tag</th><th className="text-left px-3 py-2.5">Uploaded</th><th className="text-left px-3 py-2.5">Shared</th></tr></thead>
                <tbody>{shownLeads.slice(0, 500).map((l) => <tr key={l.id} className="border-t border-hairline/70"><td className="px-4 py-2 font-mono">{mask(l.fp)}</td><td className="px-3 py-2 text-ink-muted">{l.kind}</td><td className="px-3 py-2">{l.country || "—"}</td><td className="px-3 py-2 tabular-nums">{l.budget ? eur(l.budget) : "—"}</td><td className="px-3 py-2 text-ink-muted">{l.tag || "—"}</td><td className="px-3 py-2 text-ink-muted">{new Date(l.uploaded_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td><td className="px-3 py-2"><button onClick={() => setShared([l.id], !l.shared)} aria-label="Toggle share">{l.shared ? <ToggleRight size={24} className="text-emerald-600" /> : <ToggleLeft size={24} className="text-ink-muted" />}</button></td></tr>)}</tbody></table>
                {shownLeads.length > 500 && <p className="px-4 py-3 text-[12px] text-ink-muted">Showing 500 of {shownLeads.length}. Export to see all.</p>}</div>
            )}
          </div>
        )}

        {tab === "buyers" && (
          <div className="mt-6 flex flex-col gap-3">
            {!approved && <div className="border border-amber-500/40 bg-amber-500/5 rounded-2xl p-5 text-[14px]">We are reviewing your project. Introductions start the moment it is approved, usually within a day. Uploading now means you are first in line.</div>}
            {ov.received.length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-10 text-center text-ink-muted">No buyers introduced yet. They appear here with their status, and we email you at {ov.developer.email} for each one.</div> : ov.received.map((i: any) => (
              <div key={i.id} className="border border-hairline rounded-2xl bg-white p-5 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1"><p className="font-medium text-[15px]">Buyer {i.buyer}… <span className="text-ink-muted font-normal">from {i.from}</span></p><p className="text-[13px] text-ink-muted mt-0.5">{i.note || "Fits your country and price."} · {new Date(i.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p></div>
                <div className="flex flex-wrap gap-1.5">{(i.status === "proposed" ? ["accepted", "lost"] : FLOW).map((s) => <button key={s} onClick={() => setIntro(i.id, s)} className={`px-3 py-1.5 rounded-full border text-[12px] ${i.status === s ? "bg-ink text-paper border-ink" : "border-hairline hover:border-ink"}`}>{s === "accepted" && i.status === "proposed" ? "Accept, send me the contact" : s === "lost" && i.status === "proposed" ? "Not for us" : STATUS[s]}</button>)}</div>
              </div>
            ))}
            <p className="text-[12px] text-ink-muted">Accept and we email you the buyer's contact details. Keep the status updated: it is what the sharing developer gets paid on, and what we use to send you better fits.</p>
          </div>
        )}

        {tab === "earnings" && (
          <div className="mt-6 flex flex-col gap-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Kpi n={eur(Number(ov.earned))} t="earned" sub="accepted introductions of your leads" /><Kpi n={eur(Number(ov.pending_earn))} t="pending" sub="waiting for the other developer" /><Kpi n={ov.given.length} t="introductions from your leads" /><Kpi n={eur(Number(ov.developer.fee_eur))} t="per accepted introduction" sub="paid monthly, from €50" /></div>
            {ov.given.length === 0 ? <div className="border border-hairline rounded-2xl bg-white p-10 text-center text-ink-muted">Nothing yet. Share leads and this fills up when one of them fits another project.</div> : (
              <div className="border border-hairline rounded-2xl bg-white overflow-x-auto"><table className="w-full text-[13px]"><thead><tr className="text-[11px] uppercase tracking-wider text-ink-muted"><th className="text-left px-4 py-2.5">Buyer</th><th className="text-left px-3 py-2.5">Introduced to</th><th className="text-left px-3 py-2.5">Status</th><th className="text-left px-3 py-2.5">Fee</th><th className="text-left px-3 py-2.5">When</th></tr></thead><tbody>{ov.given.map((g: any) => <tr key={g.id} className="border-t border-hairline/70"><td className="px-4 py-2 font-mono">{g.buyer}…</td><td className="px-3 py-2">{g.to}</td><td className="px-3 py-2">{STATUS[g.status] || g.status}</td><td className="px-3 py-2 tabular-nums">{["accepted", "contacted", "visited", "reserved", "sold"].includes(g.status) ? eur(Number(g.fee_eur)) : <span className="text-ink-muted">—</span>}</td><td className="px-3 py-2 text-ink-muted">{new Date(g.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</td></tr>)}</tbody></table></div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="mt-6 flex flex-col gap-4">
            {RegisterForm}
            <div className="border border-hairline rounded-2xl bg-white p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-3"><div className="flex-1"><p className="font-medium text-[15px]">Delete all my fingerprints</p><p className="text-[13px] text-ink-muted">Removes every fingerprint you uploaded. Introductions already made are kept for accounting.</p></div><button onClick={wipe} className="px-4 py-2 rounded-full border border-red-600 text-red-600 text-[13px] font-medium inline-flex items-center gap-1.5"><Trash2 size={14} /> Delete all</button></div>
          </div>
        )}

        {tab === "privacy" && (
          <div className="mt-6 grid md:grid-cols-2 gap-4 text-[14px] leading-relaxed">
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">I am not handing my database to a competitor.</p><p className="mt-2 text-ink-muted">Right. So you never hand it to anyone. Each email or phone is turned into a 64-character fingerprint in your browser. Fingerprints cannot be reversed. We store fingerprints, a country, a budget and a tag. Never a name, never an email, never a phone.</p></div>
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">How overlap works</p><p className="mt-2 text-ink-muted">The same contact gives the same fingerprint on every developer's machine. When two developers hold the same fingerprint we can count it, and tell each of you "12 of your leads are also talking to someone else", without either of you learning who.</p></div>
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">How you get paid</p><p className="mt-2 text-ink-muted">A lead you marked as shared fits another project. We introduce the buyer. The receiving developer accepts, and only then we pass the contact along and you earn {eur(Number(ov.developer.fee_eur))}. Paid monthly once you pass €50. Private leads are never introduced.</p></div>
            <div className="border border-hairline rounded-2xl bg-white p-6"><p className="font-display text-[20px] tracking-tight">Wait, then how do you contact the buyer?</p><p className="mt-2 text-ink-muted">We don't, from a fingerprint. When a match is accepted we ask you, the developer who owns the relationship, for that one contact, or the buyer is already a RealHunt user who asked us to find them a home. Either way, consent first. Operated by Equinox Investment Group LLC, Sheridan, Wyoming.</p></div>
          </div>
        )}
      </div>
    </div>
  );
};
export default NetworkApp;
